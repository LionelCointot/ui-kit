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
import { LC_DEFAULTS, LcFillMode, LcRounded, LcSize, joinIds, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

/**
 * Saisie de date sur `input[type=date]` natif. Valeur (model) au format ISO `AAAA-MM-JJ` ou `null` :
 * aucun objet `Date`, donc aucun décalage de fuseau (cohérent avec `DateOnly` côté .NET).
 * Implémente `FormValueControl<string | null>` (Signal Forms) et `[(value)]`.
 */
@Component({
  selector: 'lc-date-input',
  template: `
    <input #input class="lc-field__input" type="date" [id]="inputId()" [value]="value() ?? ''"
      [attr.min]="min() ?? null" [attr.max]="max() ?? null" [disabled]="disabled()" [readOnly]="readonly()"
      [attr.aria-label]="ariaLabel() || null" [attr.aria-invalid]="showInvalid() ? 'true' : null"
      [attr.aria-required]="isRequired() ? 'true' : null" [attr.aria-describedby]="describedBy()"
      (change)="onInput($event)" (input)="onInput($event)" (blur)="onBlur()" />
  `,
  styleUrl: '../shared/field-frame.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcDateInputComponent) }],
  host: {
    class: 'lc-date-input',
    '[class]': 'frameClasses()',
    '[class.lc-field--invalid]': 'showInvalid()',
    '[class.lc-field--disabled]': 'disabled()',
    '[class.lc-field--readonly]': 'readonly()',
  },
})
export class LcDateInputComponent implements FormValueControl<string | null>, LcFormFieldControl {
  private readonly defaults = inject(LC_DEFAULTS);
  private readonly field = inject(LC_FORM_FIELD, { optional: true });

  readonly value = model<string | null>(null);
  /** Date minimale ISO (AAAA-MM-JJ). */
  readonly min = input<string | undefined>(undefined);
  /** Date maximale ISO (AAAA-MM-JJ). */
  readonly max = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
  readonly rounded = input<LcRounded | undefined>(undefined);
  readonly inputId = input<string>(lcUniqueId('date'));
  readonly ariaLabel = input<string>();
  readonly touch = output<void>();

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly blurred = signal(false);

  protected readonly showInvalid = computed(() =>
    this.field ? this.field.showInvalid() : this.invalid() && (this.touched() || this.blurred()));
  protected readonly isRequired = computed(() => this.required() || (this.field?.isRequired() ?? false));
  protected readonly describedBy = computed(() => joinIds(this.field?.describedBy()));
  protected readonly frameClasses = computed(() => {
    const size = this.size() ?? this.defaults.size;
    const fillMode = this.fillMode() ?? this.defaults.fillMode;
    const rounded = this.rounded() ?? this.defaults.rounded;
    return `lc-field lc-field--${size} lc-field--${fillMode} lc-field--rounded-${rounded}`;
  });

  focus(options?: FocusOptions): void {
    this.inputRef().nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    const iso = toIsoDate(text);
    if (iso !== undefined && iso !== this.value()) {
      this.value.set(iso);
    }
  }

  protected onBlur(): void {
    this.blurred.set(true);
    this.touch.emit();
  }
}

/**
 * Texte du champ → date ISO : la valeur native est déjà ISO ; repli pour un navigateur sans sélecteur natif
 * (saisie « JJ/MM/AAAA »). `undefined` = saisie incomplète ou invalide (valeur inchangée), `null` = vide.
 */
export function toIsoDate(text: string): string | null | undefined {
  if (text === '') return null;
  if (ISO_DATE.test(text)) return text;
  const match = LOCAL_DATE.exec(text);
  if (!match) return undefined;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
