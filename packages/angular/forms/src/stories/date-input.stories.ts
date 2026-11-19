import { Component, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcDateInputComponent } from '../date-input/date-input.component';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';

@Component({
  selector: 'lc-date-input-demo',
  imports: [LcFormFieldComponent, LcDateInputComponent],
  template: `
    <div style="display:grid;gap:24px;max-width:20rem">
      <lc-form-field label="Date de début"><lc-date-input [(value)]="start" /></lc-form-field>
      <lc-form-field label="Date de fin (obligatoire)" required><lc-date-input [(value)]="end" /></lc-form-field>
      <lc-form-field label="Lecture seule"><lc-date-input [value]="'2026-11-12'" readonly /></lc-form-field>
      <p>Valeur : {{ start() ?? 'aucune' }}</p>
    </div>
  `,
})
class DateInputDemoComponent {
  readonly start = signal<string | null>('2026-11-12');
  readonly end = signal<string | null>(null);
}

const meta: Meta = {
  title: 'Formulaires/Champ de date',
  decorators: [moduleMetadata({ imports: [DateInputDemoComponent] })],
  render: () => ({ template: '<lc-date-input-demo />' }),
};
export default meta;
type Story = StoryObj;

/** Mode calendrier forcé : champ à zones jj/mm/aaaa (chiffres, flèches haut et bas, collage). Un jour impossible ne se saisit pas. */
export const ModeCalendrier: Story = {
  decorators: [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
};

/** Mode natif forcé : `input[type=date]` du navigateur. */
export const ModeNatif: Story = {
  decorators: [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'native' }] })],
};
