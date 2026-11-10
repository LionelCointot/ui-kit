import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model } from '@angular/core';
import { LC_FORM_FIELD_CONTROL, LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent } from '@lionelcointot/ui-angular/forms';
import { LcGeoDataSource } from '../geo-data-source';
import type { LcDepartment } from '../geo.types';
import { LcCodeSelectBase } from './code-select-base';

/**
 * Choix d'un département : la valeur est le **code officiel** (« 69 », « 2A », « 974 »). La liste vient de l'API officielle
 * (une requête par session, partagée entre tous les champs) et est filtrée localement par numéro ou par nom ;
 * aucun texte saisi n'est envoyé, et aucune autre requête (pas de `/regions` : la région n'est pas affichée). `regionCode` restreint la liste ; si la valeur n'appartient plus à la région,
 * elle passe à `null`. Un code absent de la liste reçue est conservé et signalé. Nécessite `provideLcGeo()`.
 *
 * @example
 * <lc-form-field label="Département"><lc-department-select [formField]="form.department" /></lc-form-field>
 */
@Component({
  selector: 'lc-department-select',
  imports: [LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent],
  template: `
    <lc-combobox [search]="searchFn()" [displayWith]="display" [trackBy]="trackBy" [filterKeys]="filterKeys" [minLength]="0"
      [debounceMs]="0" [openOnFocus]="true" [value]="selectedItem()" (selectionChange)="onSelect($event)" (touch)="touch.emit()"
      [inputId]="inputId()" [ariaLabel]="ariaLabel()" [placeholder]="placeholder()" [size]="size()" [fillMode]="fillMode()"
      [rounded]="rounded()" [disabled]="disabled() || unavailable()" [readonly]="readonly()" [invalid]="invalid()"
      [touched]="touched()" [required]="required()" [errors]="errors()" [extraDescribedBy]="unknownCode() ? unknownCodeId : null">
      <ng-template lcComboboxOption [lcComboboxOptionOf]="departmentHint" let-department let-text="text">
        <span class="lc-geo-option">
          <span class="lc-geo-option__code" [lcHighlight]="department.code" [lcHighlightTerm]="text"></span>&ngsp;
          <span [lcHighlight]="department.name" [lcHighlightTerm]="text"></span>
        </span>
      </ng-template>
    </lc-combobox>
    @if (unknownCode(); as code) {
      <p class="lc-geo__hint" [id]="unknownCodeId">{{ labels.geoUnknownCode(code) }}</p>
    }
  `,
  styleUrl: './geo-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcDepartmentSelectComponent) }],
  host: { class: 'lc-department-select' },
})
export class LcDepartmentSelectComponent extends LcCodeSelectBase<LcDepartment> {
  /** Valeur du champ (déclarée ici : voir `LcGeoFieldBase.value`). */
  override readonly value = model<string | null>(null);

  /** Restreint la liste aux départements d'une région (code officiel) ; `null` : tous. */
  readonly regionCode = input<string | null>(null);

  /** Indice de type pour le gabarit d'option. */
  protected readonly departmentHint: LcDepartment | null = null;
  protected readonly filterSignature = computed(() => this.regionCode());

  /** Seule `GET /departements` part : le nom de la région n'est pas affiché (il exigerait `GET /regions`). */
  protected load(source: LcGeoDataSource, signal: AbortSignal): Promise<readonly LcDepartment[]> {
    return source.departments(signal);
  }

  protected available(all: readonly LcDepartment[]): readonly LcDepartment[] {
    const regionCode = this.regionCode();
    return regionCode === null ? all : all.filter((department) => department.regionCode === regionCode);
  }

  protected placeholderItem(code: string): LcDepartment {
    return { code, name: '', regionCode: '' };
  }
}
