import { Directive, ElementRef, booleanAttribute, computed, forwardRef, inject, input } from '@angular/core';
import { LC_DEFAULTS, LcSize, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD_CONTROL, LcFormFieldControl, LcValidationMessage } from '../form-field/form-field-control';
import { nativeControlAria } from '../shared/native-control';

/** Liste native stylée (`select[lcSelect]`), pour les listes courtes et fixes. Styles : `ui-angular.css`. */
@Directive({
  selector: 'select[lcSelect]',
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcSelectDirective) }],
  host: {
    class: 'lc-select',
    '[class.lc-select--small]': "resolvedSize() === 'small'",
    '[class.lc-select--large]': "resolvedSize() === 'large'",
    '[class.lc-select--invalid]': 'aria.showInvalid()',
    '[attr.id]': 'id()',
    '[attr.aria-invalid]': "aria.showInvalid() ? 'true' : null",
    '[attr.aria-describedby]': 'aria.describedBy()',
    '[attr.aria-required]': "aria.required() ? 'true' : null",
  },
})
export class LcSelectDirective implements LcFormFieldControl {
  private readonly defaults = inject(LC_DEFAULTS);
  private readonly element = inject<ElementRef<HTMLSelectElement>>(ElementRef).nativeElement;

  readonly id = input<string>(lcUniqueId('select'));
  readonly size = input<LcSize | undefined>(undefined);
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly LcValidationMessage[]>([]);

  readonly controlId = this.id;
  readonly labelable = true;
  protected readonly aria = nativeControlAria(this.invalid, this.touched);
  protected readonly resolvedSize = computed(() => this.size() ?? this.defaults.size);

  focus(): void {
    this.element.focus();
  }
}
