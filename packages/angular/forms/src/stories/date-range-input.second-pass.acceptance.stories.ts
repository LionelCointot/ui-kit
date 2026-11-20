import { Component, input, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor, within } from 'storybook/test';
import { page, userEvent as real } from 'vitest/browser';
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcDateInputComponent } from '../date-input/date-input.component';
import type { LcDateInterval } from '../date-input/date-interval';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';
import { LcDateRangeInputComponent } from '../date-input/date-range-input.component';

// Second passage de vérification de la période (spec 2026-11-selecteur-de-date) : largeurs, collage et remplissage,
// ordre des bornes, message unique, panneau. Navigateur réel ; les mesures sont écrites dans la sortie (« MESURE »).

const EMPTY: LcDateInterval = { from: null, to: null };
const NOV: LcDateInterval = { from: '2026-11-12', to: '2026-11-14' };

@Component({
  selector: 'lc-sp-contexts',
  imports: [LcDateRangeInputComponent, LcFormFieldComponent],
  template: `
    @switch (where()) {
      @case ('form-field') { <lc-form-field label="Période"><lc-date-range-input [(value)]="range" /></lc-form-field> }
      @case ('flex') { <div style="display:flex"><lc-date-range-input [(value)]="range" /></div> }
      @case ('grid') { <div style="display:grid;grid-template-columns:auto"><lc-date-range-input [(value)]="range" /></div> }
      @case ('inline-grid') { <div style="display:inline-grid"><lc-date-range-input [(value)]="range" /></div> }
      @default { <div><lc-date-range-input [(value)]="range" /></div> }
    }
    <p data-testid="value">{{ range().from ?? 'null' }}|{{ range().to ?? 'null' }}</p>`,
})
class ContextsComponent {
  readonly where = input('alone');
  protected readonly range = signal<LcDateInterval>(EMPTY);
}

@Component({
  selector: 'lc-sp-fields',
  imports: [LcDateRangeInputComponent, LcDateInputComponent],
  template: `
    <lc-date-input ariaLabel="Date simple" [(value)]="single" [readonly]="readonly()" />
    <lc-date-range-input ariaLabel="Période" [(value)]="range" [readonly]="readonly()" />
    <p data-testid="single">{{ single() ?? 'null' }}</p>
    <p data-testid="range">{{ range().from ?? 'null' }}|{{ range().to ?? 'null' }}</p>`,
})
class FieldsComponent {
  readonly readonly = input(false);
  protected readonly single = signal<string | null>(null);
  protected readonly range = signal<LcDateInterval>(EMPTY);
}

@Component({
  selector: 'lc-sp-order',
  imports: [FormField, LcDateRangeInputComponent, LcFormFieldComponent],
  template: `
    @switch (kind()) {
      @case ('bare') { <lc-date-range-input [(value)]="range" /> }
      @case ('field') { <lc-form-field label="Période"><lc-date-range-input [(value)]="range" /></lc-form-field> }
      @default { <lc-form-field label="Période"><lc-date-range-input [formField]="f.range" /></lc-form-field> }
    }
    <p data-testid="value">{{ value().from ?? 'null' }}|{{ value().to ?? 'null' }}</p>`,
})
class OrderComponent {
  readonly kind = input('bare');
  protected readonly range = signal<LcDateInterval>(EMPTY);
  protected readonly model = signal<{ range: LcDateInterval }>({ range: EMPTY });
  protected readonly f = form(this.model);
  protected value() {
    return this.kind() === 'form' ? this.model().range : this.range();
  }
}

@Component({
  selector: 'lc-sp-undefined',
  imports: [LcDateRangeInputComponent],
  template: `<lc-date-range-input [value]="undefined!" />`,
})
class UndefinedComponent {}

@Component({
  selector: 'lc-sp-panel',
  imports: [LcDateRangeInputComponent, LcDateInputComponent],
  template: `<lc-date-range-input ariaLabel="Période" [(value)]="range" />
    <lc-date-input ariaLabel="Date" [(value)]="single" />
    <p data-testid="value">{{ range().from ?? 'null' }}|{{ range().to ?? 'null' }}</p>`,
})
class PanelComponent {
  readonly initial = input<LcDateInterval>(NOV);
  protected readonly range = signal<LcDateInterval>(NOV);
  protected readonly single = signal<string | null>('2026-11-12');
  constructor() {
    queueMicrotask(() => this.range.set(this.initial()));
  }
}

const meta: Meta = {
  title: 'Formulaires/Champ de période/Second passage',
  tags: ['!autodocs'],
  decorators: [
    moduleMetadata({ imports: [ContextsComponent, FieldsComponent, OrderComponent, UndefinedComponent, PanelComponent] }),
    applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }),
  ],
};
export default meta;
type Story = StoryObj;

const rect = (element: Element) => element.getBoundingClientRect();
const reset = () => page.viewport(1280, 720);
const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');
const text = (canvas: HTMLElement) => canvas.textContent!.replace(/\s+/g, ' ');
const MESSAGE = 'La date de fin est avant la date de début.';
const count = (canvas: HTMLElement) => text(canvas).split(MESSAGE).length - 1;
const testId = (canvas: HTMLElement, id: string) => within(canvas).getByTestId(id).textContent;
const retype = async (input: HTMLInputElement, digits: string) => {
  await real.click(input);
  await real.keyboard('{ArrowLeft}{ArrowLeft}');
  await real.keyboard(digits);
};
const textboxes = (canvas: HTMLElement) => within(canvas).getAllByRole('textbox') as HTMLInputElement[];
const log = (label: string, value: unknown) => console.log(`MESURE ${label} ${JSON.stringify(value)}`);

// ---------- 2. Largeurs

const widthStory = (where: string): Story => ({
  render: () => ({ template: `<lc-sp-contexts where="${where}" />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(2));
    const group = canvasElement.querySelector('[role="group"]')!;
    const inputs = textboxes(canvasElement);
    log(`largeur ${where}`, { groupe: Math.round(rect(group).width), du: Math.round(rect(inputs[0]).width), au: Math.round(rect(inputs[1]).width), empiles: rect(inputs[1]).top > rect(inputs[0]).top });
    expect(rect(group).width).toBeGreaterThanOrEqual(280);
    expect(rect(inputs[0]).width).toBeGreaterThanOrEqual(120);
    expect(rect(inputs[1]).width).toBeGreaterThanOrEqual(120);
  },
});
export const LargeurDansFormField: Story = widthStory('form-field');
export const LargeurDansUneLigneFlex: Story = widthStory('flex');
export const LargeurDansUneColonneDeGrille: Story = widthStory('grid');
export const LargeurDansUneGrilleEnLigne: Story = widthStory('inline-grid');
export const LargeurSeulDansUnBloc: Story = widthStory('alone');

/** Empilement des deux champs selon la place (conteneur de largeur fixe) et fenêtre de 360 px sans débordement. */
export const EmpilementEtFenetreDe360px: Story = {
  render: () => ({ template: `<lc-sp-contexts where="form-field" />` }),
  play: async ({ canvasElement }) => {
    try {
      await reset();
      await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(2));
      const field = canvasElement.querySelector<HTMLElement>('lc-form-field')!;
      const stacked: Record<string, boolean> = {};
      for (const width of [640, 520, 480, 460, 449, 447, 440, 400, 320]) {
        field.style.inlineSize = `${width}px`;
        await new Promise((resolve) => setTimeout(resolve, 60));
        const [from, to] = textboxes(canvasElement);
        stacked[`${width}px`] = rect(to).top > rect(from).top + 5;
      }
      log('empilement (conteneur, vrai = empilés)', stacked);
      field.style.inlineSize = '';
      await page.viewport(360, 800);
      await waitFor(() => expect(window.innerWidth).toBe(360));
      await new Promise((resolve) => setTimeout(resolve, 100));
      const group = canvasElement.querySelector('[role="group"]')!;
      const button = canvasElement.querySelector('button[aria-haspopup="dialog"]')!;
      log('360 px', { groupe: [Math.round(rect(group).left), Math.round(rect(group).right)], bouton: Math.round(rect(button).right), defilement: document.documentElement.scrollWidth });
      expect(rect(group).right).toBeLessThanOrEqual(360);
      expect(rect(button).right).toBeLessThanOrEqual(360);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
      for (const input of textboxes(canvasElement)) expect(rect(input).right).toBeLessThanOrEqual(360);
    } finally {
      await reset();
    }
  },
};

// ---------- 3. Collage et remplissage (date simple, « Du », « Au »)

const targets = [
  { name: 'date simple', index: 0, read: (canvas: HTMLElement) => testId(canvas, 'single'), expected: (iso: string) => iso },
  { name: 'Du', index: 1, read: (canvas: HTMLElement) => testId(canvas, 'range')!.split('|')[0], expected: (iso: string) => iso },
  { name: 'Au', index: 2, read: (canvas: HTMLElement) => testId(canvas, 'range')!.split('|')[1], expected: (iso: string) => iso },
];
const copyText = async (value: string) => {
  const scratch = document.createElement('input');
  scratch.value = value;
  document.body.append(scratch);
  await real.click(scratch);
  await real.keyboard('{Control>}a{/Control}{Control>}c{/Control}');
  scratch.remove();
};

export const FillEtCollageDansLesTroisChamps: Story = {
  render: () => ({ template: `<lc-sp-fields />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(3));
    const failures: string[] = [];
    const check = (condition: boolean, label: string) => condition || failures.push(label);
    for (const target of targets) {
      const input = () => textboxes(canvasElement)[target.index];
      const clear = async () => {
        await real.click(input());
        await real.keyboard('{ArrowLeft}{ArrowLeft}{Backspace}{ArrowRight}{Backspace}{ArrowRight}{Backspace}');
        await waitFor(() => expect(input().value).toBe('jj/mm/aaaa'));
      };
      // fill
      await real.fill(input(), '01/11/2026');
      check(target.read(canvasElement) === '2026-11-01' && input().value === '01/11/2026', `${target.name} fill jj/mm/aaaa : « ${input().value} » ${target.read(canvasElement)}`);
      await clear();
      await real.fill(input(), '2026-11-01');
      check(target.read(canvasElement) === '2026-11-01' && input().value === '01/11/2026', `${target.name} fill ISO : « ${input().value} » ${target.read(canvasElement)}`);
      await clear();
      // Ctrl + V, zone sélectionnée (état après un clic)
      await copyText('12/11/2026');
      await real.click(input());
      await real.keyboard('{Control>}v{/Control}');
      check(target.read(canvasElement) === '2026-11-12' && input().value === '12/11/2026', `${target.name} Ctrl+V zone sélectionnée : « ${input().value} » ${target.read(canvasElement)}`);
      await clear();
      // Ctrl + V, tout sélectionné
      await real.click(input());
      input().select();
      await real.keyboard('{Control>}v{/Control}');
      check(target.read(canvasElement) === '2026-11-12' && input().value === '12/11/2026', `${target.name} Ctrl+V tout sélectionné : « ${input().value} » ${target.read(canvasElement)}`);
      // collage illisible : rien ne change, aucun message
      const before = [input().value, target.read(canvasElement)];
      await copyText('demain');
      await real.click(input());
      await real.keyboard('{Control>}v{/Control}');
      check(input().value === before[0] && target.read(canvasElement) === before[1], `${target.name} collage illisible : « ${input().value} » ${target.read(canvasElement)}`);
      check(!/non reconnue|illisible|Exemple|incompl/i.test(text(canvasElement)), `${target.name} collage illisible : un message est apparu`);
      await clear();
      // un seul chiffre = une frappe
      await real.click(input());
      await real.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
      await real.keyboard('5');
      check(input().value.startsWith('05/'), `${target.name} un chiffre : « ${input().value} »`);
      await clear();
      // clavier virtuel : beforeinput insertText d'un chiffre
      await real.click(input());
      await real.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
      for (const digit of ['1', '2']) {
        input().dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: digit, bubbles: true, cancelable: true }));
      }
      check(input().value.startsWith('12/'), `${target.name} beforeinput : « ${input().value} »`);
      await clear();
    }
    log('collage/remplissage échecs', failures);
    expect(failures).toEqual([]);
  },
};

export const CollageEnLectureSeule: Story = {
  render: () => ({ template: `<lc-sp-fields readonly />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(3));
    await copyText('12/11/2026');
    for (const input of textboxes(canvasElement)) {
      await real.click(input);
      input.select();
      await real.keyboard('{Control>}v{/Control}');
      expect(input.value, 'lecture seule : rien ne change').toBe('jj/mm/aaaa');
    }
    expect(testId(canvasElement, 'single')).toBe('null');
    expect(testId(canvasElement, 'range')).toBe('null|null');
  },
};

// ---------- 4. Ordre des bornes

const snapshot = (canvas: HTMLElement) => {
  const [from, to] = textboxes(canvas);
  return `Du=${from.value} Au=${to.value} valeur=${testId(canvas, 'value')} message=${count(canvas)} cadres=${[from, to].map((i) => (i.getAttribute('aria-invalid') === 'true' ? 'rouge' : 'ok')).join('/')}`;
};

export const DebutRetapeApresUneFinRefusee: Story = {
  render: () => ({ template: `<lc-sp-order kind="bare" />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(2));
    const [from, to] = textboxes(canvasElement);
    await real.click(from);
    await real.keyboard('10112026');
    await real.click(to);
    await real.keyboard('05112026');
    await waitFor(() => expect(count(canvasElement)).toBe(1));
    // Retape le début zone par zone : instantané après chaque chiffre.
    await real.click(from);
    await real.keyboard('{ArrowLeft}{ArrowLeft}');
    const trace: string[] = [];
    for (const digit of '01112026') {
      await real.keyboard(digit);
      trace.push(`${digit} -> ${snapshot(canvasElement)}`);
    }
    log('retape 01/11/2026 (fin refusée 05/11)', trace);
    expect(testId(canvasElement, 'value')).toBe('2026-11-01|2026-11-05');
    expect(count(canvasElement)).toBe(0);
    expect([from, to].every((i) => i.getAttribute('aria-invalid') === null)).toBe(true);
  },
};

export const DebutRetapeParDatesIntermediaires: Story = {
  render: () => ({ template: `<lc-sp-order kind="bare" />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(2));
    const [from, to] = textboxes(canvasElement);
    await real.click(from);
    await real.keyboard('10112026');
    await real.click(to);
    await real.keyboard('05112026');
    await waitFor(() => expect(count(canvasElement)).toBe(1));
    // Retape 08/11/2026 : 08/01/2026 est une étape intermédiaire valable devant la fin 05/11.
    await real.click(from);
    await real.keyboard('{ArrowLeft}{ArrowLeft}');
    const trace: string[] = [];
    for (const digit of '08112026') {
      await real.keyboard(digit);
      trace.push(`${digit} -> ${snapshot(canvasElement)}`);
    }
    log('retape 08/11/2026 (fin refusée 05/11)', trace);
    const value = testId(canvasElement, 'value')!.split('|');
    const [a, b] = value;
    // Invariants à la fin de la frappe : jamais une période inversée ; si le texte d'un champ est une date complète, la valeur la porte ou le champ est rouge avec le message.
    if (a !== 'null' && b !== 'null') expect(a <= b, `période inversée : ${value.join('|')}`).toBe(true);
    for (const [index, input] of [from, to].entries()) {
      const complete = /^\d\d\/\d\d\/\d{4}$/.test(input.value);
      const carried = value[index] !== 'null' && input.value === value[index].split('-').reverse().join('/');
      const flagged = input.getAttribute('aria-invalid') === 'true' && count(canvasElement) === 1;
      if (complete) expect(carried || flagged, `champ ${index} « ${input.value} » ni porté par la valeur ni signalé : ${snapshot(canvasElement)}`).toBe(true);
    }
  },
};

// ---------- 5. Message d'ordre une seule fois

const orderOnce = (kind: string, afterTouched = false): Story => ({
  render: () => ({ template: `<lc-sp-order kind="${kind}" />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(2));
    const [from, to] = textboxes(canvasElement);
    await real.click(from);
    await real.keyboard('10112026');
    await real.click(to);
    await real.keyboard('05112026');
    const before = count(canvasElement);
    await waitFor(() => expect(canvasElement.querySelector('[role="group"]')).not.toBeNull());
    if (afterTouched || kind !== 'form') {
      await real.tab();
      await real.tab();
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    log(`message ${kind}${afterTouched ? ' touché' : ' non touché'}`, { avantSortie: before, apresSortie: count(canvasElement), ligneSansFin: /Sans date de fin/.test(text(canvasElement)) });
    expect(count(canvasElement), 'message exactement une fois').toBe(1);
    expect(/Sans date de fin/.test(text(canvasElement)), 'ligne « Sans date de fin » absente tant que l’ordre est invalide').toBe(false);
  },
});
export const MessageHorsFormField: Story = orderOnce('bare');
export const MessageDansFormFieldAvecValue: Story = orderOnce('field');
export const MessageSousFormFieldApresTouche: Story = orderOnce('form', true);
/** Sous [formField], avant « touché » : le nombre d'occurrences est mesuré (0 ou 1 acceptables), jamais 2. */
export const MessageSousFormFieldAvantTouche: Story = {
  render: () => ({ template: `<lc-sp-order kind="form" />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(2));
    const [from, to] = textboxes(canvasElement);
    await real.click(from);
    await real.keyboard('10112026');
    await real.click(to);
    await real.keyboard('05112026');
    await new Promise((resolve) => setTimeout(resolve, 100));
    log('message formField avant touché', { occurrences: count(canvasElement), ligneSansFin: /Sans date de fin/.test(text(canvasElement)) });
    expect(count(canvasElement)).toBeLessThanOrEqual(1);
    expect(/Sans date de fin/.test(text(canvasElement))).toBe(false);
  },
};

// ---------- 6. Panneau : tabulation, alignement, hauteur

export const TabulationEtAlignementDeuxMois: Story = {
  render: () => ({ template: `<lc-sp-panel />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(3));
    await real.click(within(canvasElement).getByRole('button', { name: /^Changer la période/ }));
    await waitFor(() => expect(panel()).not.toBeNull());
    await waitFor(() => expect(panel()!.contains(document.activeElement)).toBe(true));
    const dialog = panel()!;
    const grids = [...dialog.querySelectorAll('[role="grid"]')];
    const titles = [...dialog.querySelectorAll<HTMLElement>('button.lc-calendar__title')];
    expect(grids).toHaveLength(2);
    const geometry = titles.map((title, index) => ({ titreTop: Math.round(rect(title).top), titreCentre: Math.round(rect(title).left + rect(title).width / 2), grille: [Math.round(rect(grids[index]).left), Math.round(rect(grids[index]).right)], grilleTop: Math.round(rect(grids[index]).top) }));
    log('alignement des titres', geometry);
    expect(geometry[0].titreTop).toBe(geometry[1].titreTop);
    for (const row of geometry) {
      expect(row.titreCentre).toBeGreaterThanOrEqual(row.grille[0]);
      expect(row.titreCentre).toBeLessThanOrEqual(row.grille[1]);
      expect(row.titreTop).toBeLessThan(row.grilleTop);
    }
    const stopName = (element: Element) => (element.tagName === 'TD' ? 'grille' : (element.querySelector('.lc-calendar__preset-label')?.textContent?.trim() ?? element.getAttribute('aria-label') ?? element.textContent!.replace(/\s+/g, ' ').trim()));
    const order: string[] = [stopName(document.activeElement!)];
    for (let press = 0; press < 13; press++) {
      await real.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
      order.push(stopName(document.activeElement!));
    }
    log('tabulation (focus dans le premier mois)', order);
    const cycle = order.slice(1, 12); // de « Aujourd'hui » à la grille suivante
    expect(cycle.indexOf('Mois précédent')).toBeLessThan(cycle.indexOf('novembre 2026 : choisir un mois'));
    expect(cycle.indexOf('novembre 2026 : choisir un mois')).toBeLessThan(cycle.indexOf('décembre 2026 : choisir un mois'));
    expect(cycle.indexOf('décembre 2026 : choisir un mois')).toBeLessThan(cycle.indexOf('Mois suivant'));
    expect(cycle.indexOf('Mois suivant')).toBeLessThan(cycle.indexOf('grille'));
    expect(cycle.indexOf('grille'), 'la grille vient après « suivant »').toBe(cycle.length - 1);
    expect(order[12]).toBe("Aujourd'hui");
    // Focus dans le second mois : même ordre.
    await real.keyboard('{Escape}');
    await waitFor(() => expect(panel()).toBeNull());
    await real.click(within(canvasElement).getByRole('button', { name: /^Changer la période/ }));
    await waitFor(() => expect(panel()).not.toBeNull());
    await real.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-12-03');
    const second: string[] = [];
    for (let press = 0; press < 5; press++) {
      await real.tab({ shift: true });
      second.push(stopName(document.activeElement!));
    }
    log('Maj+Tab depuis le second mois', second);
    expect(second.slice(0, 4)).toEqual(['Mois suivant', 'décembre 2026 : choisir un mois', 'novembre 2026 : choisir un mois', 'Mois précédent']);
  },
};

/** La hauteur du panneau de la date simple (7 lignes de 40 px, en-tête, pied) est mesurée pour comparaison avec le premier passage. */
export const HauteurDuPanneauDeLaDateSimple: Story = {
  render: () => ({ template: `<lc-sp-panel />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(3));
    await real.click(within(canvasElement).getByRole('button', { name: /^Changer la date/ }));
    await waitFor(() => expect(panel()).not.toBeNull());
    const box = rect(panel()!);
    log('date simple : panneau', { largeur: Math.round(box.width), hauteur: Math.round(box.height) });
    expect(Math.round(box.width)).toBe(304);
  },
};

// ---------- 7. Double clic

export const DoubleClicSurUnJourEnPeriode: Story = {
  render: () => ({ template: `<lc-sp-panel />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(3));
    await real.click(within(canvasElement).getByRole('button', { name: /^Changer la période/ }));
    await waitFor(() => expect(panel()).not.toBeNull());
    await real.dblClick(panel()!.querySelector('td[data-date="2026-11-03"]')!);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(panel(), 'un seul début posé, le panneau reste ouvert').not.toBeNull();
    expect(panel()!.querySelector('[role="status"]')!.textContent).toContain('Début : 3 novembre 2026.');
    expect(testId(canvasElement, 'value')).toBe('2026-11-12|2026-11-14');
  },
};

export const DeuxClicsDistinctsSurLeMemeJour: Story = {
  render: () => ({ template: `<lc-sp-panel />` }),
  play: async ({ canvasElement }) => {
    await reset();
    await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(3));
    await real.click(within(canvasElement).getByRole('button', { name: /^Changer la période/ }));
    await waitFor(() => expect(panel()).not.toBeNull());
    await real.click(panel()!.querySelector('td[data-date="2026-11-03"]')!);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await real.click(panel()!.querySelector('td[data-date="2026-11-03"]')!);
    await waitFor(() => expect(panel()).toBeNull());
    expect(testId(canvasElement, 'value')).toBe('2026-11-03|2026-11-03');
  },
};

// ---------- 8. [value] à undefined

export const ValeurUndefined: Story = {
  render: () => ({ template: `<lc-sp-undefined />` }),
  play: async ({ canvasElement }) => {
    const errors: string[] = [];
    const onError = (event: ErrorEvent) => errors.push(event.message);
    window.addEventListener('error', onError);
    try {
      await waitFor(() => expect(textboxes(canvasElement)).toHaveLength(2));
      expect(textboxes(canvasElement).map((i) => i.value)).toEqual(['jj/mm/aaaa', 'jj/mm/aaaa']);
      expect(errors).toEqual([]);
    } finally {
      window.removeEventListener('error', onError);
    }
  },
};
