import { Component, booleanAttribute, input, linkedSignal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
// Le projet Vitest « storybook » ne charge pas les feuilles globales d'angular.json : on les charge ici pour mesurer le vrai rendu.
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import type { LcDateInterval } from '../date-input/date-interval';
import { LcDateRangeInputComponent } from '../date-input/date-range-input.component';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';

/** Champ de période posé dans la page ; la valeur est affichée dessous pour la lire dans les stories. */
@Component({
  selector: 'lc-date-range-input-demo',
  imports: [LcFormFieldComponent, LcDateRangeInputComponent],
  template: `
    <div style="max-width:32rem;min-height:36rem">
      @if (labelled()) {
        <lc-form-field label="Séjour" [required]="required()">
          <lc-date-range-input [(value)]="range" [min]="min()" [max]="max()" [required]="required()" />
        </lc-form-field>
      } @else {
        <lc-date-range-input [(value)]="range" [min]="min()" [max]="max()" [required]="required()" [presets]="noPresets() ? [] : undefined" [disabled]="disabled()" />
      }
      <p data-testid="value">Valeur : {{ range().from ?? '…' }} / {{ range().to ?? '…' }}</p>
    </div>
  `,
})
class DateRangeInputDemoComponent {
  readonly initial = input<LcDateInterval>({ from: null, to: null });
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);
  readonly required = input(false, { transform: booleanAttribute });
  readonly labelled = input(false, { transform: booleanAttribute });
  readonly noPresets = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  protected readonly range = linkedSignal(() => this.initial());
}

@Component({
  selector: 'lc-date-range-input-form-demo',
  imports: [FormField, LcFormFieldComponent, LcDateRangeInputComponent],
  template: `
    <div style="max-width:32rem;min-height:36rem">
      <lc-form-field label="Séjour"><lc-date-range-input [formField]="f.stay" /></lc-form-field>
      <p data-testid="value">Valeur : {{ model().stay.from ?? '…' }} / {{ model().stay.to ?? '…' }}</p>
    </div>
  `,
})
class DateRangeInputFormDemoComponent {
  protected readonly model = linkedSignal<{ stay: LcDateInterval }>(() => ({ stay: { from: null, to: null } }));
  protected readonly f = form(this.model);
}

const meta: Meta = {
  title: 'Forms/Date range input',
  decorators: [moduleMetadata({ imports: [DateRangeInputDemoComponent, DateRangeInputFormDemoComponent] })],
};
export default meta;
type Story = StoryObj;

const CALENDAR = applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] });
const NATIVE = applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'native' }] });
const demo = (attributes = '') => ({ template: `<lc-date-range-input-demo ${attributes} />` });
const body = () => within(document.body);
const openedPanel = () => body().findByRole('dialog');
const closed = () => waitFor(() => expect(document.querySelector('lc-calendar-panel')).toBeNull());
const value = (canvas: ReturnType<typeof within>) => canvas.getByTestId('value');

/** Champ fermé, vide (sans interaction : sert aux captures). */
export const ChampVide: Story = {
  decorators: [CALENDAR],
  render: () => demo(),
};

/** Navigateur réel à 1280 px : deux mois, raccourcis en colonne ; début puis fin mettent la valeur et les champs à jour, ferment, et rendent le focus au bouton. */
export const Vide: Story = {
  decorators: [CALENDAR],
  render: () => demo(),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 900);
    await waitFor(() => expect(window.innerWidth).toBe(1280));
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Choisir une période' });
    expect(canvas.getByRole('group', { name: 'Période' })).toBeTruthy();
    await userEvent.click(button);
    const panel = await openedPanel();
    await waitFor(() => expect(panel.querySelectorAll('.lc-calendar__month')).toHaveLength(2));
    expect(panel.querySelector('.lc-calendar__layout--column')).not.toBeNull();
    expect(panel.getBoundingClientRect().width).toBeGreaterThan(780);
    await userEvent.click(panel.querySelector('td[data-date$="-10"]')!);
    expect(within(panel).getByRole('status')).toHaveTextContent(/^Début : 10 /);
    await userEvent.click(panel.querySelector('td[data-date$="-18"]')!);
    await closed();
    const [from, to] = canvas.getAllByRole('textbox') as HTMLInputElement[];
    expect(from.value).toMatch(/^10\/\d\d\/\d{4}$/);
    expect(to.value).toMatch(/^18\/\d\d\/\d{4}$/);
    expect(value(canvas)).toHaveTextContent(/Valeur : \d{4}-\d\d-10 \/ \d{4}-\d\d-18/);
    await waitFor(() => expect(canvas.getByRole('button', { name: /^Changer la période, du 10 au 18 / })).toHaveFocus());
  },
};

/** Navigateur réel : à 600 px un seul mois, raccourcis en grille. */
export const UnSeulMoisA600: Story = {
  decorators: [CALENDAR],
  render: () => demo(),
  play: async ({ canvasElement }) => {
    await page.viewport(600, 900);
    try {
      await waitFor(() => expect(window.innerWidth).toBe(600));
      await userEvent.click(within(canvasElement).getByRole('button', { name: 'Choisir une période' }));
      const panel = await openedPanel();
      await waitFor(() => expect(panel.querySelectorAll('.lc-calendar__month')).toHaveLength(1));
      expect(panel.querySelector('.lc-calendar__layout--column')).toBeNull();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    } finally {
      await page.viewport(1280, 720);
    }
  },
};

/** Navigateur réel : un raccourci pose les deux bornes, ferme et rend le focus au bouton. */
export const Raccourci: Story = {
  decorators: [CALENDAR],
  render: () => demo(),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 900);
    await waitFor(() => expect(window.innerWidth).toBe(1280));
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Choisir une période' }));
    const panel = await openedPanel();
    await userEvent.click(within(panel).getByRole('button', { name: /^Ce mois-ci/ }));
    await closed();
    expect(value(canvas)).toHaveTextContent(/Valeur : \d{4}-\d\d-01 \/ \d{4}-\d\d-(28|29|30|31)/);
    await waitFor(() => expect(canvas.getByRole('button', { name: /^Changer la période, du 1 au / })).toHaveFocus());
  },
};

/** Navigateur réel : une seule borne, la ligne explicative ; « Sans date de fin » valide le début seul. */
export const SansDateDeFin: Story = {
  decorators: [CALENDAR],
  render: () => demo(),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 900);
    await waitFor(() => expect(window.innerWidth).toBe(1280));
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Choisir une période' }));
    const panel = await openedPanel();
    await userEvent.click(panel.querySelector('td[data-date$="-05"]')!);
    await userEvent.click(within(panel).getByRole('button', { name: 'Sans date de fin' }));
    await closed();
    expect(value(canvas)).toHaveTextContent(/Valeur : \d{4}-\d\d-05 \/ …/);
    expect(canvas.getByText(/^Sans date de fin : tout depuis le 5 /)).toBeTruthy();
    expect(canvas.getByRole('button', { name: /^Changer la période, à partir du 5 / })).toBeTruthy();
  },
};

export const PeriodeChoisie: Story = {
  decorators: [CALENDAR],
  render: () => demo('[initial]="{ from: \'2026-11-03\', to: \'2026-11-12\' }"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [from, to] = canvas.getAllByRole('textbox') as HTMLInputElement[];
    expect([from.value, to.value]).toEqual(['03/11/2026', '12/11/2026']);
    expect(canvas.getByRole('button', { name: 'Changer la période, du 3 au 12 novembre 2026' })).toBeTruthy();
  },
};

export const UneSeuleBorne: Story = {
  decorators: [CALENDAR],
  render: () => demo('[initial]="{ from: \'2026-11-01\', to: null }"'),
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByText('Sans date de fin : tout depuis le 1 novembre 2026.')).toBeTruthy();
  },
};

/** Navigateur réel : une fin tapée avant le début vaut null, le cadre de la fin est invalide et le message est sous le groupe. */
export const FinAvantDebut: Story = {
  decorators: [CALENDAR],
  render: () => demo('[initial]="{ from: \'2026-11-10\', to: null }"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const to = canvas.getAllByRole('textbox')[1] as HTMLInputElement;
    await userEvent.click(to);
    await userEvent.keyboard('05112026');
    expect(canvas.getByText('La date de fin est avant la date de début.')).toBeTruthy();
    expect(value(canvas)).toHaveTextContent('Valeur : 2026-11-10 / …');
    expect(to.closest('lc-date-input')).toHaveClass('lc-field--invalid');
  },
};

export const AvecBornes: Story = {
  decorators: [CALENDAR],
  render: () => demo('min="2026-11-15" max="2026-11-30" [initial]="{ from: \'2026-11-17\', to: \'2026-11-19\' }"'),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 900);
    await waitFor(() => expect(window.innerWidth).toBe(1280));
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Changer la période/ }));
    const panel = await openedPanel();
    expect(within(panel).getByRole('button', { name: /^Le mois dernier/ })).toBeDisabled();
    expect(panel.querySelector('td[data-date="2026-11-10"]')).toHaveAttribute('aria-disabled', 'true');
  },
};

export const Obligatoire: Story = {
  decorators: [CALENDAR],
  render: () => demo('required labelled'),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Choisir une période' }));
    const panel = await openedPanel();
    expect(within(panel).queryByRole('button', { name: 'Effacer la période' })).toBeNull();
  },
};

export const SansRaccourcis: Story = {
  decorators: [CALENDAR],
  render: () => demo('noPresets'),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Choisir une période' }));
    const panel = await openedPanel();
    expect(panel.querySelector('.lc-calendar__presets')).toBeNull();
  },
};

export const Desactive: Story = {
  decorators: [CALENDAR],
  render: () => demo('disabled [initial]="{ from: \'2026-11-03\', to: \'2026-11-12\' }"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByRole('button')).toBeNull();
    for (const input of canvas.getAllByRole('textbox')) expect(input).toBeDisabled();
  },
};

/** Dans `lc-form-field` avec `[formField]` : la fin avant le début est une erreur de formulaire que le champ affiche. */
export const DansUnChampDeFormulaire: Story = {
  decorators: [CALENDAR],
  render: () => ({ template: '<lc-date-range-input-form-demo />' }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [from, to] = canvas.getAllByRole('textbox') as HTMLInputElement[];
    await userEvent.click(from);
    await userEvent.keyboard('10112026');
    await userEvent.click(to);
    await userEvent.keyboard('05112026');
    await userEvent.tab();
    await userEvent.tab();
    await waitFor(() => expect(canvas.getByText('La date de fin est avant la date de début.')).toBeTruthy());
    expect(value(canvas)).toHaveTextContent('Valeur : 2026-11-10 / …');
  },
};

/** Mode natif (tactile) : deux champs de date bornés l'un par l'autre, raccourcis en rangée, pas de bouton. */
export const ModeNatif: Story = {
  decorators: [NATIVE],
  render: () => demo('[initial]="{ from: \'2026-11-03\', to: \'2026-11-12\' }"'),
  play: async ({ canvasElement }) => {
    const [from, to] = [...canvasElement.querySelectorAll<HTMLInputElement>('input[type=date]')];
    expect(from).toHaveAttribute('max', '2026-11-12');
    expect(to).toHaveAttribute('min', '2026-11-03');
    expect(within(canvasElement).queryByRole('button', { name: /période/i })).toBeNull();
    const row = within(canvasElement).getByRole('group', { name: 'Raccourcis' });
    await userEvent.click(within(row).getByRole('button', { name: /^Ce mois-ci/ }));
    await waitFor(() => expect(value(within(canvasElement))).toHaveTextContent(/-01 \/ \d{4}-\d\d-(28|29|30|31)/));
  },
};
