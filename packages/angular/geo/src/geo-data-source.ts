import type { LcAddress, LcAddressQuery, LcCommune, LcCommuneQuery, LcDepartment, LcRegion } from './geo.types';

/** Nature d'un échec de requête géographique. */
export type LcGeoRequestErrorKind = 'network' | 'timeout' | 'rate-limited' | 'http' | 'invalid-response';

/** Échec d'une requête vers une API géographique ; `kind === 'rate-limited'` (HTTP 429) est reconnu par `lc-combobox`. */
export class LcGeoRequestError extends Error {
  constructor(
    readonly kind: LcGeoRequestErrorKind,
    readonly status: number | null = null,
    message = `Requête géographique en échec (${kind})`,
  ) {
    super(message);
    this.name = 'LcGeoRequestError';
  }
}

/**
 * Source de données géographiques. Remplaçable : `{ provide: LcGeoDataSource, useClass: MaSource }`
 * (proxy du back, faux de test). L'implémentation par défaut est `LcGouvGeoDataSource`.
 */
export abstract class LcGeoDataSource {
  /** Liste complète des régions, mise en cache. */
  abstract regions(signal: AbortSignal): Promise<readonly LcRegion[]>;
  /** Liste complète des départements, mise en cache. */
  abstract departments(signal: AbortSignal): Promise<readonly LcDepartment[]>;
  abstract searchCommunes(query: LcCommuneQuery, signal: AbortSignal): Promise<readonly LcCommune[]>;
  abstract searchAddresses(query: LcAddressQuery, signal: AbortSignal): Promise<readonly LcAddress[]>;
}
