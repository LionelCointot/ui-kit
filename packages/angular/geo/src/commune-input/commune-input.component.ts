import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model } from '@angular/core';
import { LC_FORM_FIELD_CONTROL, LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent } from '@lionelcointot/ui-angular/forms';
import { LcGeoFieldBase } from '../geo-field-base';
import type { LcCommune } from '../geo.types';

const MAX_POSTAL_CODES = 3;

/**
 * Recherche d'une commune : la valeur est un objet `LcCommune` (code INSEE, codes postaux, département, région).
 * Taper un code postal (« 69003 ») propose les communes concernées et renseigne `postalCode`. Le texte saisi
 * est envoyé à l'API Découpage administratif (`geo.api.gouv.fr`) : voir le README du point d'entrée. Nécessite `provideLcGeo()`.
 *
 * @example
 * <lc-form-field label="Commune"><lc-commune-input [formField]="form.commune" [departmentCode]="'69'" /></lc-form-field>
 */
@Component({
  selector: 'lc-commune-input',
  imports: [LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent],
  template: `
    <lc-combobox [search]="searchFn()" [displayWith]="display" [trackBy]="trackBy" [(value)]="value" [searchSettings]="searchSettings()"
      (selectionChange)="selectionChange.emit($event)" (touch)="touch.emit()"
      [inputId]="inputId()" [ariaLabel]="ariaLabel()" [placeholder]="placeholder()" [size]="size()" [fillMode]="fillMode()"
      [rounded]="rounded()" [disabled]="disabled() || unavailable()" [readonly]="readonly()" [invalid]="invalid()"
      [touched]="touched()" [required]="required()" [errors]="errors()">
      <ng-template lcComboboxOption [lcComboboxOptionOf]="communeHint" let-commune let-text="text">
        <span class="lc-geo-option">
          <span [lcHighlight]="commune.name" [lcHighlightTerm]="text"></span>&ngsp;
          <span class="lc-geo-option__secondary">{{ postalSummary(commune) }} · {{ commune.departmentCode }}</span>
        </span>
      </ng-template>
    </lc-combobox>
  `,
  styleUrl: '../code-select/geo-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcCommuneInputComponent) }],
  host: { class: 'lc-commune-input' },
})
export class LcCommuneInputComponent extends LcGeoFieldBase<LcCommune, LcCommune> {
  /** Valeur du champ (déclarée ici : voir `LcGeoFieldBase.value`). */
  override readonly value = model<LcCommune | null>(null);

  /** Restreint la recherche aux communes d'un département (code officiel) ; `null` : toute la France. */
  readonly departmentCode = input<string | null>(null);

  /** Anti-rebond de la recherche, en millisecondes (défaut 200). */
  readonly debounceMs = input(200);
  protected readonly searchSettings = computed(() => ({ debounceMs: this.debounceMs() }));

  /** Indice de type pour le gabarit d'option. */
  protected readonly communeHint: LcCommune | null = null;
  /** Nouvelle fonction (donc nouvelle recherche) quand le département change. */
  protected readonly searchFn = computed(() => {
    const departmentCode = this.departmentCode();
    return (text: string, signal: AbortSignal): Promise<readonly LcCommune[]> =>
      this.source?.searchCommunes({ text, departmentCode }, signal) ?? Promise.resolve([]);
  });

  /** « Lyon · 69003 » quand la recherche portait sur un code postal, sinon « Lyon (69) ». */
  protected readonly display = (commune: LcCommune): string =>
    commune.postalCode ? `${commune.name} · ${commune.postalCode}` : `${commune.name} (${commune.departmentCode})`;
  protected readonly trackBy = (commune: LcCommune): string => `${commune.code}:${commune.postalCode ?? ''}`;

  /** Trois codes postaux au plus, puis « … » (tous restent dans `postalCodes`). */
  protected postalSummary(commune: LcCommune): string {
    const shown = commune.postalCodes.slice(0, MAX_POSTAL_CODES).join(', ');
    return commune.postalCodes.length > MAX_POSTAL_CODES ? `${shown} …` : shown;
  }
}
