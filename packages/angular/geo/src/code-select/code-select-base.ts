import {
  Directive,
  DestroyRef,
  Signal,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { LC_LABELS, LcFillMode, LcRounded, LcSize, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcComboboxComponent, lcFilterOptions } from '@lionelcointot/ui-angular/forms';
import type { LcFormFieldControl } from '@lionelcointot/ui-angular/forms';
import { LcGeoDataSource } from '../geo-data-source';

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
export abstract class LcCodeSelectBase<T extends LcCodedItem> implements FormValueControl<string | null>, LcFormFieldControl {
  private readonly source = inject(LcGeoDataSource, { optional: true });
  protected readonly labels = inject(LC_LABELS);

  /** Code officiel sélectionné (`null` : aucun). */
  readonly value = model<string | null>(null);
  readonly placeholder = input('');
  /** Identifiant du champ interne (généré), relié au libellé de `lc-form-field`. */
  readonly inputId = input<string>(lcUniqueId('geo'));
  /** Nom accessible quand le contrôle est utilisé hors de `lc-form-field`. */
  readonly ariaLabel = input<string>();
  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
  readonly rounded = input<LcRounded | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  /** Sélection faite par l'utilisateur (ou valeur retirée parce qu'elle sort du filtre), avec l'objet complet. */
  readonly selectionChange = output<T | null>();
  /** Émis quand le focus quitte le champ (champ « touché » pour Signal Forms). */
  readonly touch = output<void>();

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;

  protected readonly unknownCodeId = lcUniqueId('geo-unknown');
  private readonly combobox = viewChild.required(LcComboboxComponent);
  private readonly loadedItems = signal<readonly T[] | null>(null);
  protected readonly ready = computed(() => this.loadedItems() !== null);

  /** Chargement de la liste complète (le premier échec n'est pas définitif : un nouvel appel relance la requête). */
  protected abstract load(source: LcGeoDataSource, signal: AbortSignal): Promise<readonly T[]>;
  /** Éléments proposés parmi la liste complète (ex. département restreint à une région). */
  protected abstract available(all: readonly T[]): readonly T[];
  /** Textes comparés au texte saisi. */
  protected readonly filterKeys = (item: T): readonly string[] => [item.code, item.name, `${item.code} ${item.name}`];
  protected readonly trackBy = (item: T): string => item.code;
  /** Texte du champ : « 69 – Rhône », ou le code seul quand le libellé est inconnu. */
  protected readonly display = (item: T): string => (item.name ? `${item.code} – ${item.name}` : item.code);
  protected abstract placeholderItem(code: string): T;

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
  protected readonly unavailable = computed(() => this.source === null);

  /** Signal dont la lecture rend `searchFn` dépendante du filtre du parent. */
  protected abstract readonly filterSignature: Signal<unknown>;

  constructor() {
    const controller = new AbortController();
    inject(DestroyRef).onDestroy(() => controller.abort());
    if (this.source === null) {
      if (isDevMode()) console.error('[lc-geo] LcGeoDataSource est absent : ajoutez provideLcGeo() aux fournisseurs de l\'application.');
      return;
    }
    queueMicrotask(() => {
      if (!controller.signal.aborted) void this.ensureLoaded(controller.signal).catch(() => undefined);
    });
    effect(() => this.dropValueOutsideFilter());
  }

  focus(options?: FocusOptions): void {
    this.combobox().focus(options);
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
