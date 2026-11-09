import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, linkedSignal, output } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent, LcInputDirective, LcNumberInputComponent, LcSelectDirective, LcSuffixDirective } from '@lionelcointot/ui-angular/forms';
import { type LcThemeTokenSchema, themeFontStacks, validateTheme } from '@lionelcointot/ui-tokens/theme';
import { splitDimension, toPickerHex } from './theme-model';

const DIMENSION_UNITS = ['px', 'rem', 'em'] as const;
type DimensionUnit = (typeof DIMENSION_UNITS)[number];

/**
 * Champ d'édition d'un token `sys` (usage interne de `lc-theme-editor`) : le contrôle dépend du type
 * (couleur : sélecteur et champ hexadécimal ; dimension : nombre et unité ; police : liste ; ombre : texte).
 * Une saisie invalide n'est jamais émise : la dernière valeur valide reste en vigueur et le champ affiche l'erreur.
 */
@Component({
  selector: 'lc-theme-token-field',
  imports: [LcFormFieldComponent, LcInputDirective, LcSelectDirective, LcNumberInputComponent, LcSuffixDirective, LcButtonComponent, LcIconComponent],
  template: `
    <lc-form-field [label]="label()" [hint]="hint()" [errors]="errorMessages()">
      @switch (token().type) {
        @case ('color') {
          <span class="lc-theme-token__pair">
            <input type="color" class="lc-theme-token__swatch" [value]="pickerValue()" [disabled]="locked()"
              [attr.aria-label]="labels.themeBuilder.colorPicker(label())" (input)="onPicker($event)" />
            <input lcInput type="text" class="lc-theme-token__text" spellcheck="false" autocomplete="off" autocapitalize="off"
              [value]="draft()" [readOnly]="locked()" (input)="onText($event)" />
          </span>
        }
        @case ('dimension') {
          <span class="lc-theme-token__pair">
            <lc-number-input [value]="dimension().amount" [decimals]="3" [step]="dimensionStep()" [min]="0"
              [readonly]="locked()" [showStepper]="!locked()" [inputId]="controlId" (valueChange)="onAmount($event)" />
            <select lcSelect class="lc-theme-token__unit" [disabled]="locked()" [attr.aria-label]="labels.themeBuilder.unitLabel(label())"
              (change)="onUnit($event)">
              @for (unit of units; track unit) {
                <option [value]="unit" [selected]="unit === dimension().unit">{{ unit }}</option>
              }
            </select>
          </span>
        }
        @case ('fontFamily') {
          <select lcSelect [disabled]="locked()" (change)="onFont($event)">
            @for (option of fontOptions(); track option.value) {
              <option [value]="option.value" [selected]="option.value === value()">{{ option.label }}</option>
            }
          </select>
        }
        @case ('number') {
          <lc-number-input [value]="numberValue()" [decimals]="3" [step]="0.05" [min]="0" [readonly]="locked()"
            [showStepper]="!locked()" (valueChange)="onNumber($event)" />
        }
        @default {
          <input lcInput type="text" spellcheck="false" autocomplete="off" [value]="draft()" [readOnly]="locked()" (input)="onText($event)" />
        }
      }
      @if (linkable()) {
        <button lcSuffix lcButton type="button" fillMode="flat" themeColor="neutral" size="small" iconOnly
          [attr.aria-pressed]="linked()" [attr.aria-label]="linkLabel()" (click)="linkedChange.emit(!linked())">
          <lc-icon [name]="linked() ? 'lock' : 'lock-open'" />
        </button>
      } @else if (modified()) {
        <button lcSuffix lcButton type="button" fillMode="flat" themeColor="neutral" size="small" iconOnly
          [attr.aria-label]="labels.themeBuilder.useBaseValue + ' : ' + label()" (click)="resetValue.emit()">
          <lc-icon name="rotate-ccw" />
        </button>
      }
    </lc-form-field>
  `,
  styleUrl: './theme-token-field.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-theme-token-field', '[class.lc-theme-token-field--modified]': 'modified()' },
})
export class LcThemeTokenFieldComponent {
  protected readonly labels = inject(LC_LABELS);
  protected readonly units = DIMENSION_UNITS;
  protected readonly controlId = lcUniqueId('theme-token');

  readonly token = input.required<LcThemeTokenSchema>();
  readonly label = input.required<string>();
  /** Valeur effective (surcharge, sinon base). */
  readonly value = input.required<string>();
  readonly modified = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** Le token est calculé à partir d'un autre : bouton lier / délier. */
  readonly linkable = input(false, { transform: booleanAttribute });
  readonly linked = input(false, { transform: booleanAttribute });

  /** Valeur valide saisie par l'utilisateur. */
  readonly valueChange = output<string>();
  readonly linkedChange = output<boolean>();
  readonly resetValue = output<void>();

  protected readonly locked = computed(() => this.linkable() && this.linked());
  protected readonly draft = linkedSignal(() => this.value());
  private readonly issues = linkedSignal<string, readonly string[]>({ source: this.value, computation: () => [] });
  protected readonly errorMessages = computed(() => this.issues());
  protected readonly pickerValue = computed(() => toPickerHex(this.value()) ?? '#000000');
  protected readonly dimension = computed(() => splitDimension(this.value()) ?? { amount: null, unit: 'px' as DimensionUnit });
  protected readonly dimensionStep = computed(() => (this.dimension().unit === 'px' ? 1 : 0.125));
  protected readonly numberValue = computed(() => {
    const parsed = Number(this.value());
    return Number.isFinite(parsed) ? parsed : null;
  });
  protected readonly linkLabel = computed(() =>
    this.linked() ? this.labels.themeBuilder.linked(this.label()) : this.labels.themeBuilder.unlinked(this.label()));
  protected readonly fontOptions = computed(() => {
    const known = themeFontStacks.map((stack) => ({ value: stack.value, label: this.labels.themeBuilder.fontStacks[stack.id] ?? stack.label }));
    return known.some((option) => option.value === this.value())
      ? known
      : [{ value: this.value(), label: `${this.labels.themeBuilder.customFont} : ${this.value()}` }, ...known];
  });

  protected onText(event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    this.draft.set(text);
    this.commit(text);
  }

  protected onPicker(event: Event): void {
    this.commit((event.target as HTMLInputElement).value.toLowerCase());
  }

  protected onAmount(amount: number | null): void {
    if (amount === null) return;
    this.commit(`${amount}${this.dimension().unit}`);
  }

  protected onUnit(event: Event): void {
    const amount = this.dimension().amount;
    if (amount !== null) this.commit(`${amount}${(event.target as HTMLSelectElement).value}`);
  }

  protected onNumber(value: number | null): void {
    if (value !== null) this.commit(String(value));
  }

  protected onFont(event: Event): void {
    this.commit((event.target as HTMLSelectElement).value);
  }

  /** Valide avec le module de thème (liste blanche du type) : seule une valeur acceptée est émise. */
  private commit(text: string): void {
    const { errors } = validateTheme({ extends: 'default', overrides: { [this.token().path]: text } }, { identity: false });
    this.issues.set(errors.map((issue) => this.labels.themeBuilder.issue(issue.code, issue.path, issue.suggestion)));
    if (errors.length === 0 && text !== this.value()) this.valueChange.emit(text);
  }
}
