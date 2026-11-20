/// <reference types="node" />
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, max, min } from '@angular/forms/signals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LC_LABELS, LC_LABELS_EN, LC_LABELS_FR, LC_LOCALE } from '@lionelcointot/ui-angular';
import * as barrel from '../public-api';
import * as calendarOverlayModule from './calendar-overlay';
import * as calendarPanelModule from './calendar-panel.component';
import * as dateDescribeModule from './date-describe';
import * as dateMaskModule from './date-mask';
import * as dateMathModule from './date-math';
import * as datePresetsModule from './date-presets';
import * as datePartModule from './date-range-part';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import type { LcDateInterval, LcDateIntervalPreset } from './date-interval';
import { LC_DATE_PICKER, type LcDatePickerMode } from './date-picker-mode';
import { LcDateRangeInputComponent } from './date-range-input.component';

// Tests d'acceptation de la spec 2026-11-selecteur-de-date (T6 et T7 : période).
// Écrits depuis la spec, par le composant public `lc-date-range-input` : champs, bouton calendrier, DOM du panneau.
// Aujourd'hui est figé au 19 novembre 2026 sauf mention. Les dates se disent comme Intl les rend (« 1 novembre »).

@Component({
  imports: [LcDateRangeInputComponent],
  template: `<lc-date-range-input [(value)]="value" [min]="min()" [max]="max()" [presets]="presets()" [disabled]="disabled()"
    [readonly]="readonly()" [required]="required()" [ariaLabel]="ariaLabel()" />`,
})
class HostComponent {
  readonly value = signal<LcDateInterval>({ from: null, to: null });
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly presets = signal<readonly LcDateIntervalPreset[] | undefined>(undefined);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly ariaLabel = signal<string | undefined>(undefined);
}

@Component({
  imports: [FormField, LcDateRangeInputComponent, LcFormFieldComponent],
  template: `<lc-form-field label="Période"><lc-date-range-input [formField]="f.range" /></lc-form-field>`,
})
class FormHostComponent {
  readonly model = signal<{ range: LcDateInterval }>({ range: { from: null, to: null } });
  readonly f = form(this.model);
}

/** `matchMedia` factice : seules les requêtes `(min-width: Npx)` sont évaluées, contre la largeur donnée. */
const fakeMatchMedia = (width: number) =>
  ((window as { matchMedia?: unknown }).matchMedia = (query: string) => ({
    matches: width >= Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? Infinity),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  }));

const flat = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');

interface Options {
  mode?: LcDatePickerMode;
  width?: number;
  value?: LcDateInterval;
  min?: string;
  max?: string;
  presets?: readonly LcDateIntervalPreset[];
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  english?: boolean;
  ariaLabel?: string;
}

async function mount(options: Options = {}) {
  fakeMatchMedia(options.width ?? 1280);
  TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: options.mode ?? 'calendar' }] });
  if (options.english) {
    TestBed.overrideProvider(LC_LABELS, { useValue: LC_LABELS_EN });
    TestBed.overrideProvider(LC_LOCALE, { useValue: { locale: 'en-US', currency: 'USD' } });
  }
  const fixture = TestBed.createComponent(HostComponent);
  document.body.append(fixture.nativeElement);
  const host = fixture.componentInstance;
  host.value.set(options.value ?? { from: null, to: null });
  host.min.set(options.min);
  host.max.set(options.max);
  host.presets.set(options.presets);
  host.required.set(options.required ?? false);
  host.disabled.set(options.disabled ?? false);
  host.readonly.set(options.readonly ?? false);
  host.ariaLabel.set(options.ariaLabel);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    await fixture.whenStable();
    await fixture.whenStable();
  };
  const inputs = () => [...root.querySelectorAll<HTMLInputElement>('input')];
  const button = () => root.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]');
  const open = async () => {
    button()!.click();
    await settle();
  };
  const cell = (iso: string) => panel()!.querySelector<HTMLElement>(`td[data-date="${iso}"]`)!;
  const click = async (element: HTMLElement) => {
    element.click();
    await settle();
  };
  const hover = async (element: HTMLElement) => {
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    await settle();
  };
  const press = async (key: string, init: KeyboardEventInit = {}) => {
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
    await settle();
  };
  const typeInto = async (input: HTMLInputElement, digits: string) => {
    input.focus();
    for (const char of digits) input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
    await settle();
  };
  const blur = async (input: HTMLInputElement) => {
    input.blur();
    await settle();
  };
  const buttonByText = (text: RegExp) => [...panel()!.querySelectorAll<HTMLButtonElement>('button')].find((b) => text.test(flat(b.textContent)));
  const status = () => flat(panel()!.querySelector('[role="status"]')?.textContent);
  const grids = () => panel()!.querySelectorAll('[role="grid"]');
  const gridTitle = (index: number) => flat(document.getElementById(grids()[index].getAttribute('aria-labelledby')!)!.textContent);
  const titleButtons = () => [...panel()!.querySelectorAll<HTMLButtonElement>('button')].filter((b) => /: choisir un(e)? (mois|année)$|: choose a (month|year)$/.test(b.getAttribute('aria-label') ?? ''));
  const note = () => flat(root.textContent);
  const frames = () => inputs().map((i) => i.getAttribute('aria-invalid') === 'true');
  return { fixture, host, root, inputs, button, open, cell, click, hover, press, typeInto, blur, buttonByText, status, grids, gridTitle, titleButtons, note, frames, settle };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 19, 12));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  delete (window as { matchMedia?: unknown }).matchMedia;
  TestBed.resetTestingModule();
});

describe('CA-11 disabled et readonly (période)', () => {
  it('CA-11 : désactivé, ni bouton ni panneau, champs désactivés', async () => {
    const { button, inputs, root } = await mount({ disabled: true });
    expect(button()).toBeNull();
    expect(root.querySelector('button')).toBeNull();
    expect(panel()).toBeNull();
    expect(inputs()).toHaveLength(2);
    expect(inputs().every((i) => i.disabled)).toBe(true);
  });

  it('CA-11 : lecture seule, ni bouton ni panneau, zones non modifiables', async () => {
    const { host, button, inputs, press, root, settle } = await mount({ readonly: true, value: { from: '2026-03-05', to: '2026-03-09' } });
    for (const input of inputs()) {
      input.focus();
      await press('1');
      await press('ArrowUp');
      await press('Backspace');
      await press('ArrowDown', { altKey: true });
    }
    await settle();
    expect(inputs().every((i) => i.readOnly)).toBe(true);
    expect(inputs().map((i) => i.value)).toEqual(['05/03/2026', '09/03/2026']);
    expect(host.value()).toEqual({ from: '2026-03-05', to: '2026-03-09' });
    expect(button()).toBeNull();
    expect(root.querySelector('button')).toBeNull();
    expect(panel()).toBeNull();
  });
});

describe('CA-28 [formField], [(value)], LcDateInterval', () => {
  it('CA-28 : [(value)] : la frappe met la période à jour, la valeur posée par le code s’affiche, la forme est { from, to }', async () => {
    const { host, inputs, typeInto, settle } = await mount();
    await typeInto(inputs()[0], '03112026');
    await typeInto(inputs()[1], '12112026');
    expect(host.value()).toEqual({ from: '2026-11-03', to: '2026-11-12' });
    expect(Object.keys(host.value()).sort()).toEqual(['from', 'to']);
    host.value.set({ from: '2026-01-02', to: '2026-02-03' });
    await settle();
    expect(inputs().map((i) => i.value)).toEqual(['02/01/2026', '03/02/2026']);
  });

  it('CA-28 : [formField] : la période va et vient, le champ du formulaire est valide', async () => {
    const fixture = TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }).createComponent(FormHostComponent);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const inputs = [...(fixture.nativeElement as HTMLElement).querySelectorAll('input')];
    const type = async (input: HTMLInputElement, digits: string) => {
      input.focus();
      for (const char of digits) input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    };
    await type(inputs[0], '10112026');
    await type(inputs[1], '20112026');
    expect(fixture.componentInstance.model().range).toEqual({ from: '2026-11-10', to: '2026-11-20' });
    expect(fixture.componentInstance.f.range().invalid()).toBe(false);
    fixture.componentInstance.model.set({ range: { from: '2026-12-01', to: '2026-12-31' } });
    await fixture.whenStable();
    expect(inputs.map((i) => i.value)).toEqual(['01/12/2026', '31/12/2026']);
  });
});

describe('CA-29 deux clics', () => {
  it('CA-29 : deux clics donnent { from, to } dans l’ordre et ferment au second clic', async () => {
    const { host, open, cell, click } = await mount();
    await open();
    await click(cell('2026-11-05'));
    expect(panel()).not.toBeNull();
    expect(host.value()).toEqual({ from: null, to: null });
    await click(cell('2026-11-10'));
    expect(host.value()).toEqual({ from: '2026-11-05', to: '2026-11-10' });
    expect(panel()).toBeNull();
  });

  it('CA-29 : un second jour antérieur au premier inverse les deux', async () => {
    const { host, open, cell, click } = await mount();
    await open();
    await click(cell('2026-11-12'));
    await click(cell('2026-11-04'));
    expect(host.value()).toEqual({ from: '2026-11-04', to: '2026-11-12' });
    expect(panel()).toBeNull();
  });

  it('CA-29 : un clic alors qu’une période complète existe commence un nouveau début', async () => {
    const { host, open, cell, click, status } = await mount({ value: { from: '2026-11-03', to: '2026-11-12' } });
    await open();
    await click(cell('2026-11-20'));
    expect(panel()).not.toBeNull();
    expect(status()).toContain('Début : 20 novembre 2026.');
    expect(host.value()).toEqual({ from: '2026-11-03', to: '2026-11-12' });
    await click(cell('2026-11-25'));
    expect(host.value()).toEqual({ from: '2026-11-20', to: '2026-11-25' });
    expect(panel()).toBeNull();
  });
});

describe('CA-30 choix de la fin', () => {
  const STATUS_START = 'Début : 3 novembre 2026. Choisissez la date de fin, ou cliquez sur « Sans date de fin ».';

  it('CA-30 : ligne d’état avant et après le premier clic', async () => {
    const { open, cell, click, status } = await mount();
    await open();
    expect(status()).toBe('Choisissez la date de début.');
    await click(cell('2026-11-03'));
    expect(status()).toBe(STATUS_START);
  });

  it('CA-30 : « Sans date de fin » et « Changer le début » n’apparaissent qu’après le premier clic', async () => {
    const { open, cell, click, buttonByText } = await mount();
    await open();
    expect(buttonByText(/^Sans date de fin$/)).toBeUndefined();
    expect(buttonByText(/^Changer le début$/)).toBeUndefined();
    await click(cell('2026-11-03'));
    expect(buttonByText(/^Sans date de fin$/)).toBeDefined();
    expect(buttonByText(/^Changer le début$/)).toBeDefined();
  });

  it('CA-30 : le survol marque l’aperçu sur les jours entre le début et le jour survolé, pas au-delà', async () => {
    const { open, cell, click, hover } = await mount();
    await open();
    await click(cell('2026-11-03'));
    await hover(cell('2026-11-07'));
    const preview = (iso: string) => /preview/.test(cell(iso).getAttribute('data-range') ?? '');
    expect([preview('2026-11-04'), preview('2026-11-05'), preview('2026-11-06')]).toEqual([true, true, true]);
    expect(preview('2026-11-10')).toBe(false);
    expect(preview('2026-11-02')).toBe(false);
  });

  it('CA-30 : aux flèches, les jours parcourus portent la marque d’aperçu', async () => {
    const { open, cell, click, press } = await mount();
    await open();
    await click(cell('2026-11-03'));
    cell('2026-11-03').focus();
    await press('ArrowRight');
    await press('ArrowRight');
    await press('ArrowRight');
    const preview = (iso: string) => /preview/.test(cell(iso).getAttribute('data-range') ?? '');
    expect([preview('2026-11-04'), preview('2026-11-05')]).toEqual([true, true]);
    expect(preview('2026-11-12')).toBe(false);
  });

  it('CA-30 : « Sans date de fin » donne { from, to: null } et ferme', async () => {
    const { host, open, cell, click, buttonByText } = await mount();
    await open();
    await click(cell('2026-11-03'));
    await click(buttonByText(/^Sans date de fin$/)!);
    expect(host.value()).toEqual({ from: '2026-11-03', to: null });
    expect(panel()).toBeNull();
  });

  it('CA-30 : « Changer le début » revient à la première phrase, panneau ouvert, valeur inchangée', async () => {
    const { host, open, cell, click, buttonByText, status } = await mount({ value: { from: '2026-11-01', to: '2026-11-02' } });
    await open();
    await click(cell('2026-11-10'));
    await click(buttonByText(/^Changer le début$/)!);
    expect(status()).toBe('Choisissez la date de début.');
    expect(panel()).not.toBeNull();
    expect(host.value()).toEqual({ from: '2026-11-01', to: '2026-11-02' });
  });

  it('CA-30 : Échap pendant le choix de la fin ferme et laisse la valeur d’avant', async () => {
    const { host, open, cell, click, press, button } = await mount({ value: { from: '2026-11-01', to: '2026-11-02' } });
    await open();
    await click(cell('2026-11-10'));
    cell('2026-11-10').focus();
    await press('Escape');
    expect(panel()).toBeNull();
    expect(host.value()).toEqual({ from: '2026-11-01', to: '2026-11-02' });
    expect(document.activeElement).toBe(button());
  });
});

describe('CA-31 une seule borne', () => {
  it('CA-31 : début seul valide, sans état invalide, avec sa ligne', async () => {
    const { host, root, note, frames, settle } = await mount();
    host.value.set({ from: '2026-11-01', to: null });
    await settle();
    expect(note()).toContain('Sans date de fin : tout depuis le 1 novembre 2026.');
    expect(frames()).toEqual([false, false]);
    expect(root.querySelector('[aria-invalid="true"]')).toBeNull();
  });

  it('CA-31 : fin seule valide, sans état invalide, avec sa ligne', async () => {
    const { host, root, note, frames, settle } = await mount();
    host.value.set({ from: null, to: '2026-11-30' });
    await settle();
    expect(note()).toContain('Sans date de début : tout jusqu’au 30 novembre 2026.'.replace('’', "'"));
    expect(frames()).toEqual([false, false]);
    expect(root.querySelector('[aria-invalid="true"]')).toBeNull();
  });

  it('CA-31 : taper le début seul donne { from, to: null } et la ligne ; les deux bornes ou aucune : pas de ligne', async () => {
    const { host, inputs, typeInto, note, frames, settle } = await mount();
    await typeInto(inputs()[0], '01112026');
    expect(host.value()).toEqual({ from: '2026-11-01', to: null });
    expect(note()).toContain('Sans date de fin');
    expect(frames()).toEqual([false, false]);
    host.value.set({ from: '2026-11-01', to: '2026-11-30' });
    await settle();
    expect(note()).not.toMatch(/Sans date de/);
    host.value.set({ from: null, to: null });
    await settle();
    expect(note()).not.toMatch(/Sans date de/);
  });
});

describe('CA-32 fin avant début, borne incomplète', () => {
  const MESSAGE = 'La date de fin est avant la date de début.';
  const count = (text: string) => text.split(MESSAGE).length - 1;

  it('CA-32 : fin tapée avant le début : la borne vaut null, champ de fin invalide, le message une fois', async () => {
    const { host, inputs, typeInto, frames, root } = await mount({ value: { from: '2026-11-10', to: null } });
    await typeInto(inputs()[1], '05112026');
    expect(host.value()).toEqual({ from: '2026-11-10', to: null });
    expect(frames()).toEqual([false, true]);
    expect(count(flat(root.textContent))).toBe(1);
  });

  it('CA-32 : début tapé après la fin : la borne vaut null, champ de début invalide, le message', async () => {
    const { host, inputs, typeInto, frames, root } = await mount({ value: { from: null, to: '2026-11-10' } });
    await typeInto(inputs()[0], '15112026');
    expect(host.value()).toEqual({ from: null, to: '2026-11-10' });
    expect(frames()).toEqual([true, false]);
    expect(count(flat(root.textContent))).toBe(1);
  });

  it('CA-32 : une fin valable fait disparaître l’état et le message', async () => {
    const { host, inputs, typeInto, frames, root } = await mount({ value: { from: '2026-11-10', to: null } });
    await typeInto(inputs()[1], '05112026');
    inputs()[1].focus();
    host.value.set({ from: '2026-11-10', to: '2026-11-12' });
    await typeInto(inputs()[1], '');
    expect(frames()).toEqual([false, false]);
    expect(count(flat(root.textContent))).toBe(0);
  });

  it('CA-32 : borne incomplète à la sortie : null, cadre invalide du champ concerné, aucun message', async () => {
    const { host, inputs, typeInto, blur, frames, root } = await mount({ value: { from: '2026-11-10', to: '2026-11-20' } });
    await typeInto(inputs()[1], '');
    inputs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    await blur(inputs()[1]);
    expect(host.value().to).toBeNull();
    expect(frames()).toEqual([false, true]);
    expect(count(flat(root.textContent))).toBe(0);
    expect(root.textContent).not.toMatch(/incompl|Exemple/i);
  });

  it('CA-32 : sous [formField] et lc-form-field : erreur parse avec le message, affichée une seule fois', async () => {
    const fixture = TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }).createComponent(FormHostComponent);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = [...el.querySelectorAll('input')];
    const type = async (input: HTMLInputElement, digits: string) => {
      input.focus();
      for (const char of digits) input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    };
    await type(inputs[0], '10112026');
    await type(inputs[1], '05112026');
    inputs[1].blur();
    await fixture.whenStable();
    expect(fixture.componentInstance.model().range).toEqual({ from: '2026-11-10', to: null });
    const state = fixture.componentInstance.f.range();
    expect(state.invalid()).toBe(true);
    expect(state.errors()).toEqual([expect.objectContaining({ kind: 'parse', message: MESSAGE })]);
    expect(count(flat(el.textContent))).toBe(1);
  });
});

describe('CA-33 raccourcis', () => {
  // libellé et dates sont deux lignes (deux éléments) du même bouton
  const dates = (button: HTMLButtonElement) => [...button.querySelectorAll('span')].map((s) => flat(s.textContent));
  const labelOf = { seven: /7 derniers jours/, thirty: /30 derniers jours/, month: /Ce mois-ci/, last: /Le mois dernier/ };

  it('CA-33 : au 19 novembre 2026, quatre raccourcis avec leurs dates visibles sous le libellé', async () => {
    const { open, buttonByText } = await mount();
    await open();
    expect(dates(buttonByText(labelOf.seven)!)).toEqual(['7 derniers jours', 'du 13 au 19 novembre 2026']);
    expect(dates(buttonByText(labelOf.thirty)!)).toEqual(['30 derniers jours', 'du 21 octobre au 19 novembre 2026']);
    expect(dates(buttonByText(labelOf.month)!)).toEqual(['Ce mois-ci', 'du 1 au 30 novembre 2026']);
    expect(dates(buttonByText(labelOf.last)!)).toEqual(['Le mois dernier', 'du 1 au 31 octobre 2026']);
  });

  it.each([
    ['7 derniers jours', labelOf.seven, { from: '2026-11-13', to: '2026-11-19' }],
    ['30 derniers jours', labelOf.thirty, { from: '2026-10-21', to: '2026-11-19' }],
    ['Ce mois-ci', labelOf.month, { from: '2026-11-01', to: '2026-11-30' }],
    ['Le mois dernier', labelOf.last, { from: '2026-10-01', to: '2026-10-31' }],
  ])('CA-33 : « %s » remplit les deux champs, ferme le panneau', async (_name, label, expected) => {
    const { host, open, click, buttonByText, inputs } = await mount();
    await open();
    await click(buttonByText(label)!);
    expect(host.value()).toEqual(expected);
    expect(panel()).toBeNull();
    const [y1, m1, d1] = expected.from.split('-');
    const [y2, m2, d2] = expected.to.split('-');
    expect(inputs().map((i) => i.value)).toEqual([`${d1}/${m1}/${y1}`, `${d2}/${m2}/${y2}`]);
  });

  it('CA-33 : au 1er mars 2026, « Le mois dernier » = 1er au 28 février', async () => {
    vi.setSystemTime(new Date(2026, 2, 1, 12));
    const { host, open, click, buttonByText } = await mount();
    await open();
    await click(buttonByText(labelOf.last)!);
    expect(host.value()).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('CA-33 : au 1er janvier 2026, « Le mois dernier » = 1er au 31 décembre 2025', async () => {
    vi.setSystemTime(new Date(2026, 0, 1, 12));
    const { host, open, click, buttonByText } = await mount();
    await open();
    await click(buttonByText(labelOf.last)!);
    expect(host.value()).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('CA-33 : avec max = aujourd’hui, « Ce mois-ci » s’arrête à aujourd’hui', async () => {
    const { host, open, click, buttonByText } = await mount({ max: '2026-11-19' });
    await open();
    await click(buttonByText(labelOf.month)!);
    expect(host.value()).toEqual({ from: '2026-11-01', to: '2026-11-19' });
  });

  it('CA-33 : un raccourci entièrement hors bornes est désactivé, les autres non', async () => {
    const { open, buttonByText, host } = await mount({ min: '2026-11-01' });
    await open();
    const last = buttonByText(labelOf.last)!;
    expect(last.disabled).toBe(true);
    expect(dates(last)).toContain('Aucune date autorisée sur cette période.');
    expect(buttonByText(labelOf.month)!.disabled).toBe(false);
    last.click();
    expect(host.value()).toEqual({ from: null, to: null });
  });

  it('CA-33 : presets = [] n’affiche aucun raccourci', async () => {
    const { open, buttonByText } = await mount({ presets: [] });
    await open();
    for (const label of Object.values(labelOf)) expect(buttonByText(label)).toBeUndefined();
    expect(panel()!.textContent).not.toMatch(/derniers jours|Ce mois-ci|Le mois dernier/);
  });
});

describe('CA-34 nombre de mois selon la largeur', () => {
  it.each([
    [1280, 2],
    [800, 2],
    [640, 2],
    [639, 1],
    [360, 1],
  ])('CA-34 : à %i px, %i mois', async (width, months) => {
    const { open, grids } = await mount({ width });
    await open();
    expect(grids()).toHaveLength(months);
  });
});

describe('CA-35 titre du second mois', () => {
  it('CA-35 : un clic sur le titre du second mois ouvre une seule grille de douze mois ; choisir un mois revient à deux mois, ce mois à gauche, valeur inchangée', async () => {
    const { host, open, click, titleButtons, grids, gridTitle, cell } = await mount({ value: { from: '2026-12-10', to: '2026-12-12' } });
    await open();
    expect(grids()).toHaveLength(2);
    expect(gridTitle(0)).toBe('décembre 2026');
    expect(gridTitle(1)).toBe('janvier 2027');
    await click(titleButtons()[1]);
    expect(grids()).toHaveLength(1);
    expect(gridTitle(0)).toBe('2027');
    expect(grids()[0].querySelectorAll('td[data-date]')).toHaveLength(12);
    await click(cell('2027-03-01'));
    expect(grids()).toHaveLength(2);
    expect(gridTitle(0)).toBe('mars 2027');
    expect(gridTitle(1)).toBe('avril 2027');
    expect(host.value()).toEqual({ from: '2026-12-10', to: '2026-12-12' });
    expect(panel()).not.toBeNull();
  });

  it('CA-35 : le titre du premier mois ouvre aussi une seule grille', async () => {
    const { open, click, titleButtons, grids } = await mount();
    await open();
    await click(titleButtons()[0]);
    expect(grids()).toHaveLength(1);
    expect(grids()[0].querySelectorAll('td[data-date]')).toHaveLength(12);
  });
});

describe('CA-36 mode natif', () => {
  it('CA-36 : deux input[type=date], aucun min ni max sans valeur', async () => {
    const { inputs, button } = await mount({ mode: 'native' });
    expect(inputs().map((i) => i.type)).toEqual(['date', 'date']);
    expect(inputs().every((i) => !i.hasAttribute('min') && !i.hasAttribute('max'))).toBe(true);
    expect(button()).toBeNull();
    expect(panel()).toBeNull();
  });

  it('CA-36 : max du premier = fin choisie, min du second = début choisi', async () => {
    const { inputs, host, settle } = await mount({ mode: 'native' });
    host.value.set({ from: '2026-03-02', to: '2026-03-09' });
    await settle();
    expect(inputs()[0].getAttribute('max')).toBe('2026-03-09');
    expect(inputs()[1].getAttribute('min')).toBe('2026-03-02');
    host.value.set({ from: '2026-03-02', to: null });
    await settle();
    expect(inputs()[0].hasAttribute('max')).toBe(false);
    expect(inputs()[1].getAttribute('min')).toBe('2026-03-02');
    host.value.set({ from: null, to: '2026-03-09' });
    await settle();
    expect(inputs()[0].getAttribute('max')).toBe('2026-03-09');
    expect(inputs()[1].hasAttribute('min')).toBe(false);
  });

  it('CA-36 : les raccourcis sont une rangée de boutons sous les champs', async () => {
    const { root, inputs, host, settle } = await mount({ mode: 'native' });
    const row = root.querySelector('[role="group"][aria-label="Raccourcis"]')!;
    expect(row).not.toBeNull();
    expect(row.querySelectorAll('button')).toHaveLength(4);
    expect(inputs()[1].compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const seven = [...row.querySelectorAll('button')].find((b) => /7 derniers jours/.test(b.textContent!))!;
    seven.click();
    await settle();
    expect(host.value()).toEqual({ from: '2026-11-13', to: '2026-11-19' });
  });
});

describe('CA-37 focus() et groupe', () => {
  it('CA-37 : focus() donne le focus au champ de début', async () => {
    const { fixture, inputs } = await mount();
    (fixture.debugElement.children[0].componentInstance as LcDateRangeInputComponent).focus();
    expect(document.activeElement).toBe(inputs()[0]);
  });

  it('CA-37 : le groupe porte role="group" et le nom « Période », ou ariaLabel', async () => {
    const first = await mount();
    expect(first.root.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Période');
    document.body.replaceChildren();
    TestBed.resetTestingModule();
    const second = await mount({ ariaLabel: 'Séjour' });
    expect(second.root.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Séjour');
  });
});

describe('CA-38 libellés de la période, français et anglais', () => {
  it('CA-38 : chaque clé de LC_LABELS (toutes, y compris la période) existe dans les deux langues, du même type', () => {
    const shape = (value: unknown): unknown =>
      value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]).sort()) : typeof value;
    expect(shape(LC_LABELS_EN)).toEqual(shape(LC_LABELS_FR));
  });

  it('CA-38 : panneau de période en anglais : textes, raccourcis, dates, mois et jours anglais', async () => {
    const { open, cell, click, buttonByText, status, gridTitle, button, inputs, root } = await mount({ english: true });
    expect(button()!.getAttribute('aria-label')).toBe('Choose a period');
    expect(root.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Period');
    expect([...root.querySelectorAll('label')].map((l) => l.textContent!.trim())).toEqual(['From', 'To']);
    expect(inputs()[0].value).toBe('mm/dd/yyyy');
    await open();
    expect(panel()!.getAttribute('aria-label')).toBe('Choose a period');
    expect(status()).toBe('Choose the start date.');
    expect(gridTitle(0)).toBe('November 2026');
    expect([...buttonByText(/Last 7 days/)!.querySelectorAll('span')].map((s) => flat(s.textContent))).toEqual(['Last 7 days', 'from November 13 to 19, 2026']);
    expect(buttonByText(/Last 30 days/)).toBeDefined();
    expect(buttonByText(/^This month/)).toBeDefined();
    expect(buttonByText(/^Last month/)).toBeDefined();
    expect(buttonByText(/^Today$/)).toBeDefined();
    expect(buttonByText(/^Clear period$/)).toBeDefined();
    const weekdays = [...panel()!.querySelectorAll('thead abbr')].slice(0, 7).map((abbr) => abbr.getAttribute('title'));
    expect(weekdays).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    await click(cell('2026-11-03'));
    expect(status()).toBe('Start: November 3, 2026. Choose the end date, or click "No end date".');
    expect(buttonByText(/^Change start date$/)).toBeDefined();
    await click(buttonByText(/^No end date$/)!);
    expect(button()!.getAttribute('aria-label')).toBe('Change period, starting November 3, 2026');
  });

  it('CA-38 : en anglais, bouton d’une période complète, ligne d’une seule borne', async () => {
    const { button, host, note, settle } = await mount({ english: true, value: { from: '2026-11-03', to: '2026-11-12' } });
    expect(button()!.getAttribute('aria-label')).toBe('Change period, from November 3 to 12, 2026');
    host.value.set({ from: '2026-11-01', to: null });
    await settle();
    expect(note()).toContain('No end date: everything from November 1, 2026.');
    host.value.set({ from: null, to: '2026-11-30' });
    await settle();
    expect(note()).toContain('No start date: everything up to November 30, 2026.');
  });
});

describe('CA-39 rien d’interne exporté', () => {
  const internal: Record<string, object> = {
    'calendar-panel': calendarPanelModule,
    'date-math': dateMathModule,
    'date-mask': dateMaskModule,
    'date-presets': datePresetsModule,
    'date-range-part': datePartModule,
    'calendar-overlay': calendarOverlayModule,
    'date-describe': dateDescribeModule,
  };

  it.each(Object.keys(internal))('CA-39 : aucun nom de %s n’est exporté par public-api (sauf toIsoDate)', (name) => {
    const exported = Object.keys(barrel);
    const leaked = Object.keys(internal[name]).filter((n) => n !== 'toIsoDate' && exported.includes(n));
    expect(leaked).toEqual([]);
  });

  it('CA-39 : le texte de public-api ne nomme aucun fichier interne ; date-math seulement pour toIsoDate', () => {
    const text = readFileSync(resolve(process.cwd(), 'packages/angular/forms/src/public-api.ts'), 'utf8');
    expect(text).not.toMatch(/calendar-panel|date-mask|date-presets|date-range-part|calendar-overlay|date-describe/);
    expect(text.split('\n').filter((line) => /date-math/.test(line))).toEqual(["export { toIsoDate } from './date-input/date-math';"]);
  });

  it('CA-39 : le composant public est exporté, aucune classe interne', () => {
    expect(Object.keys(barrel)).toContain('LcDateRangeInputComponent');
    expect(Object.keys(barrel)).toContain('LC_DATE_PICKER');
    expect(Object.keys(barrel)).not.toContain('LC_DATE_PART');
    expect(Object.keys(barrel)).not.toContain('LcCalendarPanelComponent');
  });
});

describe('CA-40 catalogue', () => {
  it('CA-40 : CATALOGUE.md décrit lc-date-range-input avec ses entrées et sa sortie', () => {
    const text = readFileSync(resolve(process.cwd(), 'packages/angular/CATALOGUE.md'), 'utf8');
    const line = text.split('\n').find((l) => l.includes('`lc-date-range-input`'))!;
    expect(line).toContain('LcDateRangeInputComponent');
    for (const entry of ['value (model)', 'min', 'max', 'presets', 'disabled', 'readonly', 'invalid', 'touched', 'required', 'errors', 'size', 'fillMode', 'rounded', 'inputId', 'ariaLabel']) expect(line).toContain(entry);
    expect(line).toContain('touch');
  });
});

describe('CA-32 (champs) mêmes règles de zones que la date simple, dans « Du » et « Au »', () => {
  it('CA-32 : 1 2 1 1 2 0 2 6 dans « Au » donne 12/11/2026 ; « Du » reste vide', async () => {
    const { host, inputs, typeInto } = await mount();
    await typeInto(inputs()[1], '12112026');
    expect(inputs()[1].value).toBe('12/11/2026');
    expect(host.value()).toEqual({ from: null, to: '2026-11-12' });
  });

  it('CA-32 : un jour impossible ne se saisit pas, sans message ni état invalide (31, 02, 2026 donne 28/02/2026)', async () => {
    const { host, inputs, typeInto, frames, root } = await mount();
    await typeInto(inputs()[0], '31022026');
    expect(inputs()[0].value).toBe('28/02/2026');
    expect(host.value()).toEqual({ from: '2026-02-28', to: null });
    expect(frames()).toEqual([false, false]);
    expect(root.textContent).not.toMatch(/n.existe pas|impossible|invalide|Exemple/i);
  });

  it('CA-32 : date incomplète dans « Du » à la sortie : null, cadre de « Du » seul invalide, aucun message', async () => {
    const { host, inputs, typeInto, blur, frames, root } = await mount({ value: { from: null, to: '2026-11-20' } });
    await typeInto(inputs()[0], '12');
    await blur(inputs()[0]);
    expect(inputs()[0].value).toBe('12/mm/aaaa');
    expect(host.value()).toEqual({ from: null, to: '2026-11-20' });
    expect(frames()).toEqual([true, false]);
    expect(root.textContent).not.toMatch(/avant la date|incompl|Exemple/i);
  });
});

describe('Validateurs min / max de Signal Forms posés sur le champ de période (point 4b)', () => {
  it('un validateur min ou max numérique ne casse ni le rendu, ni la saisie, ni le panneau, ni les bornes', async () => {
    @Component({
      imports: [FormField, LcDateRangeInputComponent],
      template: `<lc-date-range-input [formField]="f.range" />`,
    })
    class ValidatedHostComponent {
      readonly model = signal<{ range: LcDateInterval }>({ range: { from: null, to: null } });
      readonly f = form(this.model, (path) => {
        // `min` et `max` de Signal Forms ne se typent que sur un nombre : l'essai force le type pour voir ce que le champ en fait.
        min(path.range as never, 5);
        max(path.range as never, 10);
      });
    }
    fakeMatchMedia(1280);
    const fixture = TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }).createComponent(ValidatedHostComponent);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = [...el.querySelectorAll('input')];
    for (const digits of ['10112026', '20112026']) {
      const input = inputs[digits === '10112026' ? 0 : 1];
      input.focus();
      for (const char of digits) input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    }
    expect(fixture.componentInstance.model().range).toEqual({ from: '2026-11-10', to: '2026-11-20' });
    expect(fixture.componentInstance.f.range().invalid()).toBe(false);
    el.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!.click();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(panel()).not.toBeNull();
    expect(panel()!.querySelectorAll('td[aria-disabled="true"]')).toHaveLength(0);
  });
});

describe('CA-30 ligne d’état à l’ouverture sur une sélection existante', () => {
  it('CA-30 : période complète : « Période : du 12 au 20 novembre 2026 inclus. Cliquez un jour pour la changer. »', async () => {
    const { open, status } = await mount({ value: { from: '2026-11-12', to: '2026-11-20' } });
    await open();
    expect(status()).toBe('Période : du 12 au 20 novembre 2026 inclus. Cliquez un jour pour la changer.');
  });

  it('CA-30 : début seul : « Depuis le 18 novembre 2026, sans date de fin. Cliquez un jour pour changer. »', async () => {
    const { open, status } = await mount({ value: { from: '2026-11-18', to: null } });
    await open();
    expect(status()).toBe('Depuis le 18 novembre 2026, sans date de fin. Cliquez un jour pour changer.');
  });

  it('CA-30 : fin seule : « Jusqu’au 20 novembre 2026 inclus, sans date de début. Cliquez un jour pour changer. »', async () => {
    const { open, status } = await mount({ value: { from: null, to: '2026-11-20' } });
    await open();
    expect(status()).toBe("Jusqu'au 20 novembre 2026 inclus, sans date de début. Cliquez un jour pour changer.");
  });

  it('CA-30 : sans sélection : « Choisissez la date de début. »', async () => {
    const { open, status } = await mount();
    await open();
    expect(status()).toBe('Choisissez la date de début.');
  });

  it('CA-30 : après un premier clic, la phrase d’avant ; « Changer le début » revient à « Choisissez la date de début. », valeur inchangée', async () => {
    const { host, open, cell, click, buttonByText, status } = await mount({ value: { from: '2026-11-12', to: '2026-11-20' } });
    await open();
    await click(cell('2026-11-03'));
    expect(status()).toBe('Début : 3 novembre 2026. Choisissez la date de fin, ou cliquez sur « Sans date de fin ».');
    await click(buttonByText(/^Changer le début$/)!);
    expect(status()).toBe('Choisissez la date de début.');
    expect(host.value()).toEqual({ from: '2026-11-12', to: '2026-11-20' });
  });

  it('CA-30 : sélection d’un jour : la ligne d’état suit la valeur posée par le code tant qu’aucun jour n’est cliqué', async () => {
    const { host, open, status, settle } = await mount({ value: { from: '2026-11-12', to: '2026-11-20' } });
    await open();
    host.value.set({ from: '2026-11-18', to: null });
    await settle();
    expect(status()).toBe('Depuis le 18 novembre 2026, sans date de fin. Cliquez un jour pour changer.');
  });

  it('CA-30 et CA-38 : en anglais, textes réellement affichés', async () => {
    const full = await mount({ english: true, value: { from: '2026-11-12', to: '2026-11-20' } });
    await full.open();
    const texts = [full.status()];
    document.body.replaceChildren();
    TestBed.resetTestingModule();
    const from = await mount({ english: true, value: { from: '2026-11-18', to: null } });
    await from.open();
    texts.push(from.status());
    document.body.replaceChildren();
    TestBed.resetTestingModule();
    const until = await mount({ english: true, value: { from: null, to: '2026-11-20' } });
    await until.open();
    texts.push(until.status());
    expect(texts).toEqual([
      'Period: from November 12 to 20, 2026 inclusive. Click a day to change it.',
      'Since November 18, 2026, no end date. Click a day to change.',
      'Until November 20, 2026 inclusive, no start date. Click a day to change.',
    ]);
  });
});
