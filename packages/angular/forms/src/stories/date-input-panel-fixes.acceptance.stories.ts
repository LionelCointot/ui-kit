import { Component, input, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor, within } from 'storybook/test';
import { page, userEvent as real } from 'vitest/browser';
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { LcDateInputComponent } from '../date-input/date-input.component';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';

// Second passage : double et triple clic, zones mortes, bornes 1000 à 9999, fenêtre basse, retouches du designer (navigateur réel).

@Component({
  selector: 'lc-date-panel-fixes',
  imports: [LcDateInputComponent],
  template: `<button id="other" type="button" style="margin-block-end:8px">Autre contrôle</button>
    <lc-date-input ariaLabel="Date" [(value)]="date" [min]="min()" [max]="max()" />
    <p data-testid="value">{{ date() ?? 'null' }}</p>`,
})
class FixesComponent {
  readonly initial = input<string | null>(null);
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);
  protected readonly date = signal<string | null>(null);
  constructor() {
    queueMicrotask(() => this.date.set(this.initial()));
  }
}

const meta: Meta = {
  title: 'Formulaires/Champ de date/Acceptation, second passage',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [FixesComponent] }), applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
  render: (args) => ({ props: args, template: `<lc-date-panel-fixes [initial]="initial" [min]="min" [max]="max" />` }),
  args: { initial: '2026-11-12' },
};
export default meta;
type Story = StoryObj;

const panel = () => document.querySelector<HTMLElement>('lc-calendar-panel');
const button = (c: HTMLElement) => within(c).getByRole('button', { name: /^(Changer la date|Choisir une date)/ });
const value = (c: HTMLElement) => within(c).getByTestId('value').textContent;
const open = async (c: HTMLElement) => {
  await waitFor(() => expect(within(c).getByRole('textbox')).toBeInTheDocument());
  await real.click(button(c));
  await waitFor(() => expect(panel()).not.toBeNull());
  await waitFor(() => expect(panel()!.contains(document.activeElement)).toBe(true));
  return panel()!;
};
const title = (d: HTMLElement) => document.getElementById(d.querySelector('[role="grid"]')!.getAttribute('aria-labelledby')!)!.textContent!.trim();
const titleButton = (d: HTMLElement) => d.querySelector<HTMLElement>('button.lc-calendar__title')!;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Point 1 : un double clic sur un mois, puis sur une année, ne choisit aucune date et descend d'un niveau. */
export const DoubleClicMoisEtAnnee: Story = {
  play: async ({ canvasElement }) => {
    const d = await open(canvasElement);
    await real.click(titleButton(d));
    await real.click(titleButton(d)); // niveau des années
    await real.dblClick(d.querySelector('td[data-date="2028-01-01"]')!);
    await wait(300);
    expect(panel()).not.toBeNull();
    expect(title(d)).toBe('2028'); // niveau des mois
    expect(value(canvasElement)).toBe('2026-11-12');
    await real.dblClick(d.querySelector('td[data-date="2028-05-01"]')!);
    await wait(300);
    expect(panel()).not.toBeNull();
    expect(title(d)).toBe('mai 2028'); // niveau des jours
    expect(value(canvasElement)).toBe('2026-11-12');
  },
};

/** Point 1 : un double clic puis un triple clic sur un jour choisissent ce jour, une seule fois, et ferment. */
export const DoubleEtTripleClicSurUnJour: Story = {
  play: async ({ canvasElement }) => {
    for (const click of ['dblClick', 'tripleClick'] as const) {
      const d = await open(canvasElement);
      await real[click](d.querySelector('td[data-date="2026-11-20"]')!);
      await waitFor(() => expect(panel()).toBeNull());
      expect(value(canvasElement)).toBe('2026-11-20');
      expect(canvasElement.querySelector('#other')).not.toHaveFocus();
      await real.click(within(canvasElement).getByRole('button', { name: /^Changer la date/ }));
      await waitFor(() => expect(panel()).not.toBeNull());
      await real.keyboard('{Escape}');
      await waitFor(() => expect(panel()).toBeNull());
    }
  },
};

/** Point 2 : un clic dans une zone morte garde le focus dans le panneau, sans anneau ; Échap ferme et rend le focus au bouton. */
export const ZoneMorteEchap: Story = {
  play: async ({ canvasElement }) => {
    const spots = async (d: HTMLElement, level: 'day' | 'month' | 'year') => {
      const box = d.getBoundingClientRect();
      const rel = (r: DOMRect, dx = 0, dy = 0): [number, number] => [r.left + r.width / 2 - box.left + dx, r.top + r.height / 2 - box.top + dy];
      const out: Record<string, [number, number]> = { [`marge ${level}`]: [3, 3], [`pied ${level}`]: [box.width / 2, box.height - 14] };
      if (level === 'day') out[`en-têtes ${level}`] = rel(d.querySelector('thead th:nth-child(3)')!.getBoundingClientRect());
      else {
        const cell = d.querySelector('td[data-date]')!.getBoundingClientRect();
        out[`espace ${level}`] = rel(cell, 0, cell.height / 2 + 8);
        out[`entre colonnes ${level}`] = rel(cell, cell.width / 2 + 2);
      }
      return out;
    };
    for (const level of ['day', 'month', 'year'] as const) {
      let d = await open(canvasElement);
      if (level !== 'day') await real.click(titleButton(d));
      if (level === 'year') await real.click(titleButton(d));
      for (const [name, [x, y]] of Object.entries(await spots(d, level))) {
        await real.click(d, { position: { x, y } });
        expect(d.contains(document.activeElement), `focus dans le panneau après ${name}`).toBe(true);
        expect(getComputedStyle(d).outlineStyle, `anneau parasite après ${name}`).toBe('none');
        await real.keyboard('{Escape}');
        await waitFor(() => expect(panel(), `Échap après ${name}`).toBeNull());
        expect(button(canvasElement), `focus au bouton après ${name}`).toHaveFocus();
        d = await open(canvasElement);
        if (level !== 'day') await real.click(titleButton(d));
        if (level === 'year') await real.click(titleButton(d));
      }
      await real.keyboard('{Escape}');
      await waitFor(() => expect(panel()).toBeNull());
    }
  },
};

/** Point 3 : de 1000 à 9999, boutons désactivés aux extrémités aux trois niveaux, rien en dehors. */
const bounds = (initial: string, edge: 'first' | 'last', years: string, monthYear: string): Story => ({
  args: { initial },
  play: async ({ canvasElement }) => {
    const d = await open(canvasElement);
    const nav = (label: string) => d.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    const side = edge === 'first' ? 'précédent' : 'suivant';
    const dayLabel = edge === 'first' ? 'Mois précédent' : 'Mois suivant';
    expect(nav(dayLabel).disabled, `jours, ${side}`).toBe(true);
    await real.click(titleButton(d));
    expect(title(d)).toBe(monthYear);
    expect(nav(edge === 'first' ? 'Année précédente' : 'Année suivante').disabled, `mois, ${side}`).toBe(true);
    await real.click(titleButton(d));
    expect(title(d)).toBe(years);
    expect(nav(edge === 'first' ? 'Années précédentes' : 'Années suivantes').disabled, `années, ${side}`).toBe(true);
    const found = [...d.querySelectorAll('td[data-date]')].map((c) => Number(c.getAttribute('data-date')!.slice(0, 4)));
    expect(Math.min(...found)).toBeGreaterThanOrEqual(1000);
    expect(Math.max(...found)).toBeLessThanOrEqual(9999);
    // Au clavier aussi : Page précédente (ou suivante) ne sort pas de 1000 à 9999.
    await real.keyboard(edge === 'first' ? '{PageUp}{PageUp}' : '{PageDown}{PageDown}');
    await wait(150);
    const after = [...d.querySelectorAll('td[data-date]')].map((c) => Number(c.getAttribute('data-date')!.slice(0, 4)));
    expect(Math.min(...after)).toBeGreaterThanOrEqual(1000);
    expect(Math.max(...after)).toBeLessThanOrEqual(9999);
  },
});
export const AnneesPremierePage: Story = bounds('1000-01-15', 'first', '1000 à 1011', '1000');
export const AnneesDernierePage: Story = bounds('9999-12-15', 'last', '9988 à 9999', '9999');

/** Point 5 : même hauteur aux trois niveaux, grille centrée, hors bornes barré. */
export const RetouchesDuDesigner: Story = {
  args: { initial: '2026-11-12', min: '2026-11-10', max: '2027-03-20' },
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 900);
    const d = await open(canvasElement);
    const heights: number[] = [d.getBoundingClientRect().height];
    const struck = (el: Element | null) => getComputedStyle(el!).textDecorationLine;
    expect(struck(d.querySelector('td[data-date="2026-11-05"]')), 'jour hors bornes').toContain('line-through');
    expect(struck(d.querySelector('td[data-date="2026-11-15"]')), 'jour dans les bornes').not.toContain('line-through');
    await real.click(titleButton(d));
    heights.push(d.getBoundingClientRect().height);
    expect(struck(d.querySelector('td[data-date="2026-10-01"]')), 'mois hors bornes').toContain('line-through');
    expect(struck(d.querySelector('td[data-date="2026-11-01"]')), 'mois dans les bornes').not.toContain('line-through');
    const centred = (label: string) => {
      const body = d.querySelector('.lc-calendar__months')!.getBoundingClientRect();
      const grid = d.querySelector('[role="grid"]')!.getBoundingClientRect();
      const cells = d.querySelectorAll('td[data-date]');
      const first = cells[0].getBoundingClientRect();
      const last = cells[cells.length - 1].getBoundingClientRect();
      const top = first.top - grid.top;
      const bottom = grid.bottom - last.bottom;
      expect(Math.abs(body.bottom - grid.bottom), `${label} : la grille remplit le corps`).toBeLessThanOrEqual(2);
      expect(Math.abs(top - bottom), `${label} : marge haute ${top} et basse ${bottom}`).toBeLessThanOrEqual(2);
      expect(Math.abs(grid.left + grid.width / 2 - (body.left + body.width / 2)), `${label} : décalage horizontal`).toBeLessThanOrEqual(2);
    };
    centred('mois');
    await real.click(titleButton(d));
    heights.push(d.getBoundingClientRect().height);
    expect(struck(d.querySelector('td[data-date="2025-01-01"]')), 'année hors bornes').toContain('line-through');
    expect(struck(d.querySelector('td[data-date="2026-01-01"]')), 'année dans les bornes').not.toContain('line-through');
    centred('années');
    expect(heights, 'hauteur du panneau : jours, mois, années').toEqual([heights[0], heights[0], heights[0]]);
  },
};

/** Point 4 : fenêtre basse de 400 px, « Aujourd'hui » et « Effacer la date » se cliquent à la souris. */
export const FenetreBasseBoutonsAtteignables: Story = {
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 400);
    try {
      await waitFor(() => expect(window.innerHeight).toBe(400));
      let d = await open(canvasElement);
      const box = d.getBoundingClientRect();
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(400);
      const today = [...d.querySelectorAll('button')].find((b) => /Aujourd/.test(b.textContent!))!;
      await real.click(today);
      await waitFor(() => expect(panel()).toBeNull());
      expect(value(canvasElement)).toMatch(/^\d{4}-\d\d-\d\d$/);
      expect(value(canvasElement)).not.toBe('2026-11-12');
      d = await open(canvasElement);
      await real.click([...d.querySelectorAll('button')].find((b) => /Effacer/.test(b.textContent!))!);
      await waitFor(() => expect(panel()).toBeNull());
      expect(value(canvasElement)).toBe('null');
    } finally {
      await page.viewport(1280, 720);
    }
  },
};
