/// <reference types="node" />
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { LC_LABELS, LC_LABELS_EN, LC_LABELS_FR, LC_LOCALE } from '@lionelcointot/ui-angular';
import * as barrel from '../public-api';
import * as calendarPanelModule from './calendar-panel.component';
import * as dateMaskModule from './date-mask';
import * as dateMathModule from './date-math';
import { LcDateInputComponent } from './date-input.component';
import { LC_DATE_PICKER } from './date-picker-mode';

// Tests d'acceptation de la spec 2026-11-selecteur-de-date (T3 à T5 : panneau de calendrier de la date simple).
// Écrits depuis la spec, par le composant public `lc-date-input` : bouton calendrier, clavier, DOM du panneau.
// Aujourd'hui est figé au 19 novembre 2026.

@Component({
  imports: [LcDateInputComponent],
  template: `<lc-date-input ariaLabel="Date" [(value)]="value" [min]="min()" [max]="max()" [required]="required()" />
    <button id="other" type="button">autre</button>`,
})
class HostComponent {
  readonly value = signal<string | null>(null);
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly required = signal(false);
}

const panel = () => document.querySelector<HTMLElement>('lc-calendar-panel');

async function mount(options: { value?: string | null; min?: string; max?: string; required?: boolean; english?: boolean } = {}) {
  TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] });
  if (options.english) {
    TestBed.overrideProvider(LC_LABELS, { useValue: LC_LABELS_EN });
    TestBed.overrideProvider(LC_LOCALE, { useValue: { locale: 'en-US', currency: 'USD' } });
  }
  const fixture = TestBed.createComponent(HostComponent);
  document.body.append(fixture.nativeElement);
  const host = fixture.componentInstance;
  host.value.set(options.value ?? null);
  host.min.set(options.min);
  host.max.set(options.max);
  host.required.set(options.required ?? false);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const settle = () => fixture.whenStable();
  const input = root.querySelector('input')!;
  const button = () => root.querySelector<HTMLButtonElement>('lc-date-input button')!;
  const open = async () => {
    button().click();
    await settle();
  };
  const cell = (iso: string) => panel()!.querySelector<HTMLElement>(`td[data-date="${iso}"]`)!;
  const click = async (element: HTMLElement) => {
    element.click();
    await settle();
  };
  const press = async (key: string, init: KeyboardEventInit = {}) => {
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
    await settle();
  };
  const focused = () => (document.activeElement as HTMLElement | null)?.dataset['date'];
  const gridTitle = () => document.getElementById(panel()!.querySelector('[role="grid"]')!.getAttribute('aria-labelledby')!)!.textContent!.trim();
  const titleButton = () => panel()!.querySelector<HTMLButtonElement>('button.lc-calendar__title')!;
  const footer = (text: RegExp) => [...panel()!.querySelectorAll<HTMLButtonElement>('button')].find((b) => text.test(b.textContent!));
  const current = () =>
    !panel()!.querySelector('.lc-calendar__grid--wide') ? 0 : /\d+ à \d+/.test(gridTitle()) ? 2 : 1;
  const level = async (target: 'day' | 'month' | 'year') => {
    const wanted = ['day', 'month', 'year'].indexOf(target);
    while (current() < wanted) await click(titleButton());
  };
  const nav = (label: string) => panel()!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  return { fixture, host, root, input, button, open, cell, click, press, focused, gridTitle, titleButton, footer, level, nav, settle };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 19, 12));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('CA-1 bouton calendrier', () => {
  it('CA-1 : en mode calendrier, un input texte suivi d’un bouton calendrier', async () => {
    const { input, root, button } = await mount();
    expect(input.type).toBe('text');
    expect(root.querySelectorAll('lc-date-input button')).toHaveLength(1);
    expect(input.compareDocumentPosition(button()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('CA-12 nom et attributs du bouton, Alt + flèche bas', () => {
  it('CA-12 : « Choisir une date » sans valeur, haspopup dialog, expanded', async () => {
    const { button, open } = await mount();
    expect(button().getAttribute('aria-label')).toBe('Choisir une date');
    expect(button().getAttribute('aria-haspopup')).toBe('dialog');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    await open();
    expect(button().getAttribute('aria-expanded')).toBe('true');
  });

  it('CA-12 : « Changer la date, 12 novembre 2026 » avec une valeur', async () => {
    const { button } = await mount({ value: '2026-11-12' });
    expect(button().getAttribute('aria-label')).toBe('Changer la date, 12 novembre 2026');
  });

  it('CA-12 : Alt + flèche bas dans le champ ouvre le panneau', async () => {
    const { input, settle } = await mount();
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true }));
    await settle();
    expect(panel()).not.toBeNull();
  });
});

describe('CA-13 choisir un jour', () => {
  it('CA-13 : met la valeur à jour, affiche la date, ferme, focus au bouton', async () => {
    const { host, input, button, open, cell, click } = await mount({ value: '2026-11-12' });
    await open();
    await click(cell('2026-11-20'));
    expect(host.value()).toBe('2026-11-20');
    expect(input.value).toBe('20/11/2026');
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(button());
  });
});

describe('CA-14 ouverture', () => {
  it('CA-14 : ouvre sur le mois de la valeur, premier focus sur le jour choisi', async () => {
    const { open, gridTitle, focused } = await mount({ value: '2027-03-05' });
    await open();
    expect(gridTitle()).toBe('mars 2027');
    expect(focused()).toBe('2027-03-05');
  });

  it('CA-14 : sans valeur, mois d’aujourd’hui, premier focus sur aujourd’hui', async () => {
    const { open, gridTitle, focused } = await mount();
    await open();
    expect(gridTitle()).toBe('novembre 2026');
    expect(focused()).toBe('2026-11-19');
  });

  it('CA-14 : sans valeur, aujourd’hui hors bornes : mois et jour autorisé le plus proche (après max)', async () => {
    const { open, gridTitle, focused } = await mount({ max: '2026-09-10' });
    await open();
    expect(gridTitle()).toBe('septembre 2026');
    expect(focused()).toBe('2026-09-10');
  });

  it('CA-14 : sans valeur, aujourd’hui avant min : le jour autorisé le plus proche', async () => {
    const { open, gridTitle, focused } = await mount({ min: '2027-02-10' });
    await open();
    expect(gridTitle()).toBe('février 2027');
    expect(focused()).toBe('2027-02-10');
  });
});

describe('CA-15 niveaux', () => {
  it('CA-15 : jours, mois (titre 2026), années (titre 2019 à 2030, non cliquable), retour sans changer la valeur', async () => {
    const { host, open, level, gridTitle, titleButton, cell, click, nav, panelCells } = await withCells({ value: '2026-11-12' });
    await open();
    await level('month');
    expect(gridTitle()).toBe('2026');
    expect(panelCells()).toHaveLength(12);
    await level('year');
    expect(gridTitle()).toBe('2019 à 2030');
    expect(panel()!.querySelector('button.lc-calendar__title')).toBeNull();
    expect(panelCells()).toHaveLength(12);
    expect(nav('Années précédentes')).not.toBeNull();
    await click(nav('Années suivantes'));
    expect(gridTitle()).toBe('2031 à 2042');
    await click(nav('Années précédentes'));
    await click(nav('Années précédentes'));
    expect(gridTitle()).toBe('2007 à 2018');
    await click(nav('Années suivantes'));
    await click(cell('2028-01-01'));
    expect(gridTitle()).toBe('2028');
    expect(titleButton()).not.toBeNull();
    await click(cell('2028-05-01'));
    expect(gridTitle()).toBe('mai 2028');
    expect(host.value()).toBe('2026-11-12');
    expect(panel()).not.toBeNull();
  });
});

async function withCells(options: Parameters<typeof mount>[0]) {
  const m = await mount(options);
  return { ...m, panelCells: () => panel()!.querySelectorAll('td[role="gridcell"]') };
}

describe('CA-16 bornes', () => {
  it('CA-16 : un jour hors bornes porte aria-disabled, reçoit le focus au clavier, ni clic ni Entrée ne le choisit', async () => {
    const { host, open, cell, click } = await mount({ value: '2026-11-12', min: '2026-11-10', max: '2026-11-20' });
    await open();
    expect(cell('2026-11-05').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-11-12').hasAttribute('aria-disabled')).toBe(false);
    await click(cell('2026-11-05'));
    expect(host.value()).toBe('2026-11-12');
    expect(panel()).not.toBeNull();
  });

  it('CA-16 : au clavier, un jour hors bornes reçoit le focus mais Entrée et Espace ne le choisissent pas', async () => {
    const { host, open, press, focused } = await mount({ value: '2026-11-12', min: '2026-11-10', max: '2026-11-20' });
    await open();
    for (let step = 0; step < 3; step++) await press('ArrowLeft');
    expect(focused()).toBe('2026-11-09');
    await press('Enter');
    await press(' ');
    expect(host.value()).toBe('2026-11-12');
    expect(panel()).not.toBeNull();
  });

  it('CA-16 : mois et années entièrement hors bornes de même', async () => {
    const { host, open, level, cell, click, gridTitle, titleButton } = await mount({ value: '2026-11-12', min: '2026-11-10', max: '2027-03-20' });
    await open();
    await level('month');
    expect(cell('2026-10-01').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-11-01').hasAttribute('aria-disabled')).toBe(false);
    await click(cell('2026-10-01'));
    expect(gridTitle()).toBe('2026');
    await click(titleButton());
    expect(cell('2025-01-01').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2028-01-01').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2027-01-01').hasAttribute('aria-disabled')).toBe(false);
    await click(cell('2025-01-01'));
    expect(gridTitle()).toBe('2019 à 2030');
    expect(host.value()).toBe('2026-11-12');
  });

  it('CA-16 : précédent et suivant désactivés quand la page voisine est entièrement hors bornes', async () => {
    const { open, nav, level } = await mount({ value: '2026-11-12', min: '2026-11-10', max: '2026-11-20' });
    await open();
    expect(nav('Mois précédent').disabled).toBe(true);
    expect(nav('Mois suivant').disabled).toBe(true);
    await level('month');
    expect(nav('Année précédente').disabled).toBe(true);
    expect(nav('Année suivante').disabled).toBe(true);
    await level('year');
    expect(nav('Années précédentes').disabled).toBe(true);
    expect(nav('Années suivantes').disabled).toBe(true);
  });

  it('CA-16 : avec des bornes larges, les boutons de page sont actifs', async () => {
    const { open, nav } = await mount({ value: '2026-11-12' });
    await open();
    expect(nav('Mois précédent').disabled).toBe(false);
    expect(nav('Mois suivant').disabled).toBe(false);
  });
});

describe('CA-17 clavier, niveau des jours (un cas par touche), depuis le jeudi 12 novembre 2026', () => {
  const day: [string, KeyboardEventInit, string][] = [
    ['ArrowLeft', {}, '2026-11-11'],
    ['ArrowRight', {}, '2026-11-13'],
    ['ArrowUp', {}, '2026-11-05'],
    ['ArrowDown', {}, '2026-11-19'],
    ['Home', {}, '2026-11-09'],
    ['End', {}, '2026-11-15'],
    ['PageUp', {}, '2026-10-12'],
    ['PageDown', {}, '2026-12-12'],
    ['PageUp', { shiftKey: true }, '2025-11-12'],
    ['PageDown', { shiftKey: true }, '2027-11-12'],
  ];
  it.each(day)('CA-17 jours : %s %j donne %s', async (key, init, expected) => {
    const { open, press, focused } = await mount({ value: '2026-11-12' });
    await open();
    await press(key, init);
    expect(focused()).toBe(expected);
  });

  it.each([
    ['2026-01-31', 'PageDown', '2026-02-28'],
    ['2026-03-31', 'PageUp', '2026-02-28'],
  ])('CA-17 jours : depuis le %s, %s tombe sur le dernier jour du mois, %s', async (from, key, expected) => {
    const { open, press, focused } = await mount({ value: from });
    await open();
    await press(key);
    expect(focused()).toBe(expected);
  });

  it.each([['Enter'], [' ']])('CA-17 jours : %j choisit le jour focalisé et ferme', async (key) => {
    const { host, open, press } = await mount({ value: '2026-11-12' });
    await open();
    await press('ArrowRight');
    await press(key);
    expect(host.value()).toBe('2026-11-13');
    expect(panel()).toBeNull();
  });

  it('CA-17 jours : les flèches passent au mois voisin et le panneau suit', async () => {
    const { open, press, focused, gridTitle } = await mount({ value: '2026-11-30' });
    await open();
    await press('ArrowRight');
    expect(focused()).toBe('2026-12-01');
    expect(gridTitle()).toBe('décembre 2026');
  });
});

describe('CA-17 clavier, niveaux mois et années', () => {
  const month: [string, KeyboardEventInit, string][] = [
    ['ArrowLeft', {}, '2026-10-01'],
    ['ArrowRight', {}, '2026-12-01'],
    ['ArrowUp', {}, '2026-07-01'],
    ['ArrowDown', {}, '2027-03-01'],
    ['PageUp', {}, '2025-11-01'],
    ['PageDown', {}, '2027-11-01'],
  ];
  it.each(month)('CA-17 mois : %s donne %s', async (key, init, expected) => {
    const { open, level, press, focused } = await mount({ value: '2026-11-12' });
    await open();
    await level('month');
    await press(key, init);
    expect(focused()).toBe(expected);
  });

  const year: [string, string][] = [
    ['ArrowLeft', '2025-01-01'],
    ['ArrowRight', '2027-01-01'],
    ['ArrowUp', '2022-01-01'],
    ['ArrowDown', '2030-01-01'],
    ['PageUp', '2014-01-01'],
    ['PageDown', '2038-01-01'],
  ];
  it.each(year)('CA-17 années : %s donne %s', async (key, expected) => {
    const { open, level, press, focused } = await mount({ value: '2026-11-12' });
    await open();
    await level('year');
    await press(key);
    expect(focused()).toBe(expected);
  });

  it('CA-17 mois : Entrée sur un mois revient aux jours de ce mois, sans changer la valeur', async () => {
    const { host, open, level, press, gridTitle } = await mount({ value: '2026-11-12' });
    await open();
    await level('month');
    await press('ArrowRight');
    await press('Enter');
    expect(gridTitle()).toBe('décembre 2026');
    expect(host.value()).toBe('2026-11-12');
  });

  it('CA-17 années : Entrée sur une année revient aux mois de cette année, sans changer la valeur', async () => {
    const { host, open, level, press, gridTitle } = await mount({ value: '2026-11-12' });
    await open();
    await level('year');
    await press('ArrowRight');
    await press('Enter');
    expect(gridTitle()).toBe('2027');
    expect(host.value()).toBe('2026-11-12');
  });
});

describe('CA-18 fermeture sans changement', () => {
  it.each(['day', 'month', 'year'] as const)('CA-18 : Échap au niveau %s ferme, valeur gardée, focus au bouton', async (target) => {
    const { host, button, open, level, press } = await mount({ value: '2026-11-12' });
    await open();
    await level(target);
    await press('Escape');
    expect(panel()).toBeNull();
    expect(host.value()).toBe('2026-11-12');
    expect(document.activeElement).toBe(button());
  });

  it.each(['day', 'month', 'year'] as const)('CA-18 : un clic dans le vide au niveau %s ferme, valeur gardée, focus au bouton', async (target) => {
    const { host, button, open, level, settle } = await mount({ value: '2026-11-12' });
    await open();
    await level(target);
    document.body.click();
    await settle();
    expect(panel()).toBeNull();
    expect(host.value()).toBe('2026-11-12');
    expect(document.activeElement).toBe(button());
  });
});

describe('CA-19 rôles et attributs', () => {
  it('CA-19 : dialogue, grille, cellules, en-têtes, aujourd’hui, titre vivant', async () => {
    const { open, gridTitle } = await mount({ value: '2026-11-12' });
    await open();
    const dialog = panel()!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')!.trim()).not.toBe('');
    const grid = dialog.querySelector('[role="grid"]')!;
    expect(gridTitle()).toBe('novembre 2026');
    expect(grid.querySelectorAll('[role="columnheader"]')).toHaveLength(7);
    expect(grid.querySelectorAll('[role="gridcell"][aria-selected="true"]')).toHaveLength(1);
    expect(grid.querySelector('[role="gridcell"][aria-selected="true"]')!.getAttribute('data-date')).toBe('2026-11-12');
    const today = grid.querySelectorAll('[aria-current="date"]');
    expect(today).toHaveLength(1);
    expect(today[0].getAttribute('data-date')).toBe('2026-11-19');
    expect(today[0].getAttribute('title')).toBe("Aujourd'hui");
    const live = dialog.querySelector('[aria-live="polite"]')!;
    expect(live.textContent!.trim()).toBe('novembre 2026');
    const titleButton = dialog.querySelector('button.lc-calendar__title')!;
    expect(live.parentElement).toBe(titleButton.parentElement); // frère du bouton-titre, pas le titre lui-même
    expect(titleButton.hasAttribute('aria-live')).toBe(false);
    expect(titleButton.contains(live)).toBe(false);
  });

  it('CA-19 : le titre vivant change avec le mois', async () => {
    const { open, click, nav } = await mount({ value: '2026-11-12' });
    await open();
    await click(nav('Mois suivant'));
    expect(panel()!.querySelector('[aria-live="polite"]')!.textContent!.trim()).toBe('décembre 2026');
  });
});

describe('CA-20 une seule étape pour la grille', () => {
  it('CA-20 : exactement une cellule de la grille dans l’ordre de tabulation, entre suivant et le pied', async () => {
    const { open } = await mount({ value: '2026-11-12' });
    await open();
    const tabbable = [...panel()!.querySelectorAll<HTMLElement>('button, td, [tabindex]')].filter(
      (element) => element.tabIndex >= 0 && !(element as HTMLButtonElement).disabled,
    );
    const names = tabbable.map((element) => (element.tagName === 'TD' ? 'grille' : element.tagName === 'BUTTON' ? (element.getAttribute('aria-label') ?? element.textContent!.trim()) : element.tagName));
    expect(names.filter((name) => name === 'grille')).toHaveLength(1);
    expect(names).toEqual(['Mois précédent', 'novembre 2026 : choisir un mois', 'Mois suivant', 'grille', "Aujourd'hui", 'Effacer la date']);
  });
});

describe('CA-21 Aujourd’hui et Effacer', () => {
  it('CA-21 : « Aujourd’hui » choisit la date du poste (19 novembre 2026) et ferme', async () => {
    const { host, open, footer, click } = await mount({ value: '2027-05-05' });
    await open();
    await click(footer(/Aujourd/)!);
    expect(host.value()).toBe('2026-11-19');
    expect(panel()).toBeNull();
  });

  it('CA-21 : « Aujourd’hui » désactivé si aujourd’hui est hors bornes', async () => {
    const { host, open, footer, click } = await mount({ value: '2026-09-01', max: '2026-09-30' });
    await open();
    expect(footer(/Aujourd/)!.disabled).toBe(true);
    await click(footer(/Aujourd/)!);
    expect(host.value()).toBe('2026-09-01');
    expect(panel()).not.toBeNull();
  });

  it('CA-21 : « Effacer la date » met null et ferme', async () => {
    const { host, input, open, footer, click } = await mount({ value: '2026-11-12' });
    await open();
    await click(footer(/Effacer la date/)!);
    expect(host.value()).toBeNull();
    expect(input.value).toBe('jj/mm/aaaa');
    expect(panel()).toBeNull();
  });

  it('CA-21 : « Effacer la date » n’existe pas quand le champ est obligatoire', async () => {
    const { open, footer } = await mount({ value: '2026-11-12', required: true });
    await open();
    expect(footer(/Effacer/)).toBeUndefined();
    expect(footer(/Aujourd/)).toBeDefined();
  });
});

describe('CA-23 bornes incohérentes et valeur illisible', () => {
  it('CA-23 : min postérieur à max : aucune exception, un avertissement, aucune date sélectionnable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { host, open, click } = await mount({ value: null, min: '2026-12-01', max: '2026-10-01' });
    await open();
    expect(panel()!.querySelectorAll('td[role="gridcell"]:not([aria-disabled="true"])')).toHaveLength(0);
    await click(panel()!.querySelector<HTMLElement>('td[role="gridcell"]')!);
    expect(host.value()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('CA-23 : value non ISO : aucune exception, un avertissement, champ vide', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { input } = await mount({ value: 'pas-une-date' });
    expect(input.value).toMatch(/^(jj\/mm\/aaaa)?$/);
    expect(warn).toHaveBeenCalled();
  });
});

describe('CA-24 aucun littéral dans les règles du calendrier', () => {
  type Rule = { selector: string; body: string };
  const rules = (css: string): Rule[] => {
    const found: Rule[] = [];
    const walk = (text: string) => {
      let index = 0;
      while (index < text.length) {
        const open = text.indexOf('{', index);
        if (open < 0) break;
        let depth = 1;
        let close = open + 1;
        while (depth && close < text.length) depth += text[close] === '{' ? 1 : text[close] === '}' ? -1 : 0, close++;
        const selector = text.slice(index, open).trim();
        const body = text.slice(open + 1, close - 1);
        if (selector.startsWith('@media')) walk(body);
        else found.push({ selector, body });
        index = close;
      }
    };
    walk(css.replace(/\/\*[\s\S]*?\*\//g, ''));
    return found;
  };
  const calendar = () => {
    const css = readFileSync(resolve(process.cwd(), 'packages/angular/styles/ui-angular.css'), 'utf8');
    return rules(css).filter((rule) => /lc-calendar/.test(rule.selector));
  };
  const withoutVars = (text: string) => {
    let previous: string;
    do {
      previous = text;
      text = text.replace(/var\([^()]*\)/g, '');
    } while (text !== previous);
    return text;
  };

  it('CA-24 : le fichier contient bien des règles du calendrier', () => {
    expect(calendar().length).toBeGreaterThan(20);
  });

  it('CA-24 : aucun --lc-ref-*', () => {
    expect(calendar().filter((rule) => /--lc-ref-/.test(rule.body))).toEqual([]);
  });

  it('CA-24 : aucun littéral de couleur (#, rgb(, hsl()', () => {
    expect(calendar().filter((rule) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(rule.body))).toEqual([]);
  });

  it('CA-24 : aucune longueur ni durée littérale hors var(...)', () => {
    const bad = calendar().filter((rule) => /(^|[^\w-])-?\d*\.?\d+(px|rem|em|ms|s|%|vh|vw|ch|pt)\b/.test(withoutVars(rule.body)));
    expect(bad.map((rule) => rule.selector)).toEqual([]);
  });
});

describe('CA-38 libellés anglais et locale anglaise', () => {
  it('CA-38 : chaque clé de date de LC_LABELS existe en français et en anglais, du même type', () => {
    const fr = Object.keys(LC_LABELS_FR).filter((key) => /^date/.test(key));
    const en = Object.keys(LC_LABELS_EN).filter((key) => /^date/.test(key));
    expect(fr.length).toBeGreaterThan(20);
    expect(en.sort()).toEqual(fr.sort());
    for (const key of fr) expect(typeof (LC_LABELS_EN as unknown as Record<string, unknown>)[key]).toBe(typeof (LC_LABELS_FR as unknown as Record<string, unknown>)[key]);
  });

  it('CA-38 : panneau en anglais : « Today », « Clear date », « Choose a date », mois et jours anglais', async () => {
    const { button, open, footer, gridTitle } = await mount({ english: true });
    expect(button().getAttribute('aria-label')).toBe('Choose a date');
    await open();
    expect(footer(/^\s*Today\s*$/)).toBeDefined();
    expect(footer(/^\s*Clear date\s*$/)).toBeDefined();
    expect(panel()!.getAttribute('aria-label')).toBe('Choose a date');
    expect(gridTitle()).toBe('November 2026');
    const weekdays = [...panel()!.querySelectorAll('thead abbr')].map((abbr) => abbr.getAttribute('title'));
    expect(weekdays).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  });
});

describe('CA-39 rien d’interne exporté, aucun import d’un autre point d’entrée', () => {
  const internal = { ...calendarPanelModule, ...dateMaskModule, ...dateMathModule };
  it('CA-39 : aucun nom de calendar-panel, date-mask ou date-math n’est exporté par public-api, sauf toIsoDate', () => {
    const exported = Object.keys(barrel);
    const leaked = Object.keys(internal).filter((name) => name !== 'toIsoDate' && exported.includes(name));
    expect(leaked).toEqual([]);
    expect(exported).toContain('toIsoDate');
    expect(exported).not.toContain('LcCalendarPanelComponent');
  });

  it('CA-39 : le texte de public-api ne nomme pas calendar-panel ni date-mask ; date-math seulement pour toIsoDate', () => {
    const text = readFileSync(resolve(process.cwd(), 'packages/angular/forms/src/public-api.ts'), 'utf8');
    expect(text).not.toMatch(/calendar-panel|date-mask/);
    const mathLines = text.split('\n').filter((line) => /date-math/.test(line));
    expect(mathLines).toEqual(["export { toIsoDate } from './date-input/date-math';"]);
  });

  it('CA-39 : aucun fichier de forms/src/date-input/ n’importe un autre point d’entrée secondaire', () => {
    const dir = resolve(process.cwd(), 'packages/angular/forms/src/date-input');
    const offenders: string[] = [];
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts'))) {
      const source = readFileSync(resolve(dir, file), 'utf8');
      for (const [, a, b, c] of source.matchAll(/^(?:import|export)\b[^;]*?\sfrom\s+'([^']+)'|^import\s+'([^']+)'|\bimport\(\s*'([^']+)'/gm)) {
        const path = a ?? b ?? c;
        const allowed = path.startsWith('./') || /^\.\.\/[\w-]/.test(path) || path.startsWith('@angular/') || path === 'rxjs' || path === '@lionelcointot/ui-angular' || path.startsWith('node:') || path === 'vitest';
        if (!allowed) offenders.push(`${file}: ${path}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
