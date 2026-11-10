import {
  Directive,
  ElementRef,
  Signal,
  booleanAttribute,
  computed,
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
  LcFillMode,
  LcFormatService,
  LcRounded,
  LcSize,
  joinIds,
  lcUniqueId,
  parseLocaleNumber,
  roundTo,
} from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LcFormFieldControl } from '../form-field/form-field-control';

/** Caractères acceptés à la frappe : chiffres, espaces, séparateurs et signe moins initial (les lettres sont refusées). */
const TYPED_NUMBER = /^-?[\d\s.,]*$/;

/** Gabarit commun aux saisies numériques (cadre, champ texte, unité, boutons − et +). */
export const NUMERIC_INPUT_TEMPLATE = `
  @if (stepperVisible()) {
    <button type="button" class="lc-field__step" tabindex="-1" [attr.aria-label]="labels.decrease"
      [disabled]="!canDecrease()" (click)="stepBy(-1)"><lc-icon name="minus" /></button>
  }
  <input #input class="lc-field__input lc-field__input--numeric" type="text" autocomplete="off" [id]="inputId()"
    [attr.inputmode]="inputMode()" [value]="displayText()" [disabled]="disabled()" [readOnly]="readonly()"
    [attr.placeholder]="placeholder() || null" [attr.aria-label]="ariaLabel() || null"
    [attr.aria-invalid]="showInvalid() ? 'true' : null" [attr.aria-required]="isRequired() ? 'true' : null"
    [attr.aria-describedby]="describedBy()"
    (mousedown)="onMouseDown()" (mouseup)="onMouseUp($event)" (focus)="onFocus()" (blur)="onBlur()" (input)="onInput($event)" (paste)="onPaste($event)" (keydown)="onKeydown($event)" />
  @if (unitText(); as unit) {
    <span class="lc-field__unit" [id]="unitId" aria-hidden="true">{{ unit }}</span>
  }
  @if (stepperVisible()) {
    <button type="button" class="lc-field__step" tabindex="-1" [attr.aria-label]="labels.increase"
      [disabled]="!canIncrease()" (click)="stepBy(1)"><lc-icon name="plus" /></button>
  }
`;

/** Liaisons d'hôte communes : le composant hôte est le cadre du champ. */
export const NUMERIC_INPUT_HOST = {
  '[class]': 'frameClasses()',
  '[class.lc-field--invalid]': 'showInvalid()',
  '[class.lc-field--disabled]': 'disabled()',
  '[class.lc-field--readonly]': 'readonly()',
};

/**
 * Base commune de `lc-money-input`, `lc-percent-input` et `lc-number-input` :
 * - hors focus, valeur formatée selon la locale (« 250 000 ») ; au focus, valeur brute éditable (« 250000 ») ;
 * - virgule ou point comme séparateur décimal, espaces ignorés, collage analysé (« 250 000,50 € »), lettres refusées ;
 * - arrondi à `decimals` à la sortie du champ ; hors bornes, la valeur est conservée (la validation signale l'erreur) ;
 * - `null` si le champ est vide ; flèches haut et bas = ± `step` quand un pas est défini.
 * Implémente `FormValueControl<number | null>` (Signal Forms : `[formField]`) et `[(value)]`.
 */
@Directive()
export abstract class LcNumericInputBase implements FormValueControl<number | null>, LcFormFieldControl {
  protected readonly format = inject(LcFormatService);
  protected readonly labels = inject(LC_LABELS);
  private readonly defaults = inject(LC_DEFAULTS);
  protected readonly field = inject(LC_FORM_FIELD, { optional: true });

  readonly value = model<number | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Force l'état invalide (sinon déduit de `lc-form-field` et de `[formField]`). */
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
  readonly rounded = input<LcRounded | undefined>(undefined);
  readonly placeholder = input('');
  /** Identifiant du champ texte interne (généré), relié au libellé de `lc-form-field`. */
  readonly inputId = input<string>(lcUniqueId('number'));
  /** Nom accessible quand le contrôle est utilisé hors de `lc-form-field`. */
  readonly ariaLabel = input<string>();
  /** Émis quand le focus quitte le champ (champ « touché » pour Signal Forms). */
  readonly touch = output<void>();

  /** Nombre de décimales conservées à la sortie du champ. */
  abstract readonly decimals: Signal<number>;
  protected abstract readonly unitText: Signal<string | null>;
  protected abstract readonly stepValue: Signal<number | null>;
  protected readonly stepperVisible: Signal<boolean> = signal(false);

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;
  protected readonly unitId = lcUniqueId('unit');

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly focused = signal(false);
  private readonly draft = signal('');
  private readonly blurred = signal(false);
  /** Vrai entre le `mousedown` qui donne le focus et le `mouseup` suivant (voir `onMouseUp`). */
  private pointerFocusing = false;

  protected readonly displayText = computed(() => (this.focused() ? this.draft() : this.formatForDisplay(this.value())));
  protected readonly inputMode = computed(() => (this.decimals() > 0 ? 'decimal' : 'numeric'));
  protected readonly showInvalid = computed(() =>
    this.field ? this.field.showInvalid() : this.invalid() && (this.touched() || this.blurred()));
  protected readonly isRequired = computed(() => this.required() || (this.field?.isRequired() ?? false));
  protected readonly describedBy = computed(() => joinIds(this.unitText() ? this.unitId : null, this.field?.describedBy()));
  protected readonly canDecrease = computed(() => this.canStep(-1));
  protected readonly canIncrease = computed(() => this.canStep(1));
  protected readonly frameClasses = computed(() => {
    const size = this.size() ?? this.defaults.size;
    const fillMode = this.fillMode() ?? this.defaults.fillMode;
    const rounded = this.rounded() ?? this.defaults.rounded;
    return `lc-field lc-field--${size} lc-field--${fillMode} lc-field--rounded-${rounded}`;
  });

  focus(options?: FocusOptions): void {
    this.inputRef().nativeElement.focus(options);
  }

  /**
   * Le texte passe de la forme affichée (« 250 000 ») à la forme éditable (« 250000 »). Le texte est donc écrit
   * tout de suite dans le champ, puis sélectionné en entier : sans cela, la mise à jour du gabarit, plus tardive,
   * remplace le texte et reporte le curseur en fin, et la frappe s'ajouterait à l'ancienne valeur (arrivée par Tab).
   */
  protected onFocus(): void {
    const text = this.toEditText(this.value());
    this.draft.set(text);
    this.focused.set(true);
    const element = this.inputRef().nativeElement;
    element.value = text;
    element.select();
  }

  protected onMouseDown(): void {
    this.pointerFocusing = !this.focused();
  }

  /** Le `mouseup` du clic qui a donné le focus effacerait la sélection : il est neutralisé, une seule fois. */
  protected onMouseUp(event: MouseEvent): void {
    if (!this.pointerFocusing) return;
    this.pointerFocusing = false;
    event.preventDefault();
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.blurred.set(true);
    const value = this.value();
    if (value !== null) {
      const rounded = roundTo(value, this.decimals());
      if (rounded !== value) this.value.set(rounded);
    }
    this.touch.emit();
  }

  protected onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    const text = element.value;
    if (!TYPED_NUMBER.test(text)) {
      this.rejectTyping(element, text);
      return;
    }
    this.draft.set(text);
    const parsed = parseLocaleNumber(text, this.decimals());
    if (parsed === null) {
      this.value.set(null);
    } else if (!Number.isNaN(parsed)) {
      this.value.set(parsed);
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const parsed = parseLocaleNumber(event.clipboardData?.getData('text') ?? '', this.decimals());
    if (parsed === null || Number.isNaN(parsed)) return;
    this.value.set(parsed);
    this.draft.set(this.toEditText(parsed));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (this.stepValue() === null || this.readonly()) return;
    event.preventDefault();
    this.stepBy(event.key === 'ArrowUp' ? 1 : -1);
  }

  protected stepBy(direction: 1 | -1): void {
    const step = this.stepValue();
    if (step === null || this.disabled() || this.readonly() || !this.canStep(direction)) return;
    let next = roundTo((this.value() ?? 0) + direction * step, this.decimals());
    const min = this.min();
    const max = this.max();
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    this.value.set(next);
    if (this.focused()) this.draft.set(this.toEditText(next));
  }

  /** Hors focus : décimales seulement pour une valeur non entière (250 000 ; 1 234,50). */
  protected formatForDisplay(value: number | null): string {
    if (value === null) return '';
    return this.format.number(value, Number.isInteger(value) ? 0 : this.decimals());
  }

  private toEditText(value: number | null): string {
    return value === null ? '' : String(value).replace('.', this.format.decimalSeparator);
  }

  private canStep(direction: 1 | -1): boolean {
    const value = this.value();
    if (value === null) return true;
    const bound = direction === 1 ? this.max() : this.min();
    return bound === undefined || (direction === 1 ? value < bound : value > bound);
  }

  /** Lettres refusées : le texte précédent est rétabli, curseur conservé. */
  private rejectTyping(element: HTMLInputElement, text: string): void {
    const previous = this.draft();
    const caret = Math.max(0, (element.selectionStart ?? text.length) - (text.length - previous.length));
    element.value = previous;
    element.setSelectionRange(caret, caret);
  }
}
