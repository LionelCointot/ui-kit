import { ChangeDetectionStrategy, Component, booleanAttribute, computed, forwardRef, input, numberAttribute } from '@angular/core';
import { LcIconComponent } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD_CONTROL } from '../form-field/form-field-control';
import { LcNumericInputBase, NUMERIC_INPUT_HOST, NUMERIC_INPUT_TEMPLATE } from './numeric-input-base';

/** Saisie numérique avec unité facultative (ex. « mois »), boutons − et + facultatifs. */
@Component({
  selector: 'lc-number-input',
  imports: [LcIconComponent],
  template: NUMERIC_INPUT_TEMPLATE,
  styleUrl: '../shared/field-frame.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcNumberInputComponent) }],
  host: { ...NUMERIC_INPUT_HOST, class: 'lc-number-input' },
})
export class LcNumberInputComponent extends LcNumericInputBase {
  readonly decimals = input(0, { transform: numberAttribute });
  readonly step = input(1, { transform: numberAttribute });
  /** Unité affichée après la valeur (ex. « mois »). */
  readonly unit = input<string>();
  /** Boutons − et + (avec aria-label). */
  readonly showStepper = input(false, { transform: booleanAttribute });
  protected readonly unitText = computed(() => this.unit() || null);
  protected readonly stepValue = computed(() => this.step());
  protected override readonly stepperVisible = this.showStepper;
}
