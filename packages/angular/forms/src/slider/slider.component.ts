import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  isDevMode,
  model,
  numberAttribute,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { LC_DEFAULTS, LcFormatService, LcSize, LcThemeColor, joinIds, lcUniqueId, roundTo } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';
import { LcNumberInputComponent } from '../numeric/number-input.component';

/** Graduation sous la piste. */
export interface LcSliderMark {
  readonly value: number;
  readonly label?: string;
}

/** Ce que le curseur affiche à côté de la piste : rien, la valeur en texte, ou un champ numérique couplé. */
export type LcSliderShowValue = 'none' | 'label' | 'input';

interface MarkView {
  readonly value: number;
  readonly label: string | null;
  readonly ratio: number;
}

/**
 * Curseur **générique** sur un `input[type=range]` natif (clavier, lecteurs d'écran et tactile gérés par le navigateur).
 * La valeur est toujours un nombre ; `unit` n'est qu'un libellé affiché (« % », « € », « ans »), sans conversion :
 * au consommateur d'adapter `min`, `max`, `step` et `unit` s'il change de grandeur.
 * Implémente `FormValueControl<number | null>` (Signal Forms) et `[(value)]`.
 *
 * @example
 * <lc-form-field label="Part de l'écart épargnée">
 *   <lc-slider [(value)]="share" [min]="0" [max]="100" [step]="5" unit="%" showValue="input" />
 * </lc-form-field>
 */
@Component({
  selector: 'lc-slider',
  imports: [LcNumberInputComponent],
  template: `
    <div class="lc-slider__control">
      <div class="lc-slider__track">
        <input #input class="lc-slider__input" type="range" [id]="inputId()" [min]="lowerBound()" [max]="upperBound()" [step]="step()"
          [value]="position()" [disabled]="disabled()" [attr.list]="marksViews().length > 0 ? listId : null"
          [attr.aria-label]="ariaLabel() || null" [attr.aria-valuetext]="ariaValueText()"
          [attr.aria-readonly]="readonly() ? 'true' : null" [attr.aria-invalid]="showInvalid() ? 'true' : null"
          [attr.aria-required]="isRequired() ? 'true' : null" [attr.aria-describedby]="describedBy()"
          (input)="onInput($event)" (change)="onChange()" (blur)="onBlur()" />
        @if (marksViews().length > 0) {
          <datalist [id]="listId">
            @for (mark of marksViews(); track mark.value) {
              <option [value]="mark.value" [attr.label]="mark.label"></option>
            }
          </datalist>
          <div class="lc-slider__marks" aria-hidden="true">
            @for (mark of marksViews(); track mark.value) {
              <span class="lc-slider__mark" [style.--lc-slider-mark-ratio]="mark.ratio">
                <span class="lc-slider__tick"></span>
                @if (mark.label) {
                  <span class="lc-slider__mark-label">{{ mark.label }}</span>
                }
              </span>
            }
          </div>
        }
      </div>
      @switch (showValue()) {
        @case ('label') {
          <span class="lc-slider__value" aria-hidden="true">{{ valueLabel() }}</span>
        }
        @case ('input') {
          <lc-number-input class="lc-slider__number" [value]="value()" (valueChange)="onNumberInput($event)" (touch)="onNumberTouch()"
            [min]="lowerBound()" [max]="upperBound()" [step]="step()" [decimals]="decimals()" [unit]="unit()" [size]="size()"
            [disabled]="disabled()" [readonly]="readonly()" [invalid]="showInvalid()" [touched]="true"
            [ariaLabel]="numberLabel()" />
        }
      }
    </div>
  `,
  styleUrl: './slider.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcSliderComponent) }],
  host: {
    class: 'lc-slider',
    '[class]': "'lc-slider--' + resolvedSize() + ' lc-slider--' + resolvedThemeColor()",
    '[class.lc-slider--invalid]': 'showInvalid()',
    '[class.lc-slider--disabled]': 'disabled()',
    '[class.lc-slider--readonly]': 'readonly()',
    '[class.lc-slider--has-marks-labels]': 'hasMarkLabels()',
    '[style.--lc-slider-fill]': 'fillPercent()',
    '[style.--lc-slider-ratio]': 'ratio()',
  },
})
export class LcSliderComponent implements FormValueControl<number | null>, LcFormFieldControl {
  private readonly defaults = inject(LC_DEFAULTS);
  private readonly format = inject(LcFormatService);
  protected readonly field = inject(LC_FORM_FIELD, { optional: true });

  /** `null` : poignée à `min`, aucune valeur affichée. */
  readonly value = model<number | null>(null);
  /** Borne basse (défaut 0) ; `min` et `max` peuvent aussi venir des règles de Signal Forms. */
  readonly min = input<number | undefined>(undefined);
  /** Borne haute (défaut 100). */
  readonly max = input<number | undefined>(undefined);
  /** Pas du curseur (peut être décimal). */
  readonly step = input(1, { transform: numberAttribute });
  /** Unité affichée après la valeur et dans le champ couplé (« % », « € », « ans ») ; aucune conversion. */
  readonly unit = input<string>();
  /** Arrondi de la valeur émise et nombre de décimales affichées. */
  readonly decimals = input(0, { transform: numberAttribute });
  readonly showValue = input<LcSliderShowValue>('label');
  readonly marks = input<readonly LcSliderMark[]>([]);
  /** Texte lu par les technologies d'assistance (défaut : « {valeur formatée} {unité} »). */
  readonly valueText = input<((value: number) => string) | undefined>(undefined);
  /** Identifiant du champ interne (généré), relié au libellé de `lc-form-field`. */
  readonly inputId = input<string>(lcUniqueId('slider'));
  /** Nom accessible quand le contrôle est utilisé hors de `lc-form-field`. */
  readonly ariaLabel = input<string>();
  readonly size = input<LcSize | undefined>(undefined);
  readonly themeColor = input<LcThemeColor | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Force l'état invalide (sinon déduit de `lc-form-field` et de `[formField]`). */
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  /** Fin de geste (`change`) ou fin de saisie dans le champ couplé : pour un calcul coûteux ; `value` suit `input`. */
  readonly committed = output<number | null>();
  /** Émis quand le focus quitte le curseur (champ « touché » pour Signal Forms). */
  readonly touch = output<void>();

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;

  protected readonly listId = lcUniqueId('slider-marks');
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly blurred = signal(false);
  private readonly fieldLabel = signal<string | null>(null);
  private numberDirty = false;

  protected readonly lowerBound = computed(() => this.min() ?? 0);
  protected readonly upperBound = computed(() => this.max() ?? 100);
  protected readonly resolvedSize = computed(() => this.size() ?? this.defaults.size);
  protected readonly resolvedThemeColor = computed(() => this.themeColor() ?? this.defaults.themeColor);
  protected readonly showInvalid = computed(() =>
    this.field ? this.field.showInvalid() : this.invalid() && (this.touched() || this.blurred()));
  protected readonly isRequired = computed(() => this.required() || (this.field?.isRequired() ?? false));
  protected readonly describedBy = computed(() => joinIds(this.field?.describedBy()));
  protected readonly numberLabel = computed(() => this.ariaLabel() || this.fieldLabel() || undefined);

  /** Position de la poignée : valeur, ou `min` quand elle est nulle (le navigateur borne les valeurs hors limites). */
  protected readonly position = computed(() => this.value() ?? this.lowerBound());
  /** Rapport 0..1 de la valeur dans l'intervalle (borné pour une valeur hors bornes ou un intervalle vide). */
  protected readonly ratio = computed(() => {
    const span = this.upperBound() - this.lowerBound();
    if (!(span > 0)) return 0;
    return Math.min(1, Math.max(0, (this.position() - this.lowerBound()) / span));
  });
  protected readonly fillPercent = computed(() => `${this.ratio() * 100}%`);
  protected readonly valueLabel = computed(() => this.formatValue(this.value()));
  protected readonly ariaValueText = computed(() => {
    const value = this.value();
    if (value === null) return null;
    return this.valueText()?.(value) ?? this.formatValue(value);
  });
  protected readonly marksViews = computed<readonly MarkView[]>(() => {
    const min = this.lowerBound();
    const max = this.upperBound();
    const span = max - min;
    if (!(span > 0)) return [];
    return this.marks()
      .filter((mark) => mark.value >= min && mark.value <= max)
      .map((mark) => ({ value: mark.value, label: mark.label ?? null, ratio: (mark.value - min) / span }));
  });
  protected readonly hasMarkLabels = computed(() => this.marksViews().some((mark) => mark.label !== null));

  constructor() {
    afterNextRender(() => {
      const labelId = this.field?.labelId;
      this.fieldLabel.set(labelId ? (document.getElementById(labelId)?.textContent?.trim() || null) : null);
      if (isDevMode() && this.lowerBound() > this.upperBound()) {
        console.warn('[lc-slider] `min` est supérieur à `max`.');
      }
    });
  }

  focus(options?: FocusOptions): void {
    this.inputRef().nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (this.readonly()) {
      element.value = String(this.position());
      return;
    }
    this.value.set(roundTo(Number(element.value), this.decimals()));
  }

  protected onChange(): void {
    if (this.readonly()) return;
    this.committed.emit(this.value());
  }

  protected onBlur(): void {
    this.blurred.set(true);
    this.touch.emit();
  }

  protected onNumberInput(value: number | null): void {
    if (this.readonly()) return;
    this.numberDirty = true;
    this.value.set(value);
  }

  protected onNumberTouch(): void {
    this.blurred.set(true);
    if (this.numberDirty) {
      this.numberDirty = false;
      this.committed.emit(this.value());
    }
    this.touch.emit();
  }

  /** Valeur au format numérique de la locale, suivie de l'unité (espace insécable). */
  private formatValue(value: number | null): string {
    if (value === null) return '';
    const text = this.format.number(value, this.decimals());
    const unit = this.unit();
    return unit ? `${text} ${unit}` : text;
  }
}
