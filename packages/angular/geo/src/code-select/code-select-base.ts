import { DestroyRef, Directive, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import { LcComboboxSearchSettings, lcFilterOptions } from '@lionelcointot/ui-angular/forms';
import { LcGeoDataSource } from '../geo-data-source';
import { LcGeoFieldBase } from '../geo-field-base';

/** Élément identifié par un code officiel (région ou département). */
export interface LcCodedItem {
  readonly code: string;
  readonly name: string;
}

/**
 * Base de `lc-region-select` et `lc-department-select` : la valeur est un **code officiel** (« 69 », « 84 »), la liste
 * complète vient de la source de données (une requête par session) et est filtrée localement : aucun texte saisi
 * ne quitte l'appareil. Le chargement démarre à la création pour afficher le libellé de la valeur existante ;
 * tant qu'il n'a pas abouti (ou s'il échoue), la valeur s'affiche par son code brut.
 */
@Directive()
export abstract class LcCodeSelectBase<T extends LcCodedItem> extends LcGeoFieldBase<string, T> {
  protected readonly unknownCodeId = lcUniqueId('geo-unknown');
  private readonly loadedItems = signal<readonly T[] | null>(null);

  /** Chargement de la liste complète (un échec n'est pas définitif : un nouvel appel relance la requête). */
  protected abstract load(source: LcGeoDataSource, signal: AbortSignal): Promise<readonly T[]>;
  /** Éléments proposés parmi la liste complète (ex. département restreint à une région). */
  protected abstract available(all: readonly T[]): readonly T[];
  protected abstract placeholderItem(code: string): T;
  /** Signal lu par `searchFn` : quand il change, la recherche du combobox est refaite. */
  protected abstract readonly filterSignature: Signal<unknown>;

  /** Textes comparés au texte saisi. */
  protected readonly filterKeys = (item: T): readonly string[] => [item.code, item.name, `${item.code} ${item.name}`];
  /** Liste locale : tout s'affiche dès le focus, sans anti-rebond. */
  protected readonly searchSettings: LcComboboxSearchSettings<T> = { keys: this.filterKeys, minChars: 0, debounceMs: 0, openOnFocus: true };
  protected readonly trackBy = (item: T): string => item.code;
  /** Texte du champ : « 69 – Rhône », ou le code seul quand le libellé est inconnu. */
  protected readonly display = (item: T): string => (item.name ? `${item.code} – ${item.name}` : item.code);

  /** Fonction de recherche du combobox ; elle change d'identité quand le filtre du parent change. */
  protected readonly searchFn = computed(() => {
    this.filterSignature();
    return async (text: string, signal: AbortSignal): Promise<readonly T[]> => {
      const all = await this.ensureLoaded(signal);
      return lcFilterOptions(this.available(all), text, this.filterKeys);
    };
  });

  /** Valeur courante comme objet : élément de la liste, ou objet réduit au code tant que le libellé est inconnu. */
  protected readonly selectedItem = computed<T | null>(() => {
    const code = this.value();
    if (code === null) return null;
    return this.loadedItems()?.find((item) => item.code === code) ?? this.placeholderItem(code);
  });
  /** Liste chargée mais sans ce code : la valeur est conservée et l'aide `geoUnknownCode` s'affiche. */
  protected readonly unknownCode = computed(() => {
    const code = this.value();
    const items = this.loadedItems();
    return code !== null && items !== null && !items.some((item) => item.code === code) ? code : null;
  });

  constructor() {
    super();
    if (this.source === null) return;
    const controller = new AbortController();
    inject(DestroyRef).onDestroy(() => controller.abort());
    // Les membres abstraits sont posés par la classe dérivée : le chargement part après sa construction.
    queueMicrotask(() => {
      if (!controller.signal.aborted) void this.ensureLoaded(controller.signal).catch(() => undefined);
    });
    effect(() => this.dropValueOutsideFilter());
  }

  protected onSelect(item: T | null): void {
    this.value.set(item?.code ?? null);
    this.selectionChange.emit(item);
  }

  private async ensureLoaded(signal: AbortSignal): Promise<readonly T[]> {
    const source = this.source;
    if (!source) return [];
    const loaded = this.loadedItems();
    if (loaded) return loaded;
    const items = await this.load(source, signal);
    this.loadedItems.set(items);
    return items;
  }

  /** Une valeur qui sort du filtre (ex. autre région) passe à `null`, une fois la liste chargée. */
  private dropValueOutsideFilter(): void {
    const items = this.loadedItems();
    const code = this.value();
    if (items === null || code === null) return;
    const current = items.find((item) => item.code === code);
    if (current && !this.available(items).includes(current)) {
      untracked(() => this.onSelect(null));
    }
  }
}
