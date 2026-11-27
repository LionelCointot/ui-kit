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
  const title = () => el.querySelector('[aria-live="polite"]')!.textContent;
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
    expect(first.slice(0, 6).every((c) => c.getAttribute('role') === 'presentation')).toBe(true);
    expect(first[6].getAttribute('data-date')).toBe('2026-11-01');
    expect(rows[5].children[0].getAttribute('data-date')).toBe('2026-11-30');
  });

  it('février 2026 : 28 jours sur 5 semaines, une case vide à la fin', async () => {
    const { el, title } = await setup({ selection: { from: '2026-02-10', to: null } });
    expect(title()).toBe('février 2026');
    expect(el.querySelectorAll('td[role=gridcell]')).toHaveLength(28);
    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(5);
    expect(rows[4].lastElementChild!.getAttribute('role')).toBe('presentation');
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
    expect(el.querySelector('[aria-live="polite"]')!.textContent).toBe('novembre 2026');
    expect(el.querySelector('[aria-live="polite"]')!.closest('button')).toBeNull();
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
    await press('ArrowRight');
    await press('ArrowRight');
    expect(active().getAttribute('data-date')).toBe('2026-11-21');
    await press('Enter');
    expect(picked).not.toHaveBeenCalled();
    cell('2026-11-04').click();
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

  it('un jour hors bornes cliqué reçoit le focus : la flèche suivante part de lui', async () => {
    const { cell, press, active } = await setup({ min: '2026-11-05' });
    cell('2026-11-04').click();
    await press('ArrowRight');
    expect(active().getAttribute('data-date')).toBe('2026-11-05');
  });

  it('un bouton qui se désactive sous le focus rend le focus au jour actif', async () => {
    const { el, fixture, active } = await setup({ max: '2026-12-31' });
    const next = el.querySelector<HTMLButtonElement>('[aria-label="Mois suivant"]')!;
    next.focus();
    next.click();
    await fixture.whenStable();
    expect(next.disabled).toBe(true);
    expect(document.activeElement).toBe(active());
    expect(active().getAttribute('data-date')).toBe('2026-12-19');
  });

  it('Échap ne remonte pas ; Alt, Ctrl et Méta + flèche sont laissés au navigateur', async () => {
    const { el, press, active, closed } = await setup();
    const outer = vi.fn();
    document.body.addEventListener('keydown', outer);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    document.body.removeEventListener('keydown', outer);
    expect(closed).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
    await press('ArrowRight', { altKey: true });
    await press('ArrowRight', { ctrlKey: true });
    await press('ArrowRight', { metaKey: true });
    expect(active().getAttribute('data-date')).toBe(TODAY);
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

describe('calendar-panel, niveaux mois et années', () => {
  afterEach(() => document.body.replaceChildren());
  const TITLE = '.lc-calendar__title';

  async function toMonths(inputs: Record<string, unknown> = {}, english = false) {
    const ctx = await setup(inputs, english);
    await ctx.click(`button${TITLE}`);
    return ctx;
  }
  async function toYears(inputs: Record<string, unknown> = {}, english = false) {
    const ctx = await toMonths(inputs, english);
    await ctx.click(`button${TITLE}`);
    return ctx;
  }

  it('niveau mois : douze mois en 4 colonnes sur 3 lignes, titre « 2026 » encore un bouton', async () => {
    const { el, title, click } = await toMonths();
    expect(title()).toBe('2026');
    expect(el.querySelector(`button${TITLE}`)!.getAttribute('aria-label')).toBe('2026 : choisir une année');
    expect(el.querySelectorAll('thead')).toHaveLength(0);
    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows.map((row) => row.children.length)).toEqual([4, 4, 4]);
    const cells = [...el.querySelectorAll('td[role=gridcell]')];
    expect(cells.map((c) => c.textContent)).toEqual(
      Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(2026, m, 1))),
    );
    expect(cells[10].getAttribute('aria-label')).toBe('novembre 2026');
    expect(el.querySelector('[aria-label="Année précédente"]')).not.toBeNull();
    await click('[aria-label="Année suivante"]');
    expect(title()).toBe('2027');
    await click('[aria-label="Année précédente"]');
    await click('[aria-label="Année précédente"]');
    expect(title()).toBe('2025');
  });

  it('niveau années : 2019 à 2030, titre en texte simple, flèches de douze ans', async () => {
    const { el, title, click } = await toYears();
    expect(title()).toBe('2019 à 2030');
    expect(el.querySelector('button' + TITLE)).toBeNull();
    const cells = [...el.querySelectorAll('td[role=gridcell]')];
    expect(cells.map((c) => c.textContent)).toEqual(Array.from({ length: 12 }, (_, i) => String(2019 + i)));
    expect(cells[0].getAttribute('aria-label')).toBe('2019');
    await click('[aria-label="Années suivantes"]');
    expect(title()).toBe('2031 à 2042');
    await click('[aria-label="Années précédentes"]');
    await click('[aria-label="Années précédentes"]');
    expect(title()).toBe('2007 à 2018');
  });

  it('choisir une année puis un mois ramène aux jours, sans rien choisir, focus sur le niveau d’arrivée', async () => {
    const { el, picked, title, click, active } = await toYears({ selection: { from: '2026-11-12', to: null } });
    await click('td[data-date="2024-01-01"]');
    expect(title()).toBe('2024');
    expect(active().getAttribute('data-date')).toBe('2024-11-01');
    expect(document.activeElement).toBe(active());
    await click('td[data-date="2024-03-01"]');
    expect(title()).toBe('mars 2024');
    expect(active().getAttribute('data-date')).toBe('2024-03-12');
    expect(document.activeElement).toBe(active());
    expect(el.querySelectorAll('thead th')).toHaveLength(7);
    expect(picked).not.toHaveBeenCalled();
    expect(el.querySelector('td[aria-selected="true"]')).toBeNull();
  });

  it('repères : mois et année choisis, mois et année d’aujourd’hui', async () => {
    const { el, cell, click } = await toMonths({ selection: { from: '2026-03-04', to: null } });
    expect(cell('2026-03-01').getAttribute('aria-selected')).toBe('true');
    expect(el.querySelectorAll('td[aria-selected="true"]')).toHaveLength(1);
    expect(cell('2026-11-01').getAttribute('aria-current')).toBe('date');
    expect(el.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    await click(`button${TITLE}`);
    expect(cell('2026-01-01').getAttribute('aria-selected')).toBe('true');
    expect(cell('2026-01-01').getAttribute('aria-current')).toBe('date');
    expect(cell('2027-01-01').getAttribute('aria-selected')).toBe('false');
  });

  it('bornes aux niveaux mois et années : désactivés, atteignables, sans effet', async () => {
    const { el, cell, click, press, active, title } = await toMonths({ min: '2026-03-10', max: '2026-08-20' });
    expect(cell('2026-02-01').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-09-01').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-03-01').getAttribute('aria-disabled')).toBeNull();
    expect(cell('2026-08-01').getAttribute('aria-disabled')).toBeNull();
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Année précédente"]')!.disabled).toBe(true);
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Année suivante"]')!.disabled).toBe(true);
    await click('td[data-date="2026-02-01"]');
    expect(title()).toBe('2026');
    for (let step = 0; step < 6; step++) await press('ArrowLeft');
    expect(active().getAttribute('data-date')).toBe('2026-02-01');
    await press('Enter');
    expect(title()).toBe('2026');
    await click(`button${TITLE}`);
    expect(cell('2025-01-01').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2027-01-01').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-01-01').getAttribute('aria-disabled')).toBeNull();
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Années précédentes"]')!.disabled).toBe(true);
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Années suivantes"]')!.disabled).toBe(true);
    await click('td[data-date="2027-01-01"]');
    expect(title()).toBe('2019 à 2030');
  });

  it('clavier au niveau des mois : ±1, ±4, Page = une année, Maj + Page sans effet de plus, Entrée descend', async () => {
    const { press, active, title, el } = await toMonths();
    const at = () => active().getAttribute('data-date')!.slice(0, 7);
    expect(el.querySelectorAll('td[tabindex="0"]')).toHaveLength(1);
    await press('ArrowRight');
    expect(at()).toBe('2026-12');
    await press('ArrowDown');
    expect(at()).toBe('2027-04');
    expect(title()).toBe('2027');
    await press('ArrowUp');
    await press('ArrowLeft');
    expect(at()).toBe('2026-11');
    await press('PageDown');
    expect(at()).toBe('2027-11');
    await press('PageUp', { shiftKey: true });
    expect(at()).toBe('2026-11');
    expect(document.activeElement).toBe(active());
    await press('ArrowLeft');
    await press('Enter');
    expect(title()).toBe('octobre 2026');
  });

  it('clavier au niveau des années : ±1, ±4, Page = douze ans, la page suit le focus, Entrée descend', async () => {
    const { press, active, title, el } = await toYears();
    const at = () => active().getAttribute('data-date')!.slice(0, 4);
    expect(el.querySelectorAll('td[tabindex="0"]')).toHaveLength(1);
    await press('ArrowRight');
    expect(at()).toBe('2027');
    await press('ArrowDown');
    expect(at()).toBe('2031');
    expect(title()).toBe('2031 à 2042');
    await press('ArrowLeft');
    expect(at()).toBe('2030');
    expect(title()).toBe('2019 à 2030');
    await press('PageUp');
    expect(at()).toBe('2018');
    expect(title()).toBe('2007 à 2018');
    expect(document.activeElement).toBe(active());
    await press('Enter');
    expect(title()).toBe('2018');
  });

  it('Échap ferme à chaque niveau', async () => {
    const months = await toMonths();
    await months.press('Escape');
    expect(months.closed).toHaveBeenCalledTimes(1);
    await months.click(`button${TITLE}`);
    await months.press('Escape');
    expect(months.closed).toHaveBeenCalledTimes(2);
  });

  it('focusInitial revient au niveau des jours', async () => {
    const { fixture, title } = await toYears();
    fixture.componentInstance.focusInitial();
    await fixture.whenStable();
    expect(title()).toBe('novembre 2026');
  });

  it('libellés anglais des niveaux', async () => {
    const months = await toMonths({}, true);
    expect(months.el.querySelector(`button${TITLE}`)!.getAttribute('aria-label')).toBe('2026: choose a year');
    expect(months.el.querySelector('[aria-label="Previous year"]')).not.toBeNull();
    expect(months.el.querySelector('td[data-date="2026-11-01"]')!.textContent).toBe('Nov');
    await months.click(`button${TITLE}`);
    expect(months.title()).toBe('2019 to 2030');
    expect(months.el.querySelector('[aria-label="Next years"]')).not.toBeNull();
  });
});

/** Panneau ouvert sur `selection`, au niveau `level` si donné ; `clickAt` porte le `detail` d'un clic multiple. */
async function setupAt(selection: string | null, level?: 'month' | 'year') {
  const base = await setup({ selection: { from: selection, to: null } });
  const { el, fixture } = base;
  const titleButton = () => el.querySelector('button.lc-calendar__title') as HTMLButtonElement;
  const nav = (name: RegExp) => [...el.querySelectorAll<HTMLButtonElement>('button.lc-calendar__nav')].find((b) => name.test(b.getAttribute('aria-label')!))!;
  const clickAt = async (target: Element, detail = 1) => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
    await fixture.whenStable();
  };
  if (level) {
    await clickAt(titleButton());
    if (level === 'year') await clickAt(titleButton());
  }
  return { ...base, label: base.title, nav, clickAt, settle: () => fixture.whenStable() };
}

describe('calendar-panel, corrections après la QA', () => {
  afterEach(() => document.body.replaceChildren());

  it('double clic sur un mois : le second clic ne choisit aucun jour', async () => {
    const { el, picked, clickAt, label } = await setupAt('2026-11-12', 'month');
    await clickAt(el.querySelector('td[data-date="2026-05-01"]')!);
    expect(label()).toBe('mai 2026');
    await clickAt(el.querySelector('td[data-date="2026-05-01"]')!, 2);
    expect(picked).not.toHaveBeenCalled();
  });

  it('double clic sur une année : le second clic ne choisit rien non plus', async () => {
    const { el, picked, clickAt } = await setupAt('2026-11-12', 'year');
    await clickAt(el.querySelector('td[data-date="2024-01-01"]')!);
    await clickAt(el.querySelector('td[data-date="2024-03-01"]')!, 2);
    expect(picked).not.toHaveBeenCalled();
  });

  it('un double clic sur un jour le choisit une seule fois, un clic simple aussi', async () => {
    const { el, picked, clickAt } = await setupAt('2026-11-12');
    await clickAt(el.querySelector('td[data-date="2026-11-20"]')!, 1);
    await clickAt(el.querySelector('td[data-date="2026-11-20"]')!, 2);
    await clickAt(el.querySelector('td[data-date="2026-11-20"]')!, 3);
    expect(picked).toHaveBeenCalledExactlyOnceWith('2026-11-20');
  });

  it('l’hôte est focalisable par un clic (tabindex -1) : Échap et le piège restent actifs', async () => {
    const { el } = await setupAt(null);
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  // Départ à une page des bornes (la page commence sept ans avant l'année de départ) : parcourir 750 pages une à une dépassait le délai du test selon la machine.
  it('années : la première page est « 1000 à 1011 », précédent désactivé', async () => {
    const { el, label, nav, clickAt } = await setupAt('1012-06-01', 'year');
    expect(label()).toBe('1005 à 1016');
    expect(nav(/précédentes/).disabled).toBe(false);
    await clickAt(nav(/précédentes/));
    expect(label()).toBe('1000 à 1011');
    expect(nav(/précédentes/).disabled).toBe(true);
    expect(Math.min(...[...el.querySelectorAll('td[data-date]')].map((c) => Number(c.getAttribute('data-date')!.slice(0, 4))))).toBe(1000);
  });

  it('années : la dernière page est « 9988 à 9999 », suivant désactivé', async () => {
    const { label, nav, clickAt } = await setupAt('9987-06-01', 'year');
    expect(label()).toBe('9980 à 9991');
    expect(nav(/suivantes/).disabled).toBe(false);
    await clickAt(nav(/suivantes/));
    expect(label()).toBe('9988 à 9999');
    expect(nav(/suivantes/).disabled).toBe(true);
  });

  it('mois : précédent désactivé en 1000, suivant en 9999 ; jours : janvier 1000 et décembre 9999', async () => {
    const first = await setupAt('1000-03-10', 'month');
    expect(first.nav(/précédente/).disabled).toBe(true);
    expect(first.nav(/suivante/).disabled).toBe(false);
    document.body.replaceChildren();
    const last = await setupAt('9999-03-10', 'month');
    expect(last.nav(/suivante/).disabled).toBe(true);
    document.body.replaceChildren();
    const january = await setupAt('1000-01-15');
    expect(january.nav(/précédent/).disabled).toBe(true);
    document.body.replaceChildren();
    const december = await setupAt('9999-12-15');
    expect(december.nav(/suivant/).disabled).toBe(true);
    expect(december.nav(/précédent/).disabled).toBe(false);
  });

  it('au clavier, on ne sort pas de 1000 à 9999', async () => {
    const { el, settle, label } = await setupAt('1000-01-01');
    const active = () => el.querySelector<HTMLElement>('td[tabindex="0"]')!;
    active().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await settle();
    expect(active().dataset['date']).toBe('1000-01-01');
    expect(label()).toBe('janvier 1000');
  });
});

describe('calendar-panel, glissement du mois (T9c)', () => {
  afterEach(() => document.body.replaceChildren());

  it('aucun sens à l\'ouverture : la grille n\'glisse pas', async () => {
    const { el } = await setup();
    expect(el.querySelector('.lc-calendar__months')!.hasAttribute('data-slide')).toBe(false);
  });

  it('suivant puis précédent : le sens suit le bouton', async () => {
    const { el, click } = await setup();
    const months = () => el.querySelector('.lc-calendar__months')!.getAttribute('data-slide');
    await click('.lc-calendar__nav--next');
    expect(months()).toBe('next');
    await click('.lc-calendar__nav:not(.lc-calendar__nav--next)');
    expect(months()).toBe('prev');
  });

  it('au clavier, passer au mois suivant glisse aussi', async () => {
    const { el, press } = await setup({ selection: { from: '2026-11-30', to: null } });
    await press('ArrowRight');
    expect(el.querySelector('.lc-calendar__months')!.getAttribute('data-slide')).toBe('next');
  });

  it('un changement de niveau ne glisse pas', async () => {
    const { el, click } = await setup();
    await click('.lc-calendar__nav--next');
    await click('.lc-calendar__title');
    expect(el.querySelector('.lc-calendar__months')!.hasAttribute('data-slide')).toBe(false);
  });

  it('chaque semaine porte son rang, pour le décalage par ligne', async () => {
    const { el } = await setup();
    const ranks = [...el.querySelectorAll<HTMLElement>('tbody tr')].map((tr) => tr.style.getPropertyValue('--lc-row'));
    expect(ranks).toEqual(['0', '1', '2', '3', '4', '5']);
  });
});
