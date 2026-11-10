import { ChangeDetectionStrategy, Component, computed, forwardRef, model } from '@angular/core';
import { LC_FORM_FIELD_CONTROL, LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent } from '@lionelcointot/ui-angular/forms';
import { LcGeoDataSource } from '../geo-data-source';
import type { LcRegion } from '../geo.types';
import { LcCodeSelectBase } from './code-select-base';

/**
 * Choix d'une région : la valeur est le **code officiel** (« 84 »). La liste vient de l'API officielle (une requête
 * par session) et est filtrée localement par nom ou par code ; aucun texte saisi n'est envoyé. Nécessite `provideLcGeo()`.
 *
 * @example
 * <lc-form-field label="Région"><lc-region-select [formField]="form.region" /></lc-form-field>
 */
@Component({
  selector: 'lc-region-select',
  imports: [LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent],
  template: `
    <lc-combobox [search]="searchFn()" [displayWith]="display" [trackBy]="trackBy" [filterKeys]="filterKeys" [minLength]="0"
      [debounceMs]="0" [openOnFocus]="true" [value]="selectedItem()" (selectionChange)="onSelect($event)" (touch)="touch.emit()"
      [inputId]="inputId()" [ariaLabel]="ariaLabel()" [placeholder]="placeholder()" [size]="size()" [fillMode]="fillMode()"
      [rounded]="rounded()" [disabled]="disabled() || unavailable()" [readonly]="readonly()" [invalid]="invalid()"
      [touched]="touched()" [required]="required()" [errors]="errors()" [extraDescribedBy]="unknownCode() ? unknownCodeId : null">
      <ng-template lcComboboxOption [lcComboboxOptionOf]="regionHint" let-region let-text="text">
        <span class="lc-geo-option">
          <span class="lc-geo-option__code" [lcHighlight]="region.code" [lcHighlightTerm]="text"></span>&ngsp;
          <span [lcHighlight]="region.name" [lcHighlightTerm]="text"></span>
        </span>
      </ng-template>
    </lc-combobox>
    @if (unknownCode(); as code) {
      <p class="lc-geo__hint" [id]="unknownCodeId">{{ labels.geoUnknownCode(code) }}</p>
    }
  `,
  styleUrl: './geo-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcRegionSelectComponent) }],
  host: { class: 'lc-region-select' },
})
export class LcRegionSelectComponent extends LcCodeSelectBase<LcRegion> {
  /** Valeur du champ (déclarée ici : voir `LcGeoFieldBase.value`). */
  override readonly value = model<string | null>(null);

  /** Indice de type pour le gabarit d'option. */
  protected readonly regionHint: LcRegion | null = null;
  protected readonly filterSignature = computed(() => null);

  protected load(source: LcGeoDataSource, signal: AbortSignal): Promise<readonly LcRegion[]> {
    return source.regions(signal);
  }

  protected available(all: readonly LcRegion[]): readonly LcRegion[] {
    return all;
  }

  protected placeholderItem(code: string): LcRegion {
    return { code, name: '' };
  }
}
