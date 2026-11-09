import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  LC_DEFAULTS,
  LC_LABELS,
  LcButtonComponent,
  LcFillMode,
  LcIconComponent,
  LcRounded,
  LcSize,
  joinIds,
  lcUniqueId,
} from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';

/** Valeurs de l'attribut `autocomplete` adaptées à un mot de passe : saisie d'un existant ou création d'un nouveau. */
export type LcPasswordAutocomplete = 'current-password' | 'new-password';

/**
 * Saisie de mot de passe : `input` natif (`type` password ou text) avec un bouton pour afficher ou masquer le texte.
 * Le bouton porte `aria-pressed` (état affiché) et `aria-controls` (le champ) ; son nom vient de `LC_LABELS`.
 * La valeur n'est ni formatée ni tronquée. Implémente `FormValueControl<string>` (Signal Forms) et `[(value)]`.
 *
 * @example
 * <lc-form-field label="Mot de passe">
 *   <lc-password-input [formField]="form.password" autocomplete="current-password" />
 * </lc-form-field>
 */
@Component({
  selector: 'lc-password-input',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <input #input class="lc-field__input" [type]="revealed() ? 'text' : 'password'" [id]="inputId()"
      [value]="value()" [disabled]="disabled()" [readOnly]="readonly()"
      [attr.autocomplete]="autocomplete()" [attr.placeholder]="placeholder() || null"
      [attr.aria-label]="ariaLabel() || null" [attr.aria-invalid]="showInvalid() ? 'true' : null"
      [attr.aria-required]="isRequired() ? 'true' : null" [attr.aria-describedby]="describedBy()"
      autocapitalize="none" spellcheck="false"
      (input)="onInput($event)" (blur)="onBlur()" />
    <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" rounded="none"
      class="lc-password-input__toggle" [size]="resolvedSize()" [disabled]="disabled()"
      [attr.aria-label]="toggleLabel()" [attr.aria-pressed]="revealed()" [attr.aria-controls]="inputId()"
      (click)="toggle()"><lc-icon [name]="revealed() ? 'eye-off' : 'eye'" /></button>
  `,
  styleUrls: ['../shared/field-frame.css', './password-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcPasswordInputComponent) }],
  host: {
    class: 'lc-password-input',
    '[class]': 'frameClasses()',
    '[class.lc-field--invalid]': 'showInvalid()',
    '[class.lc-field--disabled]': 'disabled()',
    '[class.lc-field--readonly]': 'readonly()',
  },
})
export class LcPasswordInputComponent implements FormValueControl<string>, LcFormFieldControl {
  private readonly defaults = inject(LC_DEFAULTS);
  private readonly field = inject(LC_FORM_FIELD, { optional: true });
  protected readonly labels = inject(LC_LABELS);

  readonly value = model('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Force l'état invalide (sinon déduit de `lc-form-field` et de `[formField]`). */
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
  readonly rounded = input<LcRounded | undefined>(undefined);
  /** `current-password` pour une connexion, `new-password` pour une création ou un changement (gestionnaires de mots de passe). */
  readonly autocomplete = input<LcPasswordAutocomplete>('current-password');
  readonly placeholder = input('');
  /** Identifiant du champ interne (généré), relié au libellé de `lc-form-field` et à `aria-controls` du bouton. */
  readonly inputId = input<string>(lcUniqueId('password'));
  /** Nom accessible quand le contrôle est utilisé hors de `lc-form-field`. */
  readonly ariaLabel = input<string>();
  /** Émis quand le focus quitte le champ (champ « touché » pour Signal Forms). */
  readonly touch = output<void>();

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly blurred = signal(false);
  /** Texte en clair affiché (jamais conservé dans le modèle ; revient masqué à chaque nouvelle instance). */
  protected readonly revealed = signal(false);

  protected readonly resolvedSize = computed(() => this.size() ?? this.defaults.size);
  protected readonly toggleLabel = computed(() => (this.revealed() ? this.labels.hidePassword : this.labels.showPassword));
  protected readonly showInvalid = computed(() =>
    this.field ? this.field.showInvalid() : this.invalid() && (this.touched() || this.blurred()));
  protected readonly isRequired = computed(() => this.required() || (this.field?.isRequired() ?? false));
  protected readonly describedBy = computed(() => joinIds(this.field?.describedBy()));
  protected readonly frameClasses = computed(() => {
    const fillMode = this.fillMode() ?? this.defaults.fillMode;
    const rounded = this.rounded() ?? this.defaults.rounded;
    return `lc-field lc-field--${this.resolvedSize()} lc-field--${fillMode} lc-field--rounded-${rounded}`;
  });

  focus(options?: FocusOptions): void {
    this.inputRef().nativeElement.focus(options);
  }

  protected toggle(): void {
    this.revealed.update((revealed) => !revealed);
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    this.blurred.set(true);
    this.touch.emit();
  }
}
