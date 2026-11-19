import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN, LC_LOCALE } from '@lionelcointot/ui-angular';
import type { LcDateInterval } from './date-interval';
import { LcCalendarPanelComponent } from './calendar-panel.component';

const TODAY = '2026-11-19'; // un jeudi

async function setup(inputs: Record<string, unknown> = {}, english = false) {
  if (english) {
    TestBed.overrideProvider(LC_LABELS, { useValue: LC_LABELS_EN });
    TestBed.overrideProvider(LC_LOCALE, { useValue: { locale: 'en-US', currency: 'USD' } });
  }
  const fixture = TestBed.createComponent(LcCalendarPanelComponent);
  document.body.append(fixture.nativeElement);
  fixture.componentRef.setInput('today', TODAY);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const picked = vi.fn();
  const cleared = vi.fn();
  const closed = vi.fn();
  fixture.componentInstance.picked.subscribe(picked);
  fixture.componentInstance.cleared.subscribe(cleared);
  fixture.componentInstance.closed.subscribe(closed);
  const cell = (iso: string) => el.querySelector<HTMLElement>(`td[data-date="${iso}"]`)!;
  const active = () => el.querySelector<HTMLElement>('td[tabindex="0"]')!;
  const title = () => el.querySelector('.lc-calendar__title span')!.textContent;
  const press = async (key: string, init: KeyboardEventInit = {}) => {
    active().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
    await fixture.whenStable();
  };
  const click = async (selector: string) => {
    el.querySelector<HTMLElement>(selector)!.click();
    await fixture.whenStable();
  };
  return { fixture, el, picked, cleared, closed, cell, active, title, press, click };
}

describe('calendar-panel, niveau des jours', () => {
  afterEach(() => document.body.replaceChildren());

  it('novembre 2026 : lundi en premier, jours du mois seulement, cases vides autour', async () => {
    const { el, title } = await setup();
    expect(title()).toBe('novembre 2026');
    const heads = [...el.querySelectorAll('th[role=columnheader]')];
    expect(heads.map((h) => h.textContent)).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
    expect(heads.map((h) => h.querySelector('abbr')!.getAttribute('title'))[0]).toBe('lundi');
    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(6);
    expect(el.querySelectorAll('td[role=gridcell]')).toHaveLength(30);
    const first = [...rows[0].children];
    expect(first.slice(0, 6).every((c) => c.getAttribute('role') === null)).toBe(true);
    expect(first[6].getAttribute('data-date')).toBe('2026-11-01');
    expect(rows[5].children[0].getAttribute('data-date')).toBe('2026-11-30');
  });

  it('février 2026 : 28 jours sur 5 semaines, une case vide à la fin', async () => {
    const { el, title } = await setup({ selection: { from: '2026-02-10', to: null } });
    expect(title()).toBe('février 2026');
    expect(el.querySelectorAll('td[role=gridcell]')).toHaveLength(28);
    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(5);
    expect(rows[4].lastElementChild!.getAttribute('role')).toBeNull();
  });

  it('repères : jour choisi, aujourd’hui, noms complets, rôles', async () => {
    const { el, cell } = await setup({ selection: { from: '2026-11-12', to: null } });
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('aria-modal')).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('Choisir une date');
    const selected = [...el.querySelectorAll('td[aria-selected="true"]')];
    expect(selected.map((c) => c.getAttribute('data-date'))).toEqual(['2026-11-12']);
    expect(cell('2026-11-12').getAttribute('aria-label')).toBe('jeudi 12 novembre 2026');
    expect(el.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(cell(TODAY).getAttribute('aria-current')).toBe('date');
    expect(cell(TODAY).getAttribute('title')).toBe("Aujourd'hui");
    expect(cell('2026-11-20').getAttribute('title')).toBeNull();
    const grid = el.querySelector('[role=grid]')!;
    expect(el.querySelector('#' + grid.getAttribute('aria-labelledby'))!.textContent).toBe('novembre 2026');
    expect(el.querySelector('.lc-calendar__title span')!.getAttribute('aria-live')).toBe('polite');
  });

  it('une seule étape de tabulation pour la grille', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('td[tabindex="0"]')).toHaveLength(1);
    expect(el.querySelectorAll('td[tabindex="-1"]')).toHaveLength(29);
  });

  it('bornes : jours hors bornes désactivés, sans effet au clic ni à Entrée, atteignables au clavier', async () => {
    const { cell, picked, press, active, click, fixture } = await setup({ min: '2026-11-05', max: '2026-11-20' });
    expect(cell('2026-11-04').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-11-21').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-11-10').getAttribute('aria-disabled')).toBeNull();
    cell('2026-11-04').click();
    expect(picked).not.toHaveBeenCalled();
    await press('ArrowRight');
    await press('ArrowRight');
    expect(active().getAttribute('data-date')).toBe('2026-11-21');
    await press('Enter');
    expect(picked).not.toHaveBeenCalled();
    cell('2026-11-10').click();
    expect(picked).toHaveBeenCalledWith('2026-11-10');
    expect(fixture.nativeElement.querySelector('.lc-calendar__footer button:disabled')).toBeNull();
    await click('.lc-calendar__footer button');
    expect(picked).toHaveBeenLastCalledWith(TODAY);
  });

  it('précédent et suivant : désactivés quand le mois voisin est entièrement hors bornes', async () => {
    const prev = '[aria-label="Mois précédent"]';
    const next = '[aria-label="Mois suivant"]';
    const bounded = await setup({ min: '2026-11-05', max: '2026-11-20' });
    expect(bounded.el.querySelector<HTMLButtonElement>(prev)!.disabled).toBe(true);
    expect(bounded.el.querySelector<HTMLButtonElement>(next)!.disabled).toBe(true);
    document.body.replaceChildren();
    const open = await setup({ min: '2026-10-31', max: '2026-12-01' });
    expect(open.el.querySelector<HTMLButtonElement>(prev)!.disabled).toBe(false);
    expect(open.el.querySelector<HTMLButtonElement>(next)!.disabled).toBe(false);
  });

  it('précédent et suivant changent de mois et gardent la grille atteignable', async () => {
    const { title, click, active } = await setup();
    await click('[aria-label="Mois suivant"]');
    expect(title()).toBe('décembre 2026');
    expect(active().getAttribute('data-date')).toBe('2026-12-19');
    await click('[aria-label="Mois précédent"]');
    await click('[aria-label="Mois précédent"]');
    expect(title()).toBe('octobre 2026');
    expect(active().getAttribute('data-date')).toBe('2026-10-19');
  });

  it.each([
    ['ArrowRight', {}, '2026-11-20'],
    ['ArrowLeft', {}, '2026-11-18'],
    ['ArrowDown', {}, '2026-11-26'],
    ['ArrowUp', {}, '2026-11-12'],
    ['Home', {}, '2026-11-16'],
    ['End', {}, '2026-11-22'],
    ['PageDown', {}, '2026-12-19'],
    ['PageUp', {}, '2026-10-19'],
    ['PageDown', { shiftKey: true }, '2027-11-19'],
    ['PageUp', { shiftKey: true }, '2025-11-19'],
  ])('touche %s %j : focus sur %s', async (key, init, expected) => {
    const { press, active } = await setup();
    await press(key, init);
    expect(active().getAttribute('data-date')).toBe(expected);
    expect(document.activeElement).toBe(active());
  });

  it('flèches au passage d’un mois : le mois affiché change', async () => {
    const { press, title } = await setup({ selection: { from: '2026-11-29', to: null } });
    await press('ArrowDown');
    expect(title()).toBe('décembre 2026');
    await press('ArrowUp');
    expect(title()).toBe('novembre 2026');
  });

  it('Page suivante depuis un 31 : dernier jour du mois d’arrivée', async () => {
    const { press, active, title } = await setup({ selection: { from: '2026-01-31', to: null } });
    await press('PageDown');
    expect(active().getAttribute('data-date')).toBe('2026-02-28');
    expect(title()).toBe('février 2026');
  });

  it('Entrée et Espace choisissent le jour actif ; Échap ferme', async () => {
    const { press, picked, closed } = await setup();
    await press('Enter');
    await press(' ');
    expect(picked).toHaveBeenCalledTimes(2);
    expect(picked).toHaveBeenCalledWith(TODAY);
    await press('Escape');
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['jour choisi', { selection: { from: '2026-03-04', to: null } }, '2026-03-04', 'mars 2026'],
    ['aujourd’hui', {}, TODAY, 'novembre 2026'],
    ['aujourd’hui après max', { max: '2026-11-10' }, '2026-11-10', 'novembre 2026'],
    ['aujourd’hui avant min', { min: '2026-12-01' }, '2026-12-01', 'décembre 2026'],
  ])('premier focus : %s', async (_name, inputs, day, expectedTitle) => {
    const { fixture, active, title } = await setup(inputs);
    fixture.componentInstance.focusInitial();
    await fixture.whenStable();
    expect(active().getAttribute('data-date')).toBe(day);
    expect(document.activeElement).toBe(active());
    expect(title()).toBe(expectedTitle);
  });

  it('pied : Aujourd’hui et Effacer la date ; Effacer absent si obligatoire', async () => {
    const { el, picked, cleared, click, fixture } = await setup();
    const labels = [...el.querySelectorAll('.lc-calendar__footer button')].map((b) => b.textContent!.trim());
    expect(labels).toEqual(["Aujourd'hui", 'Effacer la date']);
    expect(el.querySelector('.lc-calendar__footer .lc-calendar__today-dot')).not.toBeNull();
    await click('.lc-calendar__footer button:last-child');
    expect(cleared).toHaveBeenCalled();
    await click('.lc-calendar__footer button:first-child');
    expect(picked).toHaveBeenCalledWith(TODAY);
    fixture.componentRef.setInput('required', true);
    await fixture.whenStable();
    expect(el.querySelectorAll('.lc-calendar__footer button')).toHaveLength(1);
  });

  it('Aujourd’hui désactivé hors bornes', async () => {
    const { el } = await setup({ max: '2026-11-10' });
    expect(el.querySelector<HTMLButtonElement>('.lc-calendar__footer button')!.disabled).toBe(true);
  });

  it('période : de from à to inclus, deux mois côte à côte', async () => {
    const selection: LcDateInterval = { from: '2026-11-10', to: '2026-11-12' };
    const { el } = await setup({ selection, mode: 'range', months: 2 });
    expect(el.getAttribute('aria-label')).toBe('Choisir une période');
    const selected = [...el.querySelectorAll('td[aria-selected="true"]')].map((c) => c.getAttribute('data-date'));
    expect(selected).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    expect([...el.querySelectorAll('.lc-calendar__title span')].map((t) => t.textContent)).toEqual(['novembre 2026', 'décembre 2026']);
    expect(el.querySelectorAll('td[tabindex="0"]')).toHaveLength(1);
  });

  it('libellés et locale anglais', async () => {
    const { el, cell, title } = await setup({ selection: { from: '2026-11-12', to: null } }, true);
    expect(el.getAttribute('aria-label')).toBe('Choose a date');
    expect(title()).toBe('November 2026');
    expect(cell('2026-11-12').getAttribute('aria-label')).toBe('Thursday, November 12, 2026');
    expect(cell(TODAY).getAttribute('title')).toBe('Today');
    expect(el.querySelector('.lc-calendar__title')!.getAttribute('aria-label')).toBe('November 2026: choose a month');
    expect(el.querySelector('abbr')!.getAttribute('title')).toBe('Monday');
    expect([...el.querySelectorAll('.lc-calendar__footer button')].map((b) => b.textContent!.trim())).toEqual(['Today', 'Clear date']);
    expect(el.querySelector('[aria-label="Previous month"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Next month"]')).not.toBeNull();
  });
});
