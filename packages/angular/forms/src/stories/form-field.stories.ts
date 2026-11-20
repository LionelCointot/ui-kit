import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcFormFieldComponent, LcInputDirective, LcMoneyInputComponent, LcPercentInputComponent, LcNumberInputComponent, LcSegmentedControlComponent, LcSwitchComponent, LcSelectDirective, LcDateInputComponent } from '@lionelcointot/ui-angular/forms';

@Component({
  selector: 'lc-forms-demo',
  imports: [LcFormFieldComponent, LcInputDirective, LcMoneyInputComponent, LcPercentInputComponent, LcNumberInputComponent,
    LcSegmentedControlComponent, LcSwitchComponent, LcSelectDirective, LcDateInputComponent],
  template: `
    <form style="display:grid;gap:var(--lc-sys-space-4, 16px);max-width:28rem" (submit)="$event.preventDefault()">
      <lc-form-field label="Nom du projet" hint="Visible dans la liste des projets">
        <input lcInput type="text" [value]="'Refonte du site'" />
      </lc-form-field>
      <lc-form-field label="Budget" required>
        <lc-money-input [(value)]="budget" />
      </lc-form-field>
      <lc-form-field label="Remise" [errors]="discount() !== null && discount()! > 10 ? ['La remise doit rester inférieure à 10 %'] : []">
        <lc-percent-input [(value)]="discount" [decimals]="3" />
      </lc-form-field>
      <lc-form-field label="Durée">
        <lc-number-input [(value)]="months" unit="mois" [showStepper]="true" [min]="12" [max]="360" />
      </lc-form-field>
      <lc-form-field label="Date de début"><lc-date-input [(value)]="start" /></lc-form-field>
      <lc-form-field label="Type de projet">
        <select lcSelect><option>Interne</option><option>Client</option></select>
      </lc-form-field>
      <lc-segmented-control ariaLabel="Vue" [options]="views" [(value)]="view" />
      <button lcSwitch [(checked)]="notified" aria-label="Notifications par e-mail"></button>
    </form>
  `,
})
class FormsDemoComponent {
  readonly budget = signal<number | null>(250000);
  readonly discount = signal<number | null>(3.5);
  readonly months = signal<number | null>(240);
  readonly start = signal<string | null>('2026-01-15');
  readonly view = signal<string | null>('total');
  readonly notified = signal(true);
  readonly views = [{ value: 'total', label: 'Cumul' }, { value: 'team', label: 'Par équipe' }, { value: 'year', label: 'Par année' }];
}

/**
 * Wrapper that gives any form control a visible label, a hint and error messages, all linked by `aria-describedby`.
 * Wrap one control: `lcInput`, `lcSelect`, `lc-number-input`, `lc-date-input`, `lc-combobox`, `lc-slider`…
 *
 * Import: `import { LcFormFieldComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcFormFieldComponent> = {
  title: 'Forms/Form field',
  component: LcFormFieldComponent,
  decorators: [moduleMetadata({ imports: [FormsDemoComponent, LcFormFieldComponent, LcInputDirective] })],
  args: { label: 'Nom du projet', hint: 'Visible dans la liste des projets', hintPlacement: 'below', required: false, layout: 'stacked', errors: [] },
  argTypes: {
    hintPlacement: { control: 'inline-radio', options: ['below', 'above'] },
    layout: { control: 'inline-radio', options: ['stacked', 'inline'] },
    errors: { control: 'object' },
    state: { control: false },
  },
};
export default meta;
type Story = StoryObj<LcFormFieldComponent>;

/** Every input is bound: change them in the Controls panel (`errors` takes a list of messages). */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width:28rem">
        <lc-form-field [label]="label" [hint]="hint" [hintPlacement]="hintPlacement" [required]="required" [layout]="layout" [errors]="errors">
          <input lcInput type="text" />
        </lc-form-field>
      </div>`,
  }),
};

/** `hintPlacement="above"`: the hint reads between the label and the control (still linked by `aria-describedby`). */
export const HintAbove: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Nom du projet" hint="Visible dans la liste des projets" hintPlacement="above">
          <input lcInput type="text" />
        </lc-form-field>
      </div>`,
  }),
};

/** A complete form mixing text, money, percentage, number, date, select, segmented control and switch. */
export const CompleteForm: Story = {
  parameters: fixedExample,
  render: () => ({ template: '<lc-forms-demo />' }),
};
