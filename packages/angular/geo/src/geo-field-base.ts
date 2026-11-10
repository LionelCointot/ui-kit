import { Directive, ModelSignal, booleanAttribute, computed, inject, input, isDevMode, output, viewChild } from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { LC_LABELS, LcFillMode, LcRounded, LcSize, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcComboboxComponent } from '@lionelcointot/ui-angular/forms';
import type { LcFormFieldControl } from '@lionelcointot/ui-angular/forms';
import { LcGeoDataSource } from './geo-data-source';

/**
 * Base des champs géographiques : un `lc-combobox` interne, la source de données injectée et l'API commune
 * (`size`, `disabled`, `readonly`, `invalid`…). `V` est le type de la valeur du formulaire, `T` celui de l'objet
 * complet émis par `selectionChange`. Sans `provideLcGeo()`, une erreur explicite s'affiche en développement
 * et le champ reste désactivé.
 */
@Directive()
export abstract class LcGeoFieldBase<V, T> implements FormValueControl<V | null>, LcFormFieldControl {
  protected readonly source = inject(LcGeoDataSource, { optional: true });
  protected readonly labels = inject(LC_LABELS);

  /**
   * Valeur du champ. Chaque composant concret la déclare lui-même avec `model()` : Signal Forms reconnaît un contrôle
   * personnalisé à l'entrée `value` et à la sortie `valueChange` de la définition du composant, qui doivent donc y figurer
   * directement et non reposer sur l'héritage d'une classe de base.
   */
  abstract readonly value: ModelSignal<V | null>;
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
  /** Force l'état invalide (sinon déduit de `lc-form-field` et de `[formField]`). */
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  /** Sélection faite par l'utilisateur, avec l'objet complet (`null` quand la valeur est retirée). */
  readonly selectionChange = output<T | null>();
  /** Émis quand le focus quitte le champ (champ « touché » pour Signal Forms). */
  readonly touch = output<void>();

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;

  protected readonly unavailable = computed(() => this.source === null);
  private readonly combobox = viewChild.required(LcComboboxComponent);

  constructor() {
    if (this.source === null && isDevMode()) {
      console.error('[lc-geo] LcGeoDataSource est absent : ajoutez provideLcGeo() aux fournisseurs de l\'application.');
    }
  }

  focus(options?: FocusOptions): void {
    this.combobox().focus(options);
  }
}
