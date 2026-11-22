import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model } from '@angular/core';
import { LC_FORM_FIELD_CONTROL, LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent } from '@lionelcointot/ui-angular/forms';
import { LcGeoFieldBase } from '../geo-field-base';
import type { LcAddress } from '../geo.types';

const ADDRESS_MIN_LENGTH = 3;

/**
 * Recherche d'une adresse : la valeur est un objet `LcAddress` (libellé, code postal, code INSEE, département,
 * coordonnées). Le texte saisi est envoyé à l'API Adresse de la Géoplateforme (`data.geopf.fr/geocodage`) :
 * voir le README du point d'entrée. Nécessite `provideLcGeo()`.
 *
 * @example
 * <lc-form-field label="Adresse"><lc-address-input [formField]="form.address" kind="housenumber" /></lc-form-field>
 */
@Component({
  selector: 'lc-address-input',
  imports: [LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent],
  template: `
    <lc-combobox [search]="searchFn()" [displayWith]="display" [trackBy]="trackBy" [(value)]="value" [searchSettings]="searchSettings()"
      (selectionChange)="selectionChange.emit($event)" (touch)="touch.emit()"
      [inputId]="inputId()" [ariaLabel]="ariaLabel()" [placeholder]="placeholder()" [size]="size()" [fillMode]="fillMode()"
      [rounded]="rounded()" [disabled]="disabled() || unavailable()" [readonly]="readonly()" [invalid]="invalid()"
      [touched]="touched()" [required]="required()" [errors]="errors()">
      <ng-template lcComboboxOption [lcComboboxOptionOf]="addressHint" let-address let-text="text">
        <span class="lc-geo-option">
          <span [lcHighlight]="address.label" [lcHighlightTerm]="text"></span>&ngsp;
          <span class="lc-geo-option__secondary">{{ address.city }}</span>
        </span>
      </ng-template>
    </lc-combobox>
  `,
  styleUrl: '../code-select/geo-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcAddressInputComponent) }],
  host: { class: 'lc-address-input' },
})
export class LcAddressInputComponent extends LcGeoFieldBase<LcAddress, LcAddress> {
  /** Valeur du champ (déclarée ici : voir `LcGeoFieldBase.value`). */
  override readonly value = model<LcAddress | null>(null);

  /** Type d'adresse recherché (`housenumber` : numéro dans la voie, `street` : voie…) ; `null` : tous. */
  readonly kind = input<LcAddress['kind'] | null>(null);
  /** Restreint la recherche à un code postal. */
  readonly postalCode = input<string | null>(null);
  /** Restreint la recherche à une commune (code INSEE). */
  readonly cityCode = input<string | null>(null);

  /** Anti-rebond de la recherche, en millisecondes (défaut 200). */
  readonly debounceMs = input(200);

  /** Indice de type pour le gabarit d'option. */
  protected readonly addressHint: LcAddress | null = null;
  protected readonly searchSettings = computed(() => ({ debounceMs: this.debounceMs(), minChars: ADDRESS_MIN_LENGTH }));
  /** Nouvelle fonction (donc nouvelle recherche) quand une restriction change. */
  protected readonly searchFn = computed(() => {
    const kind = this.kind();
    const postalCode = this.postalCode();
    const cityCode = this.cityCode();
    return (text: string, signal: AbortSignal): Promise<readonly LcAddress[]> =>
      this.source?.searchAddresses({ text, kind, postalCode, cityCode }, signal) ?? Promise.resolve([]);
  });

  protected readonly display = (address: LcAddress): string => address.label;
  protected readonly trackBy = (address: LcAddress): string => address.id;
}
