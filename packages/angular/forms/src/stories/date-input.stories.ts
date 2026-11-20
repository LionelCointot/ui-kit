import { Component, booleanAttribute, input, linkedSignal, signal } from '@angular/core';
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
  title: 'Forms/Date input',
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

const CALENDAR = applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] });

/** Champ avec son bouton calendrier et le panneau : la valeur ISO est affichée dessous pour la lire dans les stories. */
@Component({
  selector: 'lc-date-input-picker-demo',
  imports: [LcFormFieldComponent, LcDateInputComponent],
  template: `
    <div style="max-width:20rem;min-height:28rem">
      @if (labelled()) {
        <lc-form-field label="Date de début" [required]="required()">
          <lc-date-input [(value)]="date" [min]="min()" [max]="max()" />
        </lc-form-field>
      } @else {
        <lc-date-input ariaLabel="Date" [(value)]="date" [min]="min()" [max]="max()" [required]="required()" />
      }
      <p data-testid="value">Valeur : {{ date() ?? 'aucune' }}</p>
    </div>
  `,
})
class DateInputPickerDemoComponent {
  readonly initial = input<string | null>(null);
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);
  readonly required = input(false, { transform: booleanAttribute });
  readonly labelled = input(false, { transform: booleanAttribute });
  protected readonly date = linkedSignal(() => this.initial());
}

const picker = (attributes = '') => ({ template: `<lc-date-input-picker-demo ${attributes} />` });
const body = () => within(document.body);
const openedPanel = () => body().findByRole('dialog');
const closed = () => waitFor(() => expect(document.querySelector('lc-calendar-panel')).toBeNull());

/** Navigateur réel : le clic sur le bouton ouvre le panneau ; un jour choisi met la valeur et le texte à jour, ferme, et rend le focus au bouton. */
export const CalendrierVide: Story = {
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Choisir une date' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    const panel = await openedPanel();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(panel.getBoundingClientRect().width).toBe(304); // largeur propre au panneau, pas celle du champ
    await userEvent.click(panel.querySelector('td[data-date$="-15"]')!);
    await closed();
    const input = canvas.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toMatch(/^15\/\d\d\/\d{4}$/);
    expect(canvas.getByTestId('value')).toHaveTextContent(/Valeur : \d{4}-\d\d-15/);
    await waitFor(() => expect(canvas.getByRole('button', { name: /^Changer la date, 15 / })).toHaveFocus());
  },
};

/** Navigateur réel : avec valeur le bouton se nomme « Changer la date, … » ; Échap ferme sans rien changer et rend le focus au bouton ; Alt + flèche bas rouvre. */
export const CalendrierAvecValeur: Story = {
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('initial="2026-11-12"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Changer la date, 12 novembre 2026' });
    await userEvent.click(button);
    const panel = await openedPanel();
    await waitFor(() => expect(within(panel).getByRole('gridcell', { name: 'jeudi 12 novembre 2026' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(canvas.getByTestId('value')).toHaveTextContent('Valeur : 2026-11-12');
    await waitFor(() => expect(button).toHaveFocus());
    await userEvent.click(canvas.getByRole('textbox'));
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await openedPanel();
  },
};

/** Navigateur réel : hors des bornes (10 au 25 novembre 2026) un jour est désactivé et ne se choisit pas ; dans les bornes il se choisit. */
export const CalendrierAvecBornes: Story = {
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('initial="2026-11-12" min="2026-11-10" max="2026-11-25"'),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Changer la date/ }));
    const panel = await openedPanel();
    const outside = panel.querySelector('td[data-date="2026-11-28"]')!;
    expect(outside).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(outside);
    expect(document.querySelector('lc-calendar-panel')).not.toBeNull();
    await userEvent.click(panel.querySelector('td[data-date="2026-11-24"]')!);
    await closed();
    expect(within(canvasElement).getByTestId('value')).toHaveTextContent('Valeur : 2026-11-24');
  },
};

/** Navigateur réel : champ obligatoire, le panneau n'a pas « Effacer la date ». */
export const CalendrierObligatoire: Story = {
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('required'),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Choisir une date' }));
    const panel = await openedPanel();
    expect(within(panel).getByRole('button', { name: "Aujourd'hui" })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Effacer la date' })).toBeNull();
  },
};

/** Navigateur réel : dans un `lc-form-field`, Alt + flèche bas dans le champ ouvre le panneau, « Effacer la date » vide et rend le focus au bouton. */
export const CalendrierDansUnChampDeFormulaire: Story = {
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('labelled initial="2026-11-12"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('textbox', { name: /Date de début/ }));
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    const panel = await openedPanel();
    await userEvent.click(within(panel).getByRole('button', { name: 'Effacer la date' }));
    await closed();
    expect(canvas.getByTestId('value')).toHaveTextContent('Valeur : aucune');
    expect((canvas.getByRole('textbox') as HTMLInputElement).value).toBe('jj/mm/aaaa');
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Choisir une date' })).toHaveFocus());
  },
};

/** Navigateur réel : le jour choisi est aussi aujourd'hui et porte le focus clavier ; le point d'aujourd'hui reste à l'intérieur du disque, sans le toucher. */
export const CalendrierAujourdhuiChoisiFocus: Story = {
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return picker(`initial="${today}"`);
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Changer la date/ }));
    const panel = await openedPanel();
    const day = await waitFor(() => {
      const cell = panel.querySelector<HTMLElement>('td[aria-selected="true"][aria-current="date"]');
      expect(cell).toHaveFocus();
      return cell!;
    });
    const dot = getComputedStyle(day, '::after');
    const disc = getComputedStyle(day, '::before');
    // Le disque est inscrit avec une marge ; le point est posé plus haut que son bord bas, donc à l'intérieur.
    expect(parseFloat(dot.bottom)).toBeGreaterThan(parseFloat(disc.bottom) + 1);
    expect(parseFloat(dot.bottom) + parseFloat(dot.height)).toBeLessThan(day.getBoundingClientRect().height / 2);
  },
};

/** Navigateur réel, fenêtre de 400 px de haut : le panneau reste dans la fenêtre, son corps défile et « Aujourd'hui » se clique. */
export const CalendrierFenetreBasse: Story = {
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('initial="2026-11-12"'),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 400);
    try {
      await waitFor(() => expect(window.innerHeight).toBe(400));
      await userEvent.click(within(canvasElement).getByRole('button', { name: /^Changer la date/ }));
      const panel = await openedPanel();
      await waitFor(() => expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(400));
      expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
      const today = within(panel).getByRole('button', { name: "Aujourd'hui" });
      expect(today.getBoundingClientRect().bottom).toBeLessThanOrEqual(400);
      await userEvent.click(today);
      await waitFor(() => expect(document.querySelector('lc-calendar-panel')).toBeNull());
      expect(within(canvasElement).getByTestId('value')).not.toHaveTextContent('2026-11-12');
    } finally {
      await page.viewport(1280, 720);
    }
  },
};

/** États du champ en mode calendrier : vide, avec valeur, invalide, désactivé, lecture seule (ces deux derniers sans bouton). */
export const CalendrierEtats: Story = {
  decorators: [moduleMetadata({ imports: [LcDateInputComponent] }), CALENDAR],
  render: () => ({
    template: `
      <div style="display:grid;gap:16px;max-width:20rem">
        <lc-date-input ariaLabel="Vide" />
        <lc-date-input ariaLabel="Avec valeur" value="2026-11-12" />
        <lc-date-input ariaLabel="Invalide" invalid touched />
        <lc-date-input ariaLabel="Désactivé" value="2026-11-12" disabled />
        <lc-date-input ariaLabel="Lecture seule" value="2026-11-12" readonly />
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole('button')).toHaveLength(3); // ni le champ désactivé ni celui en lecture seule n'ont de bouton
    const field = canvas.getByRole('textbox', { name: 'Avec valeur' });
    const button = canvas.getByRole('button', { name: /^Changer la date/ });
    expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(field.getBoundingClientRect().height - 2); // cible = hauteur du champ
    expect(canvas.getByRole('textbox', { name: 'Invalide' })).toHaveAttribute('aria-invalid', 'true');
  },
};

/** Mode natif forcé : `input[type=date]` du navigateur. */
export const ModeNatif: Story = {
  decorators: [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'native' }] })],
};
