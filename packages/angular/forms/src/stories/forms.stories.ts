import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcInputDirective } from '../input/input.directive';
import { LcMoneyInputComponent } from '../numeric/money-input.component';
import { LcPercentInputComponent } from '../numeric/percent-input.component';
import { LcNumberInputComponent } from '../numeric/number-input.component';
import { LcSegmentedControlComponent } from '../segmented-control/segmented-control.component';
import { LcSwitchComponent } from '../switch/switch.component';
import { LcSelectDirective } from '../select/select.directive';
import { LcDateInputComponent } from '../date-input/date-input.component';

@Component({
  selector: 'lc-forms-demo',
  imports: [LcFormFieldComponent, LcInputDirective, LcMoneyInputComponent, LcPercentInputComponent, LcNumberInputComponent,
    LcSegmentedControlComponent, LcSwitchComponent, LcSelectDirective, LcDateInputComponent],
  template: `
    <form style="display:grid;gap:16px;max-width:28rem" (submit)="$event.preventDefault()">
      <lc-form-field label="Nom du scénario" hint="Visible dans la barre de scénarios">
        <input lcInput type="text" [value]="'Scénario A'" />
      </lc-form-field>
      <lc-form-field label="Prix du bien" required>
        <lc-money-input [(value)]="price" />
      </lc-form-field>
      <lc-form-field label="Taux nominal" [errors]="rate() !== null && rate()! > 10 ? ['Le taux doit rester inférieur à 10 %'] : []">
        <lc-percent-input [(value)]="rate" [decimals]="3" />
      </lc-form-field>
      <lc-form-field label="Durée">
        <lc-number-input [(value)]="months" unit="mois" [showStepper]="true" [min]="12" [max]="360" />
      </lc-form-field>
      <lc-form-field label="Date de début"><lc-date-input [(value)]="start" /></lc-form-field>
      <lc-form-field label="Type de prêt">
        <select lcSelect><option>Amortissable</option><option>In fine</option></select>
      </lc-form-field>
      <lc-segmented-control ariaLabel="Vue" [options]="views" [(value)]="view" />
      <button lcSwitch [(checked)]="insured" aria-label="Assurance emprunteur"></button>
    </form>
  `,
})
class FormsDemoComponent {
  readonly price = signal<number | null>(250000);
  readonly rate = signal<number | null>(3.5);
  readonly months = signal<number | null>(240);
  readonly start = signal<string | null>('2026-01-15');
  readonly view = signal<string | null>('total');
  readonly insured = signal(true);
  readonly views = [{ value: 'total', label: 'Cumul' }, { value: 'loan', label: 'Par prêt' }, { value: 'year', label: 'Par année' }];
}

const meta: Meta = {
  title: 'Forms/Text fields',
  decorators: [moduleMetadata({ imports: [FormsDemoComponent, LcFormFieldComponent, LcInputDirective] })],
  render: () => ({ template: '<lc-forms-demo />' }),
};
export default meta;
type Story = StoryObj;

export const Defaut: Story = {};

/** `hintPlacement="above"` : l'aide se lit entre le libellé et le contrôle (toujours reliée par `aria-describedby`). */
export const AideAuDessus: Story = {
  render: () => ({
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Nom du scénario" hint="Visible dans la barre de scénarios" hintPlacement="above">
          <input lcInput type="text" />
        </lc-form-field>
      </div>`,
  }),
};
