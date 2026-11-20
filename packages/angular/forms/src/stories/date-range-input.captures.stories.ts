import { Component, input } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import type { LcDateInterval } from '../date-input/date-interval';
import { LC_DATE_PICKER, type LcDatePickerMode } from '../date-input/date-picker-mode';
import { LcDateRangeInputComponent } from '../date-input/date-range-input.component';

// Stories sans scénario, pour les captures du designer et du test novice (Playwright pilote la page).

@Component({
  selector: 'lc-date-range-capture',
  imports: [LcFormFieldComponent, LcDateRangeInputComponent],
  template: `<div style="max-width:36rem;min-height:36rem">
    <lc-form-field label="Période"><lc-date-range-input [value]="initial()" [min]="min()" [max]="max()" /></lc-form-field>
  </div>`,
})
class CaptureComponent {
  readonly initial = input<LcDateInterval>({ from: null, to: null });
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);
}

const meta: Meta = {
  title: 'Formulaires/Champ de période/Captures',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [CaptureComponent] })],
  args: { initial: { from: null, to: null } },
  render: (args) => ({ props: args, template: '<lc-date-range-capture [initial]="initial" [min]="min" [max]="max" />' }),
};
export default meta;
type Story = StoryObj;
const withMode = (mode: LcDatePickerMode) => [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: mode }] })];

export const Vide: Story = { decorators: withMode('calendar') };
export const AvecValeur: Story = { decorators: withMode('calendar'), args: { initial: { from: '2026-11-12', to: '2026-11-20' } } };
export const AvecBornes: Story = { decorators: withMode('calendar'), args: { initial: { from: '2026-11-18', to: null }, min: '2026-11-10', max: '2026-11-25' } };
export const Natif: Story = { decorators: withMode('native'), args: { initial: { from: '2026-11-12', to: null } } };
