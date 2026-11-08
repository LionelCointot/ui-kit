import { ChangeDetectionStrategy, Component, computed, forwardRef, input, numberAttribute } from '@angular/core';
import { LcIconComponent } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD_CONTROL } from '../form-field/form-field-control';
import { LcNumericInputBase, NUMERIC_INPUT_HOST, NUMERIC_INPUT_TEMPLATE } from './numeric-input-base';

/** Saisie de montant dans la devise configurée : « 250 000 € » hors focus, valeur numérique (250000). */
@Component({
  selector: 'lc-money-input',
  imports: [LcIconComponent],
  template: NUMERIC_INPUT_TEMPLATE,
  styleUrl: '../shared/field-frame.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcMoneyInputComponent) }],
  host: { ...NUMERIC_INPUT_HOST, class: 'lc-money-input' },
})
export class LcMoneyInputComponent extends LcNumericInputBase {
  readonly decimals = input(2, { transform: numberAttribute });
  protected readonly unitText = computed(() => this.format.currencySymbol);
  protected readonly stepValue = computed(() => null);
}
