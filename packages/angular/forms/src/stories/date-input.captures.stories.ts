import { Component, input } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcDateInputComponent } from '../date-input/date-input.component';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';

// Stories sans scénario, pour les captures du designer et du test novice (Playwright pilote la page).

@Component({
  selector: 'lc-date-input-capture',
  imports: [LcFormFieldComponent, LcDateInputComponent],
  template: `<div style="max-width:20rem;min-height:30rem;display:grid;gap:24px;align-content:start">
    <lc-form-field label="Date de début"><lc-date-input [value]="initial()" [min]="min()" [max]="max()" /></lc-form-field>
    @if (states()) {
      <lc-form-field label="Désactivé"><lc-date-input value="2026-11-12" disabled /></lc-form-field>
      <lc-form-field label="Lecture seule"><lc-date-input value="2026-11-12" readonly /></lc-form-field>
    }
    <button type="button" id="elsewhere" style="justify-self:start">Autre contrôle</button>
  </div>`,
})
class CaptureComponent {
  readonly initial = input<string | null>(null);
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);
  readonly states = input(false);
}

const meta: Meta = {
  title: 'Formulaires/Champ de date/Captures',
  tags: ['!autodocs'],
  decorators: [
    moduleMetadata({ imports: [CaptureComponent] }),
    applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }),
  ],
  render: (args) => ({ props: args, template: '<lc-date-input-capture [initial]="initial" [min]="min" [max]="max" [states]="states" />' }),
};
export default meta;
type Story = StoryObj;

export const Vide: Story = {};
export const AvecValeur: Story = { args: { initial: '2026-11-12' } };
export const AvecBornes: Story = { args: { initial: '2026-11-12', min: '2026-11-10', max: '2026-11-25' } };
export const Etats: Story = { args: { states: true } };
