import { Component, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, within } from 'storybook/test';
// Le projet Vitest « storybook » ne charge pas les feuilles globales d'angular.json : on les charge ici pour calculer les vraies couleurs.
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { LcDateInputComponent } from '../date-input/date-input.component';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';

// Preuves en navigateur réel des critères CA-4, CA-5, CA-6 (champ à zones) : sélection réelle et rendu calculé.

@Component({
  selector: 'lc-date-input-acceptance',
  imports: [LcDateInputComponent],
  template: `<div style="max-width:20rem"><lc-date-input ariaLabel="Date" [(value)]="value" /></div><p data-testid="value">{{ value() ?? 'null' }}</p>`,
})
class AcceptanceComponent {
  readonly value = signal<string | null>(null);
}

const meta: Meta = {
  title: 'Formulaires/Champ de date/Acceptation',
  tags: ['!autodocs'],
  decorators: [
    moduleMetadata({ imports: [AcceptanceComponent] }),
    applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }),
  ],
  render: () => ({ template: '<lc-date-input-acceptance />' }),
};
export default meta;
type Story = StoryObj;

const field = (canvasElement: HTMLElement) => within(canvasElement).getByRole('textbox') as HTMLInputElement;
const selection = (input: HTMLInputElement) => input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);

/** CA-4 (navigateur) : un clic sélectionne une zone, la frappe au clavier remplit les trois. */
export const ClicEtFrappe: Story = {
  play: async ({ canvasElement }) => {
    const input = field(canvasElement);
    await userEvent.click(input);
    expect(input).toHaveFocus();
    expect(selection(input)).not.toBe('');
    await userEvent.keyboard('12112026');
    expect(input.value).toBe('12/11/2026');
    expect(within(canvasElement).getByTestId('value')).toHaveTextContent('2026-11-12');
  },
};

/** CA-5 (navigateur) : flèches haut et bas changent la zone active, gauche et droite changent de zone. */
export const Fleches: Story = {
  play: async ({ canvasElement }) => {
    const input = field(canvasElement);
    await userEvent.click(input);
    await userEvent.keyboard('12112026');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(selection(input)).toBe('12');
    await userEvent.keyboard('{ArrowUp}');
    expect(input.value).toBe('13/11/2026');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(input.value).toBe('11/11/2026');
    await userEvent.keyboard('{ArrowRight}{ArrowDown}');
    expect(input.value).toBe('11/10/2026');
  },
};

/** CA-6 (navigateur) : 31, 02, 2026 donne 28/02/2026 sans message d'erreur. */
export const JourImpossible: Story = {
  play: async ({ canvasElement }) => {
    const input = field(canvasElement);
    await userEvent.click(input);
    await userEvent.keyboard('31022026');
    expect(input.value).toBe('28/02/2026');
    expect(input).not.toHaveAttribute('aria-invalid');
    await userEvent.tab();
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(canvasElement.textContent).not.toMatch(/Date incomplète|Date non reconnue/);
  },
};

/** Rendu (navigateur) : la zone active a un fond de sélection calculé différent du fond du champ. */
export const FondDeLaZone: Story = {
  play: async ({ canvasElement }) => {
    const input = field(canvasElement);
    await userEvent.click(input);
    const zone = getComputedStyle(input, '::selection').backgroundColor;
    const frame = getComputedStyle(input.closest('lc-date-input')!).backgroundColor;
    expect(zone).not.toBe('');
    expect(zone).not.toBe(frame);
    expect(zone).not.toBe('rgba(0, 0, 0, 0)');
  },
};

@Component({
  selector: 'lc-date-input-states',
  imports: [LcDateInputComponent],
  template: `<div style="display:grid;gap:24px;max-width:20rem">
    <lc-date-input ariaLabel="Désactivé" [value]="'2026-11-12'" disabled />
    <lc-date-input ariaLabel="Lecture seule" [value]="'2026-11-12'" readonly />
  </div>`,
})
class StatesComponent {}

@Component({
  selector: 'lc-date-input-below',
  imports: [LcDateInputComponent],
  template: `<div style="max-width:20rem"><lc-date-input ariaLabel="Date" />
    <button type="button" style="display:block;margin-block-start:4px;inline-size:100%;min-block-size:40px">Élément placé juste sous le champ</button></div>`,
})
class BelowComponent {}

/** Captures : désactivé et lecture seule (aucun bouton, zones non modifiables). */
export const Etats: Story = {
  decorators: [moduleMetadata({ imports: [StatesComponent] })],
  render: () => ({ template: '<lc-date-input-states />' }),
};

/** Captures : hors formulaire, le message sous le cadre face à un élément placé juste dessous. */
export const ContenuSuivant: Story = {
  decorators: [moduleMetadata({ imports: [BelowComponent] })],
  render: () => ({ template: '<lc-date-input-below />' }),
};

/** Captures : champ vide, sans scénario joué. */
export const ChampVide: Story = {};
