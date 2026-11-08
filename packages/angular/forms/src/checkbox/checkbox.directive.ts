import { Directive, ElementRef, booleanAttribute, forwardRef, inject, input } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD_CONTROL, LcFormFieldControl, LcValidationMessage } from '../form-field/form-field-control';
import { nativeControlAria } from '../shared/native-control';

/**
 * Case à cocher native stylée (`input[type=checkbox][lcCheckbox]`). Le libellé est un `<label>` natif autour
 * ou à côté. Styles : `ui-angular.css`.
 */
@Directive({
  selector: 'input[type=checkbox][lcCheckbox]',
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcCheckboxDirective) }],
  host: {
    class: 'lc-checkbox',
    '[attr.id]': 'id()',
    '[indeterminate]': 'indeterminate()',
    '[attr.aria-invalid]': "aria.showInvalid() ? 'true' : null",
    '[attr.aria-describedby]': 'aria.describedBy()',
  },
})
export class LcCheckboxDirective implements LcFormFieldControl {
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  readonly id = input<string>(lcUniqueId('checkbox'));
  /** État intermédiaire (ni coché ni décoché). */
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly LcValidationMessage[]>([]);

  readonly controlId = this.id;
  readonly labelable = true;
  protected readonly aria = nativeControlAria(this.invalid, this.touched);

  focus(): void {
    this.element.focus();
  }
}
