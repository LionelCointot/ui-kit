import { ChangeDetectionStrategy, Component, computed, forwardRef, input, numberAttribute } from '@angular/core';
import { LcIconComponent } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD_CONTROL } from '../form-field/form-field-control';
import { LcNumericInputBase, NUMERIC_INPUT_HOST, NUMERIC_INPUT_TEMPLATE } from './numeric-input-base';

/** Saisie de pourcentage exprimé en points : 3.5 = « 3,5 % ». Flèches haut et bas = ± `step` (0,05). */
@Component({
  selector: 'lc-percent-input',
  imports: [LcIconComponent],
  template: NUMERIC_INPUT_TEMPLATE,
  styleUrl: '../shared/field-frame.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcPercentInputComponent) }],
  host: { ...NUMERIC_INPUT_HOST, class: 'lc-percent-input' },
})
export class LcPercentInputComponent extends LcNumericInputBase {
  readonly decimals = input(2, { transform: numberAttribute });
  readonly step = input(0.05, { transform: numberAttribute });
  protected readonly unitText = computed(() => '%');
  protected readonly stepValue = computed(() => this.step());
}
