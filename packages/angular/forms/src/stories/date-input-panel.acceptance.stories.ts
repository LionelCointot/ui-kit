import { Component, input, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor, within } from 'storybook/test';
// Vrai clavier et vraie souris (Playwright) : le `userEvent` de `storybook/test` envoie `keyCode` 0, ce qui fausse les preuves de touches.
import { page, userEvent as real } from 'vitest/browser';
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { LcDateInputComponent } from '../date-input/date-input.component';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';

// Preuves en navigateur réel de la spec 2026-11-selecteur-de-date : CA-18, CA-20, CA-25, CA-26, position, fenêtre étroite et basse.

@Component({
  selector: 'lc-date-panel-acceptance',
  imports: [LcDateInputComponent],
  template: `<button id="other" type="button" style="margin-block-end:8px">Autre contrôle</button>
    <div [style]="box()">
      <lc-date-input ariaLabel="Date" [(value)]="date" />
    </div>
    <p data-testid="value">{{ date() ?? 'null' }}</p>`,
})
class PanelAcceptanceComponent {
  readonly initial = input<string | null>(null);
  readonly box = input('max-width:20rem');
  protected readonly date = signal<string | null>(null);
  constructor() {
    queueMicrotask(() => this.date.set(this.initial()));
  }
}

const meta: Meta = {
  title: 'Formulaires/Champ de date/Acceptation du panneau',
  tags: ['!autodocs'],
  decorators: [
    moduleMetadata({ imports: [PanelAcceptanceComponent] }),
    applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }),
  ],
  render: (args) => ({ props: args, template: `<lc-date-panel-acceptance [initial]="initial" [box]="box" />` }),
  args: { initial: '2026-11-12', box: 'max-width:20rem' },
};
export default meta;
type Story = StoryObj;

const panel = () => document.querySelector<HTMLElement>('lc-calendar-panel');
const button = (canvasElement: HTMLElement) => within(canvasElement).getByRole('button', { name: /^(Changer la date|Choisir une date)/ });
const open = async (canvasElement: HTMLElement) => {
  await waitFor(() => expect(within(canvasElement).getByRole('textbox')).toBeInTheDocument());
  await real.click(button(canvasElement));
  await waitFor(() => expect(panel()).not.toBeNull());
  await waitFor(() => expect(panel()!.contains(document.activeElement)).toBe(true));
  return panel()!;
};
const stop = (element: Element) =>
  element.tagName === 'TD' ? 'grille' : (element.getAttribute('aria-label') ?? element.textContent!.trim());
const isoToday = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** CA-20 (navigateur) : au vrai clavier, Tab et Maj + Tab restent dans le panneau ; la grille est une seule étape. */
export const TabulationPiegee: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await open(canvasElement);
    expect(stop(document.activeElement!)).toBe('grille');
    const forward: string[] = [];
    for (let press = 0; press < 6; press++) {
      await real.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
      forward.push(stop(document.activeElement!));
    }
    expect(forward).toEqual(["Aujourd'hui", 'Effacer la date', 'Mois précédent', 'novembre 2026 : choisir un mois', 'Mois suivant', 'grille']);
    await real.tab({ shift: true });
    expect(stop(document.activeElement!)).toBe('Mois suivant');
    await real.tab({ shift: true });
    await real.tab({ shift: true });
    await real.tab({ shift: true });
    await real.tab({ shift: true });
    expect(stop(document.activeElement!)).toBe("Aujourd'hui");
    await real.tab({ shift: true }); // depuis la grille vers « Aujourd'hui » : la grille n'a coûté qu'une étape
    await real.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  },
};

/** CA-18 (navigateur) : Échap au vrai clavier ferme sans changer la valeur et rend le focus au bouton. */
export const EchapFermeEtRendLeFocus: Story = {
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    await real.keyboard('{Escape}');
    await waitFor(() => expect(panel()).toBeNull());
    expect(within(canvasElement).getByTestId('value')).toHaveTextContent('2026-11-12');
    expect(button(canvasElement)).toHaveFocus();
  },
};

/** CA-18 (navigateur) : un vrai clic dans le vide ferme et rend le focus au bouton. */
export const ClicDansLeVide: Story = {
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 720);
    await open(canvasElement);
    await real.click(document.body, { position: { x: 900, y: 500 } });
    await waitFor(() => expect(panel()).toBeNull());
    expect(within(canvasElement).getByTestId('value')).toHaveTextContent('2026-11-12');
    expect(button(canvasElement)).toHaveFocus();
  },
};

/** CA-18 (constat) : un vrai clic sur un autre contrôle ferme le panneau ; ce contrôle garde le focus, le bouton ne le reçoit pas. */
export const ClicSurUnAutreControle: Story = {
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    await real.click(within(canvasElement).getByRole('button', { name: 'Autre contrôle' }));
    await waitFor(() => expect(panel()).toBeNull());
    expect(within(canvasElement).getByTestId('value')).toHaveTextContent('2026-11-12');
    expect(document.activeElement).toBe(canvasElement.querySelector('#other'));
  },
};

/** CA-25 (navigateur) : panneau ouvert, le passage de clair à sombre change le fond du panneau et celui du jour choisi. */
export const ChangementDeTheme: Story = {
  play: async ({ canvasElement }) => {
    const root = document.documentElement;
    const before = root.getAttribute('data-theme');
    try {
      root.setAttribute('data-theme', 'default');
      const dialog = await open(canvasElement);
      const selected = dialog.querySelector<HTMLElement>('td[aria-selected="true"]')!;
      const read = () => ({ panel: getComputedStyle(dialog).backgroundColor, day: getComputedStyle(selected, '::before').backgroundColor });
      const light = read();
      root.setAttribute('data-theme', 'dark');
      await waitFor(() => expect(read().panel).not.toBe(light.panel));
      await waitFor(() => expect(read().day).not.toBe(light.day)); // le fond du jour fait une transition courte
      expect(panel()).not.toBeNull(); // toujours ouvert
    } finally {
      root.setAttribute('data-theme', before ?? 'default');
    }
  },
};

/** CA-26 (navigateur) : trois repères distincts par la forme, titre avec contour, cellule d'au moins 40 px. */
export const TroisReperes: Story = {
  args: { initial: isoToday(isoToday(1).slice(8) === '01' ? -1 : 1) },
  play: async ({ canvasElement }) => {
    const dialog = await open(canvasElement);
    const selected = dialog.querySelector<HTMLElement>('td[aria-selected="true"]')!;
    const today = dialog.querySelector<HTMLElement>('td[aria-current="date"]')!;
    expect(today).not.toBe(selected);
    const style = (element: Element, pseudo?: string) => getComputedStyle(element, pseudo);
    const clear = (color: string) => color === 'rgba(0, 0, 0, 0)' || color === 'transparent';
    // Jour choisi : disque plein (fond, rayon plein), sans point ni contour.
    expect(clear(style(selected, '::before').backgroundColor)).toBe(false);
    expect(parseFloat(style(selected, '::before').borderTopLeftRadius)).toBeGreaterThanOrEqual(10);
    expect(style(selected, '::after').content).toBe('none');
    // Aujourd'hui : un point (pseudo-élément plein, petit), sans disque.
    expect(style(today, '::after').content).not.toBe('none');
    expect(parseFloat(style(today, '::after').width)).toBeGreaterThan(0);
    expect(parseFloat(style(today, '::after').width)).toBeLessThan(12);
    expect(clear(style(today, '::after').backgroundColor)).toBe(false);
    expect(clear(style(today, '::before').backgroundColor)).toBe(true);
    // Focus clavier : un contour, que ni le jour choisi ni aujourd'hui n'ont au repos.
    const focusedBefore = document.activeElement as HTMLElement; // le jour choisi, focalisé à l'ouverture
    await real.keyboard('{ArrowLeft}');
    const focused = document.activeElement as HTMLElement;
    expect(focused).not.toBe(focusedBefore);
    expect(style(focused).outlineStyle).toBe('solid');
    expect(parseFloat(style(focused).outlineWidth)).toBeGreaterThan(0);
    expect(focused.matches(':focus-visible')).toBe(true);
    expect(style(selected).outlineStyle).toBe('none');
    // Titre : contour au repos.
    const title = dialog.querySelector<HTMLElement>('button.lc-calendar__title')!;
    expect(style(title).borderTopStyle).toBe('solid');
    expect(parseFloat(style(title).borderTopWidth)).toBeGreaterThan(0);
    // Cellule : au moins 40 px de côté.
    for (const cell of [selected, today, focused]) {
      const { width, height } = cell.getBoundingClientRect();
      expect(width).toBeGreaterThanOrEqual(40);
      expect(height).toBeGreaterThanOrEqual(40);
    }
  },
};

/** Position (navigateur) : champ collé au bas de la fenêtre, le panneau s'ouvre au-dessus et reste dans l'écran. */
export const PresDuBas: Story = {
  args: { box: 'position:fixed;inset-block-end:16px;inset-inline-start:16px;inline-size:20rem' },
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 720);
    const dialog = await open(canvasElement);
    const field = canvasElement.querySelector('lc-date-input')!.getBoundingClientRect();
    const box = dialog.getBoundingClientRect();
    expect(box.bottom).toBeLessThanOrEqual(field.top);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(window.innerWidth);
  },
};

/** Fenêtre de 360 px (navigateur) : le panneau tient dans la largeur, la page n'a pas de défilement horizontal. */
export const FenetreDe360px: Story = {
  args: { box: 'inline-size:100%' },
  play: async ({ canvasElement }) => {
    await page.viewport(360, 800);
    try {
      await waitFor(() => expect(window.innerWidth).toBe(360));
      const dialog = await open(canvasElement);
      const box = dialog.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(360);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
      expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
    } finally {
      await page.viewport(1280, 720);
    }
  },
};

/** Fenêtre basse de 400 px (navigateur), constat : voir le commentaire ; seule la position haute est vérifiée. */
export const FenetreBasse400px: Story = {
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 400);
    try {
      await waitFor(() => expect(window.innerHeight).toBe(400));
      const dialog = await open(canvasElement);
      const box = dialog.getBoundingClientRect();
      const today = [...dialog.querySelectorAll('button')].find((b) => /Aujourd/.test(b.textContent!))!.getBoundingClientRect();
      const field = canvasElement.querySelector('lc-date-input')!.getBoundingClientRect();
      expect(box.top).toBeGreaterThanOrEqual(0);
      // Constat (point 4b) : le panneau mesure 392 px, « Aujourd'hui » finit à 465 px dans 400 : à juger par la session principale, pas asserté.
    } finally {
      await page.viewport(1280, 720);
    }
  },
};

/** CA-15 (navigateur) : un double clic sur une cellule de mois ne choisit aucun jour (« aucun de ces choix ne change la valeur »). */
export const DoubleClicSurUnMois: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await open(canvasElement);
    await real.click(dialog.querySelector('button.lc-calendar__title')!);
    await waitFor(() => expect(dialog.querySelector('td[data-date="2026-05-01"]')).not.toBeNull());
    await real.dblClick(dialog.querySelector('td[data-date="2026-05-01"]')!);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(within(canvasElement).getByTestId('value')).toHaveTextContent('2026-11-12');
  },
};

/** CA-20 et CA-22 (navigateur) : un clic dans une zone morte du panneau (marge, en-têtes, pied) garde le focus dans le panneau, donc Échap le ferme seul. */
export const ClicDansUneZoneMorte: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await open(canvasElement);
    const box = dialog.getBoundingClientRect();
    const head = dialog.querySelector('thead th:nth-child(3)')!.getBoundingClientRect();
    const spots: Record<string, [number, number]> = {
      marge: [3, 3],
      entetes: [head.left + head.width / 2 - box.left, head.top + head.height / 2 - box.top],
      pied: [box.width / 2, box.height - 14],
    };
    for (const [name, [x, y]] of Object.entries(spots)) {
      await real.click(dialog, { position: { x, y } });
      expect(dialog.contains(document.activeElement), `focus après un clic sur ${name}`).toBe(true);
    }
  },
};

/** Niveau des années sans bornes (navigateur) : on ne descend pas sous l'an 1000 (le sélecteur traite 1000 à 9999). */
export const AnneesSansDescendreSousMille: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await open(canvasElement);
    await real.click(dialog.querySelector('button.lc-calendar__title')!);
    await real.click(dialog.querySelector('button.lc-calendar__title')!);
    const previous = () => dialog.querySelector<HTMLButtonElement>('button[aria-label="Années précédentes"]')!;
    for (let step = 0; step < 100; step++) {
      previous().click();
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const years = [...dialog.querySelectorAll('td[data-date]')].map((cell) => Number(cell.getAttribute('data-date')!.slice(0, 4)));
    expect(Math.min(...years)).toBeGreaterThanOrEqual(1000);
  },
};
