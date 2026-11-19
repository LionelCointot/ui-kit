import { Component, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, within } from 'storybook/test';
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
      <button type="button" (mousedown)="$event.preventDefault()" (click)="end.set('2026-03-05')">Poser le 5 mars 2026</button>
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

/** Navigateur réel : la zone active est sélectionnée après chaque frappe de 1, 2, 1, 1, 2, 0, 2, 6, puis après une valeur posée par le code pendant le focus. */
export const ZoneActiveSelectionnee: Story = {
  decorators: [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: /Date de fin/ }) as HTMLInputElement;
    const selection = () => input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
    await userEvent.click(input);
    expect(selection()).toBe('jj');
    const expected = ['01', 'mm', '01', 'aaaa', '2', '20', '202', '2026'];
    for (const [index, digit] of [...'12112026'].entries()) {
      await userEvent.keyboard(digit);
      expect(selection(), `après « ${digit} »`).toBe(expected[index]);
    }
    expect(input.value).toBe('12/11/2026');
    await userEvent.click(canvas.getByRole('button', { name: 'Poser le 5 mars 2026' }));
    expect(input).toHaveFocus();
    expect(input.value).toBe('05/03/2026');
    expect(selection()).toBe('2026'); // la zone active (l'année) reste sélectionnée
  },
};

/** Mode natif forcé : `input[type=date]` du navigateur. */
export const ModeNatif: Story = {
  decorators: [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'native' }] })],
};
