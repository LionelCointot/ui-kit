import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcSliderComponent } from './slider.component';

const meta: Meta<LcSliderComponent> = {
  title: 'Formulaires/Curseur',
  component: LcSliderComponent,
  decorators: [moduleMetadata({ imports: [LcSliderComponent, LcFormFieldComponent] })],
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    themeColor: { control: 'select', options: ['primary', 'secondary', 'success', 'warning', 'error', 'highlight', 'neutral'] },
    showValue: { control: 'inline-radio', options: ['none', 'label', 'input'] },
  },
  args: { min: 0, max: 100, step: 5, unit: '%', decimals: 0, showValue: 'label', disabled: false, readonly: false },
  render: (args) => ({
    props: { ...args, share: signal<number | null>(60) },
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Part de l'écart épargnée">
          <lc-slider [(value)]="share" [min]="min" [max]="max" [step]="step" [unit]="unit" [decimals]="decimals"
            [showValue]="showValue" [size]="size" [themeColor]="themeColor" [disabled]="disabled" [readonly]="readonly" />
        </lc-form-field>
        <p style="margin-top:1rem">Valeur : {{ share() ?? 'aucune' }}</p>
      </div>`,
  }),
};
export default meta;
type Story = StoryObj<LcSliderComponent>;

/** Pourcentage : la valeur reste un nombre (60), l'unité n'est qu'un libellé. */
export const Pourcentage: Story = {};

/** Montant en euros : l'appelant change `min`, `max`, `step` et `unit` ; aucune conversion. */
export const Euros: Story = {
  args: { min: 0, max: 3000, step: 50, unit: '€' },
  render: (args) => ({
    props: { ...args, amount: signal<number | null>(1500) },
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Épargne mensuelle">
          <lc-slider [(value)]="amount" [min]="min" [max]="max" [step]="step" [unit]="unit" [showValue]="showValue" />
        </lc-form-field>
      </div>`,
  }),
};

/** Saisie exacte au clavier dans le champ numérique couplé. */
export const AvecChampNumerique: Story = {
  args: { showValue: 'input', min: 0, max: 40, step: 1, unit: 'ans' },
  render: (args) => ({
    props: { ...args, years: signal<number | null>(20) },
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Horizon">
          <lc-slider [(value)]="years" [min]="min" [max]="max" [step]="step" [unit]="unit" showValue="input" />
        </lc-form-field>
      </div>`,
  }),
};

export const Graduations: Story = {
  render: () => ({
    props: {
      years: signal<number | null>(10),
      marks: [{ value: 0, label: '0' }, { value: 10, label: '10' }, { value: 20, label: '20 ans' }, { value: 30, label: '30' }, { value: 40, label: '40' }],
    },
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Durée de détention">
          <lc-slider [(value)]="years" [min]="0" [max]="40" [step]="1" unit="ans" [marks]="marks" />
        </lc-form-field>
      </div>`,
  }),
};

export const Etats: Story = {
  render: () => ({
    props: { value: signal<number | null>(40), empty: signal<number | null>(null) },
    template: `
      <div style="display:grid;gap:24px;max-width:28rem">
        <lc-form-field label="Normal"><lc-slider [(value)]="value" unit="%" /></lc-form-field>
        <lc-form-field label="Sans valeur"><lc-slider [(value)]="empty" unit="%" /></lc-form-field>
        <lc-form-field label="Désactivé"><lc-slider [(value)]="value" unit="%" disabled /></lc-form-field>
        <lc-form-field label="Lecture seule"><lc-slider [(value)]="value" unit="%" readonly /></lc-form-field>
        <lc-form-field label="Invalide" [errors]="['La part doit être inférieure à 30 %']"><lc-slider [(value)]="value" unit="%" invalid touched /></lc-form-field>
      </div>`,
  }),
};

export const Tailles: Story = {
  render: () => ({
    props: { value: signal<number | null>(50) },
    template: `
      <div style="display:grid;gap:16px;max-width:28rem">
        <lc-slider [(value)]="value" size="small" ariaLabel="Petit" unit="%" />
        <lc-slider [(value)]="value" size="medium" ariaLabel="Moyen" unit="%" />
        <lc-slider [(value)]="value" size="large" ariaLabel="Grand" unit="%" />
      </div>`,
  }),
};
