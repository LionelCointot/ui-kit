import { Injectable, inject, isDevMode } from '@angular/core';
import { LcGeoDataSource, LcGeoRequestError } from './geo-data-source';
import { LC_GEO_DEFAULTS, LC_GEO_OPTIONS } from './geo-options';
import type { LcAddress, LcAddressQuery, LcCommune, LcCommuneQuery, LcDepartment, LcRegion } from './geo.types';

const MAX_TEXT_LENGTH = 200;
const ADDRESS_MIN_LENGTH = 3;
const COMMUNE_LIMIT = 10;
const ADDRESS_LIMIT = 8;
const CACHE_SIZE = 50;
const COMMUNE_FIELDS = 'nom,code,codesPostaux,codeDepartement,codeRegion,population';
const ADDRESS_KINDS: readonly string[] = ['housenumber', 'street', 'locality', 'municipality'];
const POSTAL_CODE = /^\d{5}$/;

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);

/**
 * Clé de tri d'un code officiel : « 2A » et « 2B » (Corse) se placent entre « 19 » et « 21 », où se trouvait
 * l'ancien département 20 (un chiffre suivi d'une lettre prend un zéro intercalé : « 2A » → « 20A »).
 */
function codeSortKey(code: string): string {
  return code.replace(/^(\d)([A-Za-z])$/, '$10$2');
}

const byCode = (a: { code: string }, b: { code: string }): number => codeSortKey(a.code).localeCompare(codeSortKey(b.code));

function createAbortError(): DOMException {
  return new DOMException('Requête annulée', 'AbortError');
}

/**
 * Source par défaut : API Découpage administratif (`geo.api.gouv.fr`) et API Adresse de la Géoplateforme
 * (`data.geopf.fr/geocodage`), appelées du navigateur par `fetch` (ni `HttpClient` ni intercepteur, aucun cookie,
 * aucun en-tête `Referer`). Les réponses sont validées champ par champ.
 *
 * - Régions et départements : une requête par session (promesse partagée) ; en cas d'échec elle est oubliée pour
 *   qu'un nouvel essai relance l'appel. Un signal annulé par un champ n'annule pas le chargement partagé.
 * - Communes et adresses : cache LRU de 50 requêtes par instance, sans persistance.
 */
@Injectable()
export class LcGouvGeoDataSource extends LcGeoDataSource {
  private readonly options = inject(LC_GEO_OPTIONS);
  private regionsRequest?: Promise<readonly LcRegion[]>;
  private departmentsRequest?: Promise<readonly LcDepartment[]>;
  private readonly searchCache = new Map<string, readonly unknown[]>();

  private get geoUrl(): string {
    return this.options.geoApiBaseUrl ?? LC_GEO_DEFAULTS.geoApiBaseUrl;
  }

  private get addressUrl(): string {
    return this.options.addressApiBaseUrl ?? LC_GEO_DEFAULTS.addressApiBaseUrl;
  }

  override regions(signal: AbortSignal): Promise<readonly LcRegion[]> {
    this.regionsRequest ??= this.loadShared(
      `${this.geoUrl}/regions?${new URLSearchParams({ fields: 'nom,code' })}`,
      (item) => this.toRegion(item),
      () => (this.regionsRequest = undefined),
    );
    return this.followSignal(this.regionsRequest, signal);
  }

  override departments(signal: AbortSignal): Promise<readonly LcDepartment[]> {
    this.departmentsRequest ??= this.loadShared(
      `${this.geoUrl}/departements?${new URLSearchParams({ fields: 'nom,code,codeRegion' })}`,
      (item) => this.toDepartment(item),
      () => (this.departmentsRequest = undefined),
    );
    return this.followSignal(this.departmentsRequest, signal);
  }

  override async searchCommunes(query: LcCommuneQuery, signal: AbortSignal): Promise<readonly LcCommune[]> {
    const typed = query.text.trim().slice(0, MAX_TEXT_LENGTH);
    if (typed === '') return [];
    const limit = query.limit ?? COMMUNE_LIMIT;
    const byPostalCode = POSTAL_CODE.test(typed);
    const params = new URLSearchParams(byPostalCode ? { codePostal: typed } : { nom: typed });
    params.set('fields', COMMUNE_FIELDS);
    if (!byPostalCode) {
      params.set('boost', 'population');
      params.set('limit', String(limit));
      if (query.departmentCode) params.set('codeDepartement', query.departmentCode);
    }
    const url = `${this.geoUrl}/communes?${params}`;
    return this.cached(url, signal, async () => {
      const body = await this.fetchJson(url, signal);
      return this.toList(body, (item) => this.toCommune(item, byPostalCode ? typed : null)).slice(0, limit);
    });
  }

  override async searchAddresses(query: LcAddressQuery, signal: AbortSignal): Promise<readonly LcAddress[]> {
    const typed = query.text.trim().slice(0, MAX_TEXT_LENGTH);
    if (typed.length < ADDRESS_MIN_LENGTH || !/^[\p{L}\p{N}]/u.test(typed)) return [];
    const params = new URLSearchParams({ q: typed, autocomplete: '1', index: 'address', limit: String(query.limit ?? ADDRESS_LIMIT) });
    if (query.kind) params.set('type', query.kind);
    if (query.postalCode) params.set('postcode', query.postalCode);
    if (query.cityCode) params.set('citycode', query.cityCode);
    const url = `${this.addressUrl}/search?${params}`;
    return this.cached(url, signal, async () => {
      const body = await this.fetchJson(url, signal);
      if (!isRecord(body) || !Array.isArray(body['features'])) throw new LcGeoRequestError('invalid-response');
      return this.toList(body['features'], (item) => this.toAddress(item));
    });
  }

  /** Cache LRU : une entrée relue passe en dernière position ; seule une réponse reçue est conservée. */
  private async cached<T>(url: string, signal: AbortSignal, load: () => Promise<readonly T[]>): Promise<readonly T[]> {
    const key = url.toLowerCase();
    const hit = this.searchCache.get(key);
    if (hit) {
      this.searchCache.delete(key);
      this.searchCache.set(key, hit);
      return hit as readonly T[];
    }
    const result = await load();
    if (signal.aborted) throw createAbortError();
    this.searchCache.set(key, result);
    if (this.searchCache.size > CACHE_SIZE) this.searchCache.delete(this.searchCache.keys().next().value as string);
    return result;
  }

  /** Charge une liste complète, triée par code ; l'appelant partage la promesse (oubliée en cas d'échec). */
  private loadShared<T extends { code: string }>(url: string, map: (item: unknown) => T | null, forget: () => void): Promise<readonly T[]> {
    const request = this.fetchJson(url, undefined).then((body) => this.toList(body, map).sort(byCode));
    request.catch(forget);
    return request;
  }

  /** Suit le signal d'un appelant sans annuler la requête partagée. */
  private followSignal<T>(request: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) return Promise.reject(createAbortError());
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => reject(createAbortError());
      signal.addEventListener('abort', onAbort, { once: true });
      request.then(
        (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
        (error: unknown) => { signal.removeEventListener('abort', onAbort); reject(error); },
      );
    });
  }

  private async fetchJson(url: string, signal: AbortSignal | undefined): Promise<unknown> {
    const timeout = AbortSignal.timeout(this.options.timeoutMs ?? LC_GEO_DEFAULTS.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await fetch(url, { signal: combined, credentials: 'omit', referrerPolicy: 'no-referrer' });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new LcGeoRequestError(timeout.aborted ? 'timeout' : 'network');
    }
    if (response.status === 429) throw new LcGeoRequestError('rate-limited', 429);
    if (!response.ok) throw new LcGeoRequestError('http', response.status);
    try {
      return await response.json();
    } catch {
      throw new LcGeoRequestError('invalid-response', response.status);
    }
  }

  /** Éléments valides d'une liste ; un élément incomplet est ignoré (avertissement en développement). */
  private toList<T>(body: unknown, map: (item: unknown) => T | null): T[] {
    if (!Array.isArray(body)) throw new LcGeoRequestError('invalid-response');
    const valid: T[] = [];
    for (const item of body) {
      const mapped = map(item);
      if (mapped) valid.push(mapped);
      else if (isDevMode()) console.warn('[lc-geo] élément ignoré : réponse incomplète', item);
    }
    return valid;
  }

  private toRegion(item: unknown): LcRegion | null {
    if (!isRecord(item)) return null;
    const code = text(item['code']);
    const name = text(item['nom']);
    return code && name ? { code, name } : null;
  }

  private toDepartment(item: unknown): LcDepartment | null {
    if (!isRecord(item)) return null;
    const code = text(item['code']);
    const name = text(item['nom']);
    const regionCode = text(item['codeRegion']);
    return code && name && regionCode ? { code, name, regionCode } : null;
  }

  private toCommune(item: unknown, postalCode: string | null): LcCommune | null {
    if (!isRecord(item)) return null;
    const code = text(item['code']);
    const name = text(item['nom']);
    const departmentCode = text(item['codeDepartement']);
    const regionCode = text(item['codeRegion']);
    if (!code || !name || !departmentCode || !regionCode) return null;
    const postalCodes = Array.isArray(item['codesPostaux']) ? item['codesPostaux'].filter((p): p is string => typeof p === 'string') : [];
    const population = typeof item['population'] === 'number' ? item['population'] : null;
    return { code, name, postalCodes, postalCode, departmentCode, regionCode, population };
  }

  private toAddress(item: unknown): LcAddress | null {
    if (!isRecord(item) || !isRecord(item['properties']) || !isRecord(item['geometry'])) return null;
    const properties = item['properties'];
    const coordinates = item['geometry']['coordinates'];
    const id = text(properties['id']);
    const label = text(properties['label']);
    const kind = text(properties['type']);
    const postalCode = text(properties['postcode']);
    const cityCode = text(properties['citycode']);
    const city = text(properties['city']);
    const departmentCode = text(properties['context'])?.split(',')[0].trim();
    const score = properties['score'];
    if (!id || !label || !kind || !ADDRESS_KINDS.includes(kind) || !postalCode || !cityCode || !city || !departmentCode) return null;
    if (typeof score !== 'number' || !Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') return null;
    return {
      id, label, kind: kind as LcAddress['kind'], postalCode, cityCode, city, departmentCode, score,
      houseNumber: text(properties['housenumber']),
      street: text(properties['street']) ?? (kind === 'street' ? text(properties['name']) : null),
      longitude: coordinates[0],
      latitude: coordinates[1],
    };
  }
}
