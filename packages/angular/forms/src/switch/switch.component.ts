import { ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, forwardRef, inject, input, model, output } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';

/**
 * Interrupteur (`button[lcSwitch]`, `role="switch"`). Valeur : `checked` (model). Espace et Entrée basculent
 * (comportement natif du bouton). Libellé par le contenu ou `aria-label`.
 * Implémente `FormCheckboxControl` de Signal Forms (`[formField]` sur un champ booléen) et `[(checked)]`.
 */
@Component({
  selector: 'button[lcSwitch]',
  template: `
    <span class="lc-switch__track" aria-hidden="true"><span class="lc-switch__thumb"></span></span>
    <span class="lc-switch__label"><ng-content /></span>
  `,
  styleUrl: './switch.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcSwitchComponent) }],
  host: {
    class: 'lc-switch',
    type: 'button',
    role: 'switch',
    '[attr.id]': 'id()',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
    '[disabled]': 'disabled()',
    '[class.lc-switch--checked]': 'checked()',
    '(click)': 'toggle()',
    '(blur)': 'touch.emit()',
  },
})
export class LcSwitchComponent implements FormCheckboxControl, LcFormFieldControl {
  private readonly element = inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;
  protected readonly field = inject(LC_FORM_FIELD, { optional: true });

  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input<string>(lcUniqueId('switch'));
  /** Émis quand le focus quitte l'interrupteur (champ « touché » pour Signal Forms). */
  readonly touch = output<void>();

  readonly controlId = this.id;
  readonly labelable = true;

  focus(): void {
    this.element.focus();
  }

  protected toggle(): void {
    if (!this.disabled()) {
      this.checked.update((checked) => !checked);
    }
  }
}
