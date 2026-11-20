import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes, fixedExample } from '@lc/storybook';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcSliderComponent } from './slider.component';

/**
 * Range slider bound to a number (`lc-slider`). The `unit` is only a label: the value stays a plain number.
 * The current value is shown as a label, in a coupled numeric field, or not at all (`showValue`).
 *
 * Import: `import { LcSliderComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcSliderComponent> = {
  title: 'Forms/Slider',
  component: LcSliderComponent,
  decorators: [moduleMetadata({ imports: [LcSliderComponent, LcFormFieldComponent] })],
  argTypes: {
    size: commonArgTypes.size,
    themeColor: commonArgTypes.themeColor,
    showValue: { control: 'inline-radio', options: ['none', 'label', 'input'] },
  },
  args: {
    min: 0, max: 100, step: 5, unit: '%', decimals: 0, showValue: 'label', size: 'medium', themeColor: 'primary',
    disabled: false, readonly: false, required: false, invalid: false, touched: false,
  },
};
export default meta;
type Story = StoryObj<LcSliderComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, share: signal<number | null>(60) },
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Niveau de zoom">
          <lc-slider [(value)]="share" [min]="min" [max]="max" [step]="step" [unit]="unit" [decimals]="decimals"
            [showValue]="showValue" [size]="size" [themeColor]="themeColor" [disabled]="disabled" [readonly]="readonly"
            [required]="required" [invalid]="invalid" [touched]="touched" />
        </lc-form-field>
        <p style="margin-top:1rem">Valeur : {{ share() ?? 'aucune' }}</p>
      </div>`,
  }),
};

/** Amount in euros: the caller changes `min`, `max`, `step` and `unit`; no conversion. */
export const Euros: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { amount: signal<number | null>(1500) },
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Budget mensuel">
          <lc-slider [(value)]="amount" [min]="0" [max]="3000" [step]="50" unit="€" />
        </lc-form-field>
      </div>`,
  }),
};

/** Exact keyboard entry in the coupled numeric field (`showValue="input"`). */
export const WithNumericField: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { years: signal<number | null>(20) },
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Durée">
          <lc-slider [(value)]="years" [min]="0" [max]="40" [step]="1" unit="ans" showValue="input" />
        </lc-form-field>
      </div>`,
  }),
};

/** Tick marks with labels (`marks`). */
export const Marks: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      years: signal<number | null>(10),
      marks: [{ value: 0, label: '0' }, { value: 10, label: '10' }, { value: 20, label: '20 ans' }, { value: 30, label: '30' }, { value: 40, label: '40' }],
    },
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Durée d'abonnement">
          <lc-slider [(value)]="years" [min]="0" [max]="40" [step]="1" unit="ans" [marks]="marks" />
        </lc-form-field>
      </div>`,
  }),
};

/** Normal, empty, disabled, read-only and invalid sliders. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { value: signal<number | null>(40), empty: signal<number | null>(null) },
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-6);max-width:28rem">
        <lc-form-field label="Normal"><lc-slider [(value)]="value" unit="%" /></lc-form-field>
        <lc-form-field label="Sans valeur"><lc-slider [(value)]="empty" unit="%" /></lc-form-field>
        <lc-form-field label="Désactivé"><lc-slider [(value)]="value" unit="%" disabled /></lc-form-field>
        <lc-form-field label="Lecture seule"><lc-slider [(value)]="value" unit="%" readonly /></lc-form-field>
        <lc-form-field label="Invalide" [errors]="['Le niveau doit rester inférieur à 30 %']"><lc-slider [(value)]="value" unit="%" invalid touched /></lc-form-field>
      </div>`,
  }),
};

/** `small`, `medium` and `large` sizes. */
export const Sizes: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { value: signal<number | null>(50) },
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-4);max-width:28rem">
        <lc-slider [(value)]="value" size="small" ariaLabel="Petit" unit="%" />
        <lc-slider [(value)]="value" size="medium" ariaLabel="Moyen" unit="%" />
        <lc-slider [(value)]="value" size="large" ariaLabel="Grand" unit="%" />
      </div>`,
  }),
};
