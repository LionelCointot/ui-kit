import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes, fixedExample } from '@lc/storybook';
import { LcFormFieldComponent, LcMoneyInputComponent, LcNumberInputComponent, LcPercentInputComponent } from '@lionelcointot/ui-angular/forms';

/**
 * Localised numeric fields: `lc-number-input` (optional unit and stepper), `lc-money-input` and `lc-percent-input`.
 * The value is a plain `number | null`; display formatting and parsing follow the locale. The playground uses `lc-number-input`.
 *
 * Import: `import { LcNumberInputComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcNumberInputComponent> = {
  title: 'Forms/Number fields',
  component: LcNumberInputComponent,
  decorators: [moduleMetadata({ imports: [LcNumberInputComponent, LcMoneyInputComponent, LcPercentInputComponent, LcFormFieldComponent] })],
  args: {
    decimals: 0, step: 1, unit: 'mois', showStepper: true, min: 0, max: 360, placeholder: '', size: 'medium', fillMode: 'solid', rounded: 'medium',
    disabled: false, readonly: false, required: false, invalid: false, touched: false,
  },
  argTypes: { size: commonArgTypes.size, fillMode: commonArgTypes.fillMode, rounded: commonArgTypes.rounded, min: { control: 'number' }, max: { control: 'number' } },
};
export default meta;
type Story = StoryObj<LcNumberInputComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['min', 'max', 'step', 'invalid', 'touched'] } },
  render: (args) => ({
    props: { ...args, duration: signal<number | null>(24) },
    template: `
      <div style="max-width:20rem">
        <lc-form-field label="Durée">
          <lc-number-input [(value)]="duration" [decimals]="decimals" [step]="step" [unit]="unit" [showStepper]="showStepper"
            [min]="min" [max]="max" [placeholder]="placeholder" [size]="size" [fillMode]="fillMode" [rounded]="rounded"
            [disabled]="disabled" [readonly]="readonly" [required]="required" [invalid]="invalid" [touched]="touched" />
        </lc-form-field>
        <p style="margin-top:1rem">Valeur : {{ duration() ?? 'aucune' }}</p>
      </div>`,
  }),
};

/** Money field (`lc-money-input`): two decimals by default. */
export const Money: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { budget: signal<number | null>(250000) },
    template: `<div style="max-width:20rem"><lc-form-field label="Budget" required><lc-money-input [(value)]="budget" /></lc-form-field></div>`,
  }),
};

/** Percentage field (`lc-percent-input`): `decimals` and `step` change the precision. */
export const Percent: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { discount: signal<number | null>(3.5) },
    template: `
      <div style="max-width:20rem">
        <lc-form-field label="Remise" [errors]="discount() !== null && discount()! > 10 ? ['La remise doit rester inférieure à 10 %'] : []">
          <lc-percent-input [(value)]="discount" [decimals]="3" />
        </lc-form-field>
      </div>`,
  }),
};
