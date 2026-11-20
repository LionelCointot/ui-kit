import { Component, input, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor, within } from 'storybook/test';
// Vrai clavier et vraie souris (Playwright) : le `userEvent` de `storybook/test` envoie `keyCode` 0, ce qui fausse les preuves de touches.
import { page, userEvent as real } from 'vitest/browser';
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import type { LcDateInterval } from '../date-input/date-interval';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';
import { LcDateRangeInputComponent } from '../date-input/date-range-input.component';

// Preuves en navigateur réel de la spec 2026-11-selecteur-de-date, partie période : CA-29 à CA-35, CA-11, CA-18 (période).
// Le mois affiché vient de la valeur de départ (novembre 2026) : les tests ne dépendent pas de la date du poste, sauf mention.

@Component({
  selector: 'lc-range-acceptance',
  imports: [LcDateRangeInputComponent],
  template: `<button id="other" type="button" style="margin-block-end:8px">Autre contrôle</button>
    <div [style]="box()">
      <lc-date-range-input ariaLabel="Période" [(value)]="range" [min]="min()" [max]="max()" />
    </div>
    <p data-testid="value">{{ text() }}</p>`,
})
class RangeAcceptanceComponent {
  readonly initial = input<LcDateInterval>({ from: null, to: null });
  readonly box = input('max-width:36rem');
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);
  protected readonly range = signal<LcDateInterval>({ from: null, to: null });
  protected readonly text = () => `${this.range().from ?? 'null'}|${this.range().to ?? 'null'}`;
  constructor() {
    queueMicrotask(() => this.range.set(this.initial()));
  }
}

@Component({
  selector: 'lc-range-form-acceptance',
  imports: [FormField, LcDateRangeInputComponent, LcFormFieldComponent],
  template: `<lc-form-field label="Période"><lc-date-range-input [formField]="f.range" /></lc-form-field>
    <p data-testid="value">{{ model().range.from ?? 'null' }}|{{ model().range.to ?? 'null' }}</p>
    <p data-testid="touched">{{ f.range().touched() }}</p>`,
})
class RangeFormAcceptanceComponent {
  readonly model = signal<{ range: LcDateInterval }>({ range: { from: null, to: null } });
  readonly f = form(this.model);
}

@Component({
  selector: 'lc-range-in-field',
  imports: [LcDateRangeInputComponent, LcFormFieldComponent],
  template: `<lc-form-field label="Période"><lc-date-range-input [(value)]="range" /></lc-form-field>`,
})
class RangeInFieldComponent {
  protected readonly range = signal<LcDateInterval>({ from: null, to: null });
}

const NOV = { from: '2026-11-12', to: '2026-11-14' };

const meta: Meta = {
  title: 'QA/Date range input/Acceptance',
  tags: ['!autodocs'],
  decorators: [
    moduleMetadata({ imports: [RangeAcceptanceComponent, RangeFormAcceptanceComponent, RangeInFieldComponent] }),
    applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }),
  ],
  render: (args) => ({ props: args, template: `<lc-range-acceptance [initial]="initial" [box]="box" [min]="min" [max]="max" />` }),
  args: { initial: NOV, box: 'max-width:36rem', min: undefined, max: undefined },
};
export default meta;
type Story = StoryObj;

const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');
const button = (canvas: HTMLElement) => within(canvas).getByRole('button', { name: /^(Changer la période|Choisir une période)/ });
const valueText = (canvas: HTMLElement) => within(canvas).getByTestId('value').textContent;
const open = async (canvas: HTMLElement) => {
  await waitFor(() => expect(within(canvas).getAllByRole('textbox')).toHaveLength(2));
  await real.click(button(canvas));
  await waitFor(() => expect(panel()).not.toBeNull());
  await waitFor(() => expect(panel()!.contains(document.activeElement)).toBe(true));
  return panel()!;
};
const cell = (iso: string) => panel()!.querySelector<HTMLElement>(`td[data-date="${iso}"]`)!;
const footer = (text: RegExp) => [...panel()!.querySelectorAll<HTMLButtonElement>('button')].find((b) => text.test(b.textContent!.replace(/\s+/g, ' ').trim()))!;
const status = () => panel()!.querySelector('[role="status"]')!.textContent!.replace(/\s+/g, ' ').trim();
const grids = () => [...panel()!.querySelectorAll('[role="grid"]')];
const gridTitle = (index: number) => document.getElementById(grids()[index].getAttribute('aria-labelledby')!)!.textContent!.trim();
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isoAdd = (value: string, days: number) => {
  const [y, m, d] = value.split('-').map(Number);
  return iso(new Date(y, m - 1, d + days));
};
const frText = (date: string) => date.split('-').reverse().join('/');
/** Retape une date complète zone par zone (le remplacement du texte entier n'est pas utilisable : voir les sondes). */
const retype = async (input: HTMLInputElement, digits: string) => {
  await real.click(input);
  await real.keyboard('{ArrowLeft}{ArrowLeft}');
  await real.keyboard(digits);
};
const resetViewport = () => page.viewport(1280, 720);

/** CA-29 (navigateur) : à la souris, un premier clic pose le début, le second la fin et ferme ; le focus revient au bouton. */
export const DebutPuisFinALaSouris: Story = {
  play: async ({ canvasElement }) => {
    await resetViewport();
    const dialog = await open(canvasElement);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    await real.click(cell('2026-11-03'));
    expect(valueText(canvasElement)).toBe('2026-11-12|2026-11-14');
    await real.click(cell('2026-11-10'));
    await waitFor(() => expect(panel()).toBeNull());
    expect(valueText(canvasElement)).toBe('2026-11-03|2026-11-10');
    const [from, to] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    expect([from.value, to.value]).toEqual(['03/11/2026', '10/11/2026']);
    expect(button(canvasElement)).toHaveFocus();
  },
};

/** CA-29 (navigateur) : second jour antérieur au premier : les deux s'inversent. */
export const SecondJourAvantLePremier: Story = {
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    await real.click(cell('2026-11-20'));
    await real.click(cell('2026-11-06'));
    await waitFor(() => expect(panel()).toBeNull());
    expect(valueText(canvasElement)).toBe('2026-11-06|2026-11-20');
  },
};

/** CA-30 (navigateur) : l'aperçu au survol a un rendu distinct de la période choisie (bords en tirets). */
export const ApercuAuSurvol: Story = {
  play: async ({ canvasElement }) => {
    await resetViewport();
    await open(canvasElement);
    // Période choisie (au repos) : bande pleine, jamais de tirets.
    const chosen = cell('2026-11-13');
    const dashedAny = (element: Element) => ['', '::before', '::after'].some((pseudo) => /dashed/.test(`${getComputedStyle(element, pseudo).borderTopStyle} ${getComputedStyle(element, pseudo).borderBottomStyle}`));
    expect(dashedAny(chosen)).toBe(false);
    const restBackground = ['', '::before', '::after'].map((p) => getComputedStyle(chosen, p).backgroundColor).join('|');
    await real.click(cell('2026-11-03'));
    await real.hover(cell('2026-11-08'));
    await waitFor(() => expect(/preview/.test(cell('2026-11-06').getAttribute('data-range') ?? '')).toBe(true));
    const preview = cell('2026-11-06');
    expect(dashedAny(preview), 'bords en tirets sur un jour de l’aperçu').toBe(true);
    expect(/preview/.test(cell('2026-11-12').getAttribute('data-range') ?? ''), 'pas d’aperçu au-delà du jour survolé').toBe(false);
    // L'aperçu se distingue de la période choisie.
    expect(['', '::before', '::after'].map((p) => getComputedStyle(preview, p).borderTopStyle).join('|')).not.toBe(['', '::before', '::after'].map((p) => getComputedStyle(chosen, p).borderTopStyle).join('|'));
    expect(restBackground).toBeTruthy();
    // Sortie de la grille : l'aperçu disparaît.
    await real.hover(canvasElement.querySelector('#other')!);
    await waitFor(() => expect(/preview/.test(cell('2026-11-06').getAttribute('data-range') ?? '')).toBe(false));
  },
};

/** CA-30 (navigateur) : le mois affiché ne saute pas quand on pose le début, y compris dans le second mois. */
export const MoisAfficheNeSautePas: Story = {
  play: async ({ canvasElement }) => {
    await resetViewport();
    await open(canvasElement);
    expect([gridTitle(0), gridTitle(1)]).toEqual(['novembre 2026', 'décembre 2026']);
    await real.click(cell('2026-11-03'));
    expect([gridTitle(0), gridTitle(1)]).toEqual(['novembre 2026', 'décembre 2026']);
    await real.click(footer(/^Changer le début$/));
    await real.click(cell('2026-12-15'));
    expect([gridTitle(0), gridTitle(1)]).toEqual(['novembre 2026', 'décembre 2026']);
    expect(status()).toContain('Début : 15 décembre 2026.');
  },
};

/** CA-30 (navigateur) : début puis fin au vrai clavier (Entrée, flèches, Entrée) ; l'aperçu suit les flèches. */
export const DebutPuisFinAuClavier: Story = {
  args: { initial: { from: null, to: null } },
  play: async ({ canvasElement }) => {
    await resetViewport();
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    button(canvasElement).focus();
    await real.keyboard('{Enter}');
    await waitFor(() => expect(panel()).not.toBeNull());
    await waitFor(() => expect(panel()!.contains(document.activeElement)).toBe(true));
    const start = (document.activeElement as HTMLElement).dataset['date']!;
    expect(start, 'le premier focus est sur une cellule de jour (aujourd’hui)').toBeTruthy();
    await real.keyboard('{Enter}');
    await waitFor(() => expect(status()).toContain('Choisissez la date de fin'));
    await real.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe(isoAdd(start, 3));
    expect(/preview/.test(cell(isoAdd(start, 1)).getAttribute('data-range') ?? '')).toBe(true);
    await real.keyboard('{Enter}');
    await waitFor(() => expect(panel()).toBeNull());
    expect(valueText(canvasElement)).toBe(`${start}|${isoAdd(start, 3)}`);
    expect(button(canvasElement)).toHaveFocus();
  },
};

/** CA-30 (navigateur) : Échap pendant le choix de la fin ferme et laisse la valeur d'avant. */
export const EchapPendantLaFin: Story = {
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    await real.click(cell('2026-11-20'));
    await real.keyboard('{Escape}');
    await waitFor(() => expect(panel()).toBeNull());
    expect(valueText(canvasElement)).toBe('2026-11-12|2026-11-14');
    expect(button(canvasElement)).toHaveFocus();
  },
};

/** CA-30 (navigateur) : « Sans date de fin » valide le début seul et ferme. */
export const SansDateDeFin: Story = {
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    expect(footer(/^Sans date de fin$/)).toBeUndefined();
    await real.click(cell('2026-11-03'));
    await real.click(footer(/^Sans date de fin$/));
    await waitFor(() => expect(panel()).toBeNull());
    expect(valueText(canvasElement)).toBe('2026-11-03|null');
    expect(canvasElement.textContent).toContain('Sans date de fin : tout depuis le 3 novembre 2026.');
    expect(button(canvasElement).getAttribute('aria-label')).toBe('Changer la période, à partir du 3 novembre 2026');
  },
};

/** CA-30 (navigateur) : « Changer le début » : première phrase, panneau ouvert, valeur inchangée, focus rendu à une cellule (celle de l'ancien début, brief). */
export const ChangerLeDebut: Story = {
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    await real.click(cell('2026-11-03'));
    await real.click(footer(/^Changer le début$/));
    expect(status()).toBe('Choisissez la date de début.');
    expect(panel()).not.toBeNull();
    expect(valueText(canvasElement)).toBe('2026-11-12|2026-11-14');
    expect(footer(/^Changer le début$/)).toBeUndefined();
    const active = document.activeElement as HTMLElement;
    expect(active.tagName, 'le focus est rendu à une cellule').toBe('TD');
    expect(panel()!.contains(active)).toBe(true);
    expect(active.dataset['date'], 'celle de l’ancien début').toBe('2026-11-03');
  },
};

/** CA-33 (navigateur) : un raccourci remplit les deux champs, ferme, rend le focus au bouton (dates attendues calculées depuis la date du poste). */
export const RaccourciRemplitLesDeuxChamps: Story = {
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    const today = iso(new Date());
    await real.click(footer(/^7 derniers jours/));
    await waitFor(() => expect(panel()).toBeNull());
    const [from, to] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    expect([from.value, to.value]).toEqual([frText(isoAdd(today, -6)), frText(today)]);
    expect(valueText(canvasElement)).toBe(`${isoAdd(today, -6)}|${today}`);
    expect(button(canvasElement)).toHaveFocus();
  },
};

/** CA-35 (navigateur) : le titre du SECOND mois ouvre les mois de l'année de ce mois ; choisir un mois revient à deux mois, ce mois à gauche. */
export const TitreDuSecondMois: Story = {
  args: { initial: { from: '2026-12-10', to: '2026-12-12' } },
  play: async ({ canvasElement }) => {
    await resetViewport();
    await open(canvasElement);
    expect([gridTitle(0), gridTitle(1)]).toEqual(['décembre 2026', 'janvier 2027']);
    await real.click(within(panel()!).getByRole('button', { name: 'janvier 2027 : choisir un mois' }));
    await waitFor(() => expect(grids()).toHaveLength(1));
    expect(gridTitle(0)).toBe('2027');
    expect(grids()[0].querySelectorAll('td[data-date]')).toHaveLength(12);
    await real.click(cell('2027-03-01'));
    await waitFor(() => expect(grids()).toHaveLength(2));
    expect([gridTitle(0), gridTitle(1)]).toEqual(['mars 2027', 'avril 2027']);
    expect(valueText(canvasElement)).toBe('2026-12-10|2026-12-12');
    expect(panel()).not.toBeNull();
  },
};

const stopName = (element: Element) => {
  if (element.tagName === 'TD') return 'grille';
  const label = element.querySelector('.lc-calendar__preset-label');
  return label?.textContent?.trim() ?? element.getAttribute('aria-label') ?? element.textContent!.replace(/\s+/g, ' ').trim();
};

/** CA-20 (période, navigateur) : au vrai clavier, Tab et Maj + Tab ne sortent jamais du panneau ; la grille est une seule étape. */
export const TabulationPiegee: Story = {
  play: async ({ canvasElement }) => {
    await resetViewport();
    const dialog = await open(canvasElement);
    expect(stopName(document.activeElement!)).toBe('grille');
    const forward: string[] = [];
    for (let press = 0; press < 11; press++) {
      await real.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
      forward.push(stopName(document.activeElement!));
    }
    // Ordre réel observé (voir le constat) : grille, titre du second mois, suivant, pied, raccourcis, précédent, titre du premier mois.
    expect(forward.filter((name) => name === 'grille')).toHaveLength(1);
    expect(forward).toEqual(expect.arrayContaining(["Aujourd'hui", 'Effacer la période', '7 derniers jours', '30 derniers jours', 'Ce mois-ci', 'Le mois dernier', 'Mois précédent', 'Mois suivant']));
    for (let press = 0; press < 14; press++) {
      await real.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  },
};

/** CA-29 / CA-30 : après le premier clic, « Changer le début » est la première étape après les raccourcis (brief : avant « précédent »). */
export const OrdreDeTabulationApresLePremierClic: Story = {
  play: async ({ canvasElement }) => {
    await resetViewport();
    const dialog = await open(canvasElement);
    await real.click(cell('2026-11-03'));
    const names: string[] = [];
    // Du premier raccourci à la grille : Maj + Tab jusqu'à retrouver la grille, puis on lit l'ordre en avant depuis le début.
    for (let press = 0; press < 14; press++) {
      await real.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
      names.push(stopName(document.activeElement!));
    }
    const first = names.indexOf('7 derniers jours');
    const cycle = [...names.slice(first), ...names.slice(0, first)];
    // Brief : raccourcis, « Changer le début », précédent, titre, suivant, grille, pied (« Aujourd'hui », « Sans date de fin », « Effacer la période »).
    expect(cycle.slice(0, 5), JSON.stringify(cycle)).toEqual(['7 derniers jours', '30 derniers jours', 'Ce mois-ci', 'Le mois dernier', 'Changer le début']);
    expect(cycle.slice(5, 6), JSON.stringify(cycle)).toEqual(['Mois précédent']);
    expect(cycle.slice(-3), JSON.stringify(cycle)).toEqual(["Aujourd'hui", 'Sans date de fin', 'Effacer la période']);
  },
};

const layout = async (canvasElement: HTMLElement, width: number, height = 800) => {
  await page.viewport(width, height);
  await waitFor(() => expect(window.innerWidth).toBe(width));
  return open(canvasElement);
};
const rect = (element: Element) => element.getBoundingClientRect();
const presets = () => [...panel()!.querySelectorAll<HTMLElement>('button.lc-calendar__preset')];

const noHorizontalScroll = (dialog: HTMLElement, width: number) => {
  const box = rect(dialog);
  expect(box.left, `bord gauche à ${width}`).toBeGreaterThanOrEqual(0);
  expect(box.right, `bord droit à ${width}`).toBeLessThanOrEqual(width);
  expect(document.documentElement.scrollWidth, `défilement horizontal de la page à ${width}`).toBeLessThanOrEqual(width);
  expect(dialog.scrollWidth, `défilement horizontal du panneau à ${width}`).toBeLessThanOrEqual(dialog.clientWidth);
};

const widthStory = (width: number, months: 1 | 2, shortcuts: 'column' | 'grid'): Story => ({
  args: { box: 'inline-size:100%' },
  play: async ({ canvasElement }) => {
    try {
      const dialog = await layout(canvasElement, width);
      expect(grids(), `mois à ${width} px`).toHaveLength(months);
      const list = presets();
      expect(list).toHaveLength(4);
      const first = rect(grids()[0]);
      if (shortcuts === 'column') {
        expect(new Set(list.map((p) => Math.round(rect(p).left))).size, 'une seule colonne').toBe(1);
        expect(rect(list[1]).top).toBeGreaterThan(rect(list[0]).top);
        expect(rect(list[0]).right).toBeLessThanOrEqual(first.left);
        const column = rect(panel()!.querySelector('.lc-calendar__presets')!).width;
        expect(Math.round(column), `colonne de 192 px (boutons : ${Math.round(rect(list[0]).width)} px)`).toBe(192);
      } else {
        expect(Math.round(rect(list[0]).top), 'deux boutons par ligne').toBe(Math.round(rect(list[1]).top));
        expect(rect(list[2]).top).toBeGreaterThan(rect(list[0]).top);
        expect(Math.round(rect(list[2]).left)).toBe(Math.round(rect(list[0]).left));
        expect(rect(list[3]).bottom, 'raccourcis au-dessus des mois').toBeLessThanOrEqual(first.top);
      }
      noHorizontalScroll(dialog, width);
    } finally {
      await resetViewport();
    }
  },
});
/** CA-34 (navigateur) : largeurs 1280, 840, 800, 640, 639 et 360 px : nombre de mois, raccourcis en colonne dès 840 px, en grille en dessous, aucun défilement horizontal. */
export const Largeur1280px: Story = widthStory(1280, 2, 'column');
export const Largeur840px: Story = widthStory(840, 2, 'column');
export const Largeur839px: Story = widthStory(839, 2, 'grid');
export const Largeur800px: Story = widthStory(800, 2, 'grid');
export const Largeur640px: Story = widthStory(640, 2, 'grid');
export const Largeur639px: Story = widthStory(639, 1, 'grid');
export const Largeur360px: Story = widthStory(360, 1, 'grid');

/** Fenêtre de 400 px de haut (navigateur) : les boutons du pied restent visibles et cliquables. */
export const FenetreBasse400px: Story = {
  play: async ({ canvasElement }) => {
    try {
      await page.viewport(1280, 400);
      await waitFor(() => expect(window.innerHeight).toBe(400));
      const dialog = await open(canvasElement);
      for (const name of [/^Aujourd/, /^Effacer la période$/]) {
        const target = footer(name);
        const box = rect(target);
        expect(box.bottom, `${name} dans la fenêtre`).toBeLessThanOrEqual(400);
        expect(box.top).toBeGreaterThanOrEqual(0);
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        expect(target.contains(top), `${name} n’est pas recouvert`).toBe(true);
      }
      await real.click(footer(/^Aujourd/));
      expect(panel(), '« Aujourd’hui » ne ferme pas la période').not.toBeNull();
      await real.click(footer(/^Effacer la période$/));
      await waitFor(() => expect(panel()).toBeNull());
      expect(valueText(canvasElement)).toBe('null|null');
      expect(dialog).toBeTruthy();
    } finally {
      await resetViewport();
    }
  },
};

/** CA-25 (période, navigateur) : panneau ouvert, clair vers sombre change le fond du panneau et celui d'une extrémité de la période. */
export const ChangementDeTheme: Story = {
  play: async ({ canvasElement }) => {
    const root = document.documentElement;
    const before = root.getAttribute('data-theme');
    try {
      root.setAttribute('data-theme', 'default');
      const dialog = await open(canvasElement);
      const end = cell('2026-11-12');
      const read = () => ({ panel: getComputedStyle(dialog).backgroundColor, end: getComputedStyle(end, '::before').backgroundColor });
      const light = read();
      root.setAttribute('data-theme', 'dark');
      await waitFor(() => expect(read().panel).not.toBe(light.panel));
      await waitFor(() => expect(read().end).not.toBe(light.end));
      expect(panel()).not.toBeNull();
    } finally {
      root.setAttribute('data-theme', before ?? 'default');
    }
  },
};

/** CA-18 (période, navigateur) : un clic hors du panneau ferme sans rien changer, focus au bouton ; un clic sur un autre contrôle lui laisse le focus. */
export const ClicHorsDuPanneau: Story = {
  play: async ({ canvasElement }) => {
    await resetViewport();
    await open(canvasElement);
    await real.click(document.body, { position: { x: 1000, y: 650 } });
    await waitFor(() => expect(panel()).toBeNull());
    expect(valueText(canvasElement)).toBe('2026-11-12|2026-11-14');
    expect(button(canvasElement)).toHaveFocus();
    await open(canvasElement);
    await real.click(within(canvasElement).getByRole('button', { name: 'Autre contrôle' }));
    await waitFor(() => expect(panel()).toBeNull());
    expect(document.activeElement).toBe(canvasElement.querySelector('#other'));
  },
};

/** Frappe réelle dans « Du » et « Au » : jour impossible, borne incomplète, fin avant début (message unique), ligne d'une seule borne. */
export const SaisieReelle: Story = {
  args: { initial: { from: null, to: null } },
  play: async ({ canvasElement }) => {
    await resetViewport();
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const [from, to] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    const message = 'La date de fin est avant la date de début.';
    const occurrences = () => (canvasElement.textContent!.replace(/\s+/g, ' ').split(message).length - 1);
    // Jour impossible : 31 puis 02 puis 2026 donne le 28, sans message ni cadre invalide.
    await real.click(from);
    await real.keyboard('31022026');
    expect(from.value).toBe('28/02/2026');
    expect(from.getAttribute('aria-invalid')).toBeNull();
    expect(valueText(canvasElement)).toBe('2026-02-28|null');
    expect(canvasElement.textContent).toContain('Sans date de fin : tout depuis le 28 février 2026.');
    // Fin avant le début : la borne tapée vaut null, cadre de « Au » invalide, le message une fois.
    await real.click(to);
    await real.keyboard('01022026');
    await waitFor(() => expect(occurrences()).toBe(1));
    expect(valueText(canvasElement)).toBe('2026-02-28|null');
    expect(to.getAttribute('aria-invalid')).toBe('true');
    expect(from.getAttribute('aria-invalid')).toBeNull();
    // Une fin valable corrige tout.
    await retype(to, '05032026');
    await waitFor(() => expect(valueText(canvasElement)).toBe('2026-02-28|2026-03-05'));
    expect(occurrences()).toBe(0);
    expect(to.getAttribute('aria-invalid')).toBeNull();
    // Date incomplète dans « Du » : cadre invalide de ce champ, aucun message.
    await real.click(from);
    await real.keyboard('{Backspace}{ArrowLeft}{Backspace}{ArrowLeft}{Backspace}');
    await real.keyboard('12');
    await real.tab();
    await real.tab({ shift: true });
    await real.tab();
    await waitFor(() => expect(from.getAttribute('aria-invalid')).toBe('true'));
    expect(to.getAttribute('aria-invalid')).toBeNull();
    expect(occurrences()).toBe(0);
    expect(canvasElement.textContent).not.toMatch(/incompl|Exemple/i);
  },
};

/** CA-32 sous [formField] et lc-form-field (navigateur) : l'erreur remonte au formulaire et s'affiche une seule fois. */
export const MessageUniqueSousFormulaire: Story = {
  render: () => ({ template: `<lc-range-form-acceptance />` }),
  play: async ({ canvasElement }) => {
    await resetViewport();
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const [from, to] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    const message = 'La date de fin est avant la date de début.';
    await real.click(from);
    await real.keyboard('10112026');
    await real.click(to);
    await real.keyboard('05112026');
    await real.tab();
    await real.tab(); // une première tabulation va au bouton calendrier, encore dans le groupe : « touché » ne se pose qu'en sortant
    await waitFor(() => expect(canvasElement.textContent!.split(message).length - 1).toBe(1));
    expect(within(canvasElement).getByTestId('value')).toHaveTextContent('2026-11-10|null');
    expect(within(canvasElement).getByTestId('touched')).toHaveTextContent('true');
    expect(within(canvasElement).getAllByText(message)).toHaveLength(1);
  },
};

/** Point 4a (navigateur) : après un choix dans le panneau, les champs sont recréés. Une saisie partielle dans l'autre champ, le focus et l'état « touché » ne se perdent pas de façon visible. */
export const ChoixDansLePanneauApresUneSaisiePartielle: Story = {
  render: () => ({ template: `<lc-range-form-acceptance />` }),
  play: async ({ canvasElement }) => {
    await resetViewport();
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const [, to] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    await real.click(to);
    await real.keyboard('12'); // saisie partielle dans « Au »
    expect(to.value).toBe('12/mm/aaaa');
    await real.click(within(canvasElement).getByRole('button', { name: /^Choisir une période/ }));
    await waitFor(() => expect(panel()).not.toBeNull());
    await real.click(footer(/^7 derniers jours/));
    await waitFor(() => expect(panel()).toBeNull());
    const today = iso(new Date());
    const [newFrom, newTo] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    expect([newFrom.value, newTo.value]).toEqual([frText(isoAdd(today, -6)), frText(today)]);
    expect(newFrom.getAttribute('aria-invalid')).toBeNull();
    expect(newTo.getAttribute('aria-invalid')).toBeNull();
    expect(within(canvasElement).getByTestId('value')).toHaveTextContent(`${isoAdd(today, -6)}|${today}`);
    // Le focus est rendu au bouton (il ne tombe pas sur <body>), l'état « touché » est conservé.
    expect(within(canvasElement).getByRole('button', { name: /^Changer la période/ })).toHaveFocus();
    expect(within(canvasElement).getByTestId('touched')).toHaveTextContent('true');
    // Les champs recréés restent utilisables au clavier et à la souris.
    await real.click(newTo);
    await real.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(newTo);
  },
};

/** Point 4a (suite) : un début tapé avant l'ouverture, le panneau fermé par Échap : rien n'est recréé, la saisie partielle reste. */
export const EchapGardeLaSaisiePartielle: Story = {
  args: { initial: { from: null, to: null } },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const [from] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    await real.click(from);
    await real.keyboard('12');
    await open(canvasElement);
    await real.keyboard('{Escape}');
    await waitFor(() => expect(panel()).toBeNull());
    expect(from.isConnected, 'le champ n’est pas recréé').toBe(true);
    expect(from.value).toBe('12/mm/aaaa');
  },
};

/** CA-11 (période, navigateur) : désactivé et lecture seule, ni bouton ni panneau, zones non modifiables. */
@Component({
  selector: 'lc-range-inert',
  imports: [LcDateRangeInputComponent],
  template: `<lc-date-range-input ariaLabel="Désactivée" [value]="v" disabled />
    <lc-date-range-input ariaLabel="Lecture seule" [value]="v" readonly />`,
})
class RangeInertComponent {
  protected readonly v = NOV;
}
export const DesactiveEtLectureSeule: Story = {
  decorators: [moduleMetadata({ imports: [RangeInertComponent] }), applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
  render: () => ({ template: `<lc-range-inert />` }),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('input')).toHaveLength(4));
    expect(canvasElement.querySelectorAll('button')).toHaveLength(0);
    const [, , readOnlyFrom] = [...canvasElement.querySelectorAll('input')];
    await real.click(readOnlyFrom);
    await real.keyboard('1{ArrowUp}{Backspace}');
    expect(readOnlyFrom.value).toBe('12/11/2026');
    await real.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(panel()).toBeNull();
  },
};

/** Revue 1 (navigateur) : en période, titre puis DOUBLE clic sur un mois : le second clic ne doit pas poser un début sur le jour qui apparaît dessous. */
export const DoubleClicSurUnMoisEnPeriode: Story = {
  play: async ({ canvasElement }) => {
    await resetViewport();
    await open(canvasElement);
    await real.click(within(panel()!).getByRole('button', { name: 'novembre 2026 : choisir un mois' }));
    await waitFor(() => expect(grids()).toHaveLength(1));
    await real.dblClick(cell('2026-05-01'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(valueText(canvasElement)).toBe('2026-11-12|2026-11-14');
    expect(panel(), 'le panneau reste ouvert').not.toBeNull();
    expect(status(), 'aucun début posé : la ligne dit la période existante').toBe('Période : du 12 au 14 novembre 2026 inclus. Cliquez un jour pour la changer.');
  },
};

/** Revue 2 (navigateur) : fin refusée (avant le début), puis début corrigé : l'écran doit rester cohérent (texte du champ, valeur, message). */
export const DebutCorrigeApresUneFinRefusee: Story = {
  args: { initial: { from: null, to: null } },
  play: async ({ canvasElement }) => {
    await resetViewport();
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const [from, to] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    const message = 'La date de fin est avant la date de début.';
    await real.click(from);
    await real.keyboard('10112026');
    await real.click(to);
    await real.keyboard('05112026');
    await waitFor(() => expect(canvasElement.textContent).toContain(message));
    await retype(from, '01112026');
    const seen = { from: from.value, to: to.value, value: valueText(canvasElement), message: canvasElement.textContent!.includes(message), toInvalid: to.getAttribute('aria-invalid') };
    // Cohérence : si la fin affichée est une date complète, la valeur la porte et le message a disparu.
    if (/^\d\d\/\d\d\/\d{4}$/.test(seen.to)) {
      expect(seen, `ce que voit la personne : ${JSON.stringify(seen)}`).toMatchObject({ value: '2026-11-01|2026-11-05', message: false });
    }
  },
};

@Component({
  selector: 'lc-range-form-bounds',
  imports: [FormField, LcDateRangeInputComponent, LcFormFieldComponent],
  template: `<lc-form-field label="Période"><lc-date-range-input [formField]="f.range" min="2026-11-15" max="2026-11-25" /></lc-form-field>`,
})
class RangeFormBoundsComponent {
  readonly model = signal<{ range: LcDateInterval }>({ range: { from: '2026-11-18', to: null } });
  readonly f = form(this.model);
}

/** Revue 3 (navigateur) : [formField] avec [min] et [max] : les jours hors bornes restent désactivés dans le panneau. */
export const FormFieldAvecMinEtMax: Story = {
  decorators: [moduleMetadata({ imports: [RangeFormBoundsComponent] }), applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
  render: () => ({ template: `<lc-range-form-bounds />` }),
  play: async ({ canvasElement }) => {
    await resetViewport();
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    await open(canvasElement);
    expect(cell('2026-11-10').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-11-30').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-11-20').getAttribute('aria-disabled')).toBeNull();
  },
};

/** Revue 4 (navigateur) : panneau ouvert à 1280 px, fenêtre réduite sous 640 px : une cellule reste focalisable, le focus n'est pas perdu. */
export const ReductionDeLaFenetrePanneauOuvert: Story = {
  play: async ({ canvasElement }) => {
    try {
      await resetViewport();
      await open(canvasElement);
      await real.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}'); // 12 novembre + 21 jours : un jour de décembre, dans le second mois
      expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-12-03');
      await page.viewport(600, 800);
      await waitFor(() => expect(grids()).toHaveLength(1));
      const active = document.activeElement as HTMLElement;
      expect(panel()!.contains(active), `focus après réduction : ${active.tagName}`).toBe(true);
      expect(panel()!.querySelectorAll('td[tabindex="0"]').length, 'une cellule focalisable').toBe(1);
      await real.keyboard('{ArrowRight}');
      expect(panel()!.contains(document.activeElement)).toBe(true);
    } finally {
      await resetViewport();
    }
  },
};

/** CA-8 (navigateur) : remplacer tout le texte d'un champ (remplissage automatique, `fill()` de Playwright) dans le vrai navigateur. */
export const RemplissageCompletAuVraiNavigateur: Story = {
  args: { initial: { from: null, to: null } },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const [from, to] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    const seen: string[] = [];
    for (const [input, text] of [[from, '01/11/2026'], [to, '2026-11-20'], [from, '12.11.2026']] as const) {
      await real.fill(input, text);
      seen.push(`${text} -> « ${input.value} » ${valueText(canvasElement)}`);
    }
    expect(seen).toEqual(['01/11/2026 -> « 01/11/2026 » 2026-11-01|null', '2026-11-20 -> « 20/11/2026 » 2026-11-01|2026-11-20', '12.11.2026 -> « 12/11/2026 » 2026-11-12|2026-11-20']);
  },
};

/** CA-8 (navigateur) : un vrai collage, zone active sélectionnée (état normal après un clic) (Ctrl + V d'un texte copié) dans le vrai navigateur. */
export const CollageAuVraiNavigateurZoneSelectionnee: Story = {
  args: { initial: { from: null, to: null } },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const [from] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    const scratch = document.createElement('input');
    scratch.value = '12/11/2026';
    document.body.append(scratch);
    try {
      await real.click(scratch);
      await real.keyboard('{Control>}a{/Control}{Control>}c{/Control}');
      const probe = document.createElement('input');
      document.body.append(probe);
      await real.click(probe);
      await real.keyboard('{Control>}v{/Control}');
      expect(probe.value, 'le presse-papiers du poste de test fonctionne').toBe('12/11/2026');
      probe.remove();
      await real.click(from);
      await real.keyboard('{Control>}v{/Control}');
      expect(`${from.value} ${valueText(canvasElement)}`).toBe('12/11/2026 2026-11-12|null');
    } finally {
      scratch.remove();
    }
  },
};

/** CA-8 (navigateur) : même collage, tout le texte du champ sélectionné d'abord (Ctrl + A). */
export const CollageAuVraiNavigateurToutSelectionne: Story = {
  args: { initial: { from: null, to: null } },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const [from] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    const scratch = document.createElement('input');
    scratch.value = '12/11/2026';
    document.body.append(scratch);
    try {
      await real.click(scratch);
      await real.keyboard('{Control>}a{/Control}{Control>}c{/Control}');
      await real.click(from);
      from.select();
      await real.keyboard('{Control>}v{/Control}');
      expect(`${from.value} ${valueText(canvasElement)}`).toBe('12/11/2026 2026-11-12|null');
    } finally {
      scratch.remove();
    }
  },
};

/** Robustesse (navigateur) : dans un parent qui s'ajuste au contenu (ligne flex, colonne de grille automatique), le champ garde une largeur utilisable. */
export const DansUneLigneFlex: Story = {
  args: { box: 'display:flex' },
  play: async ({ canvasElement }) => {
    await resetViewport();
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const group = canvasElement.querySelector('[role="group"]')!;
    expect(Math.round(group.getBoundingClientRect().width), 'largeur du groupe dans une ligne flex').toBeGreaterThanOrEqual(280);
  },
};

/** CA-28 (navigateur) : dans lc-form-field, le champ de période garde une largeur utilisable (la forme prévue par la spec : champ « Période » avec libellé). */
export const LargeurDansLcFormField: Story = {
  render: () => ({ template: `<lc-range-form-acceptance />` }),
  play: async ({ canvasElement }) => {
    await resetViewport();
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const group = canvasElement.querySelector('[role="group"]')!;
    expect(Math.round(group.getBoundingClientRect().width), 'largeur du groupe dans lc-form-field').toBeGreaterThanOrEqual(280);
  },
};

/** CA-32 (navigateur) : dans lc-form-field avec [(value)] (sans [formField]), la fin avant le début affiche quand même le message, une fois. */
export const MessageDansLcFormFieldSansFormField: Story = {
  render: () => ({ template: `<lc-range-in-field />` }),
  play: async ({ canvasElement }) => {
    await resetViewport();
    await waitFor(() => expect(within(canvasElement).getAllByRole('textbox')).toHaveLength(2));
    const [from, to] = within(canvasElement).getAllByRole('textbox') as HTMLInputElement[];
    await real.click(from);
    await real.keyboard('10112026');
    await real.click(to);
    await real.keyboard('05112026');
    await real.tab();
    await real.tab();
    const message = 'La date de fin est avant la date de début.';
    expect(to.getAttribute('aria-invalid')).toBe('true');
    await waitFor(() => expect(canvasElement.textContent!.split(message).length - 1, 'le message est affiché une fois').toBe(1));
  },
};
