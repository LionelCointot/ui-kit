import { Directive, DoCheck, ElementRef, booleanAttribute, computed, forwardRef, inject, input } from '@angular/core';
import { LC_DEFAULTS, LcSize, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD_CONTROL, LcFormFieldControl, LcValidationMessage } from '../form-field/form-field-control';
import { nativeControlAria } from '../shared/native-control';

/**
 * Saisie texte native stylée (`input[lcInput]`, `textarea[lcInput]`). Compatible `[formField]` (Signal Forms)
 * et `ngModel`/formulaires réactifs, puisque l'élément reste natif. Styles : feuille globale `ui-angular.css`.
 */
@Directive({
  selector: 'input[lcInput], textarea[lcInput]',
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcInputDirective) }],
  host: {
    class: 'lc-input',
    '[class.lc-input--small]': "resolvedSize() === 'small'",
    '[class.lc-input--large]': "resolvedSize() === 'large'",
    '[class.lc-input--invalid]': 'aria.showInvalid()',
    '[class.lc-input--auto-resize]': 'autoResize()',
    '[attr.id]': 'id()',
    '[attr.aria-invalid]': "aria.showInvalid() ? 'true' : null",
    '[attr.aria-describedby]': 'aria.describedBy()',
    '[attr.aria-required]': "aria.required() ? 'true' : null",
    '(input)': 'resizeToContent()',
  },
})
export class LcInputDirective implements LcFormFieldControl, DoCheck {
  private readonly defaults = inject(LC_DEFAULTS);
  private readonly element = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;

  /** Identifiant de l'élément (généré si absent), relié au libellé de `lc-form-field`. */
  readonly id = input<string>(lcUniqueId('input'));
  readonly size = input<LcSize | undefined>(undefined);
  /** Force l'état invalide (sinon déduit de `lc-form-field` et de `[formField]`). */
  readonly invalid = input(false, { transform: booleanAttribute });
  /** Transmis par `[formField]`. */
  readonly touched = input(false, { transform: booleanAttribute });
  /** Transmis par `[formField]`. */
  readonly errors = input<readonly LcValidationMessage[]>([]);
  /** `textarea` : hauteur ajustée au contenu. */
  readonly autoResize = input(false, { transform: booleanAttribute });

  readonly controlId = this.id;
  readonly labelable = true;
  protected readonly aria = nativeControlAria(this.invalid, this.touched);
  protected readonly resolvedSize = computed(() => this.size() ?? this.defaults.size);

  focus(): void {
    this.element.focus();
  }

  /** Dernière valeur mesurée : un changement par programme (formulaire, `[value]`) n'émet pas d'événement `input`. */
  private measuredValue: string | null = null;

  ngDoCheck(): void {
    if (!this.autoResize() || this.element.tagName !== 'TEXTAREA') return;
    if (this.element.value !== this.measuredValue) this.resizeToContent();
  }

  protected resizeToContent(): void {
    if (!this.autoResize() || this.element.tagName !== 'TEXTAREA') return;
    this.measuredValue = this.element.value;
    this.element.style.height = 'auto';
    this.element.style.height = `${this.element.scrollHeight}px`;
  }
}
