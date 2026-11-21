import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN, LC_LABELS_FR, LC_LOCALE } from '@lionelcointot/ui-angular';
import type { LcDateInterval } from './date-interval';
import { LcCalendarPanelComponent } from './calendar-panel.component';
import { kitDatePresets } from './date-presets';

const TODAY = '2026-11-19'; // un jeudi

async function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(LcCalendarPanelComponent);
  document.body.append(fixture.nativeElement);
  fixture.componentRef.setInput('today', TODAY);
  fixture.componentRef.setInput('mode', 'range');
  fixture.componentRef.setInput('months', 2);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const range = vi.fn<(value: LcDateInterval) => void>();
  const picked = vi.fn();
  const cleared = vi.fn();
  const closed = vi.fn();
  fixture.componentInstance.rangePicked.subscribe(range);
  fixture.componentInstance.picked.subscribe(picked);
  fixture.componentInstance.cleared.subscribe(cleared);
  fixture.componentInstance.closed.subscribe(closed);
  const cell = (iso: string) => el.querySelector<HTMLElement>(`td[data-date="${iso}"]`)!;
  const status = () => el.querySelector('[role=status]')!.textContent!.trim();
  const titles = () => [...el.querySelectorAll('.lc-calendar__title')].map((title) => title.textContent!.trim());
  const click = async (target: Element | null) => {
    (target as HTMLElement).click();
    await fixture.whenStable();
  };
  const button = (name: RegExp) => [...el.querySelectorAll('button')].find((b) => name.test(b.textContent!))!;
  const press = async (key: string) => {
    el.querySelector<HTMLElement>('td[tabindex="0"]')!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };
  const rangeOf = (iso: string) => cell(iso).getAttribute('data-range');
  return { fixture, el, range, picked, cleared, closed, cell, status, titles, click, button, press, rangeOf };
}

describe('calendar-panel, mode période', () => {
  afterEach(() => document.body.replaceChildren());

  it('deux mois côte à côte, un seul avec months = 1 ; précédent sur le premier, suivant sur le dernier', async () => {
    const { el, titles, fixture } = await setup();
    expect(titles()).toEqual(['novembre 2026', 'décembre 2026']);
    const navs = [...el.querySelectorAll<HTMLElement>('.lc-calendar__nav')].map((nav) => nav.getAttribute('aria-label'));
    expect(navs).toEqual(['Mois précédent', 'Mois suivant']);
    fixture.componentRef.setInput('months', 1);
    await fixture.whenStable();
    expect(titles()).toEqual(['novembre 2026']);
  });

  it('deux temps : début, aperçu au survol, fin ; un second jour antérieur inverse les deux', async () => {
    const { range, click, cell, status, rangeOf, fixture } = await setup();
    expect(status()).toBe('Choisissez la date de début.');
    await click(cell('2026-11-12'));
    expect(status()).toBe('Début : 12 novembre 2026. Choisissez la date de fin, ou cliquez sur « Sans date de fin ».');
    cell('2026-11-16').dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();
    expect(rangeOf('2026-11-14')).toContain('preview');
    expect(rangeOf('2026-11-16')).toContain('hollow');
    expect(rangeOf('2026-11-12')).not.toContain('hollow');
    await click(cell('2026-11-05'));
    expect(range).toHaveBeenCalledExactlyOnceWith({ from: '2026-11-05', to: '2026-11-12' });
  });

  it('un double clic ne choisit rien, sans exception ; deux clics distincts sur un même jour font une période d’un jour', async () => {
    const { range, cell, fixture, status } = await setup();
    const day = cell('2026-11-12');
    day.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    day.dispatchEvent(new MouseEvent('click', { detail: 2, bubbles: true }));
    await fixture.whenStable();
    expect(range).not.toHaveBeenCalled();
    expect(status()).toContain('Début : 12 novembre 2026');
    cell('2026-11-12').dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    await fixture.whenStable();
    expect(range).toHaveBeenCalledExactlyOnceWith({ from: '2026-11-12', to: '2026-11-12' });
  });

  it('titre puis double clic sur un mois : le second clic ne pose aucun début sur le jour qui apparaît dessous', async () => {
    const { el, click, cell, status, fixture, titles } = await setup({ selection: { from: '2026-11-12', to: '2026-11-14' } });
    await click(el.querySelector('button.lc-calendar__title'));
    const may = [...el.querySelectorAll('td')].find((c) => c.getAttribute('aria-label') === 'mai 2026')!;
    may.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    await fixture.whenStable();
    expect(titles()[0]).toBe('mai 2026');
    cell('2026-05-01').dispatchEvent(new MouseEvent('click', { detail: 2, bubbles: true }));
    await fixture.whenStable();
    expect(status()).toBe('Période : du 12 au 14 novembre 2026 inclus. Cliquez un jour pour la changer.'); // aucun début posé
  });

  it('panneau à deux mois, jour actif dans le second : un seul mois affiché, le jour actif revient dedans et garde le focus', async () => {
    const { fixture, el, press, titles } = await setup({ selection: { from: '2026-11-12', to: '2026-11-14' } });
    fixture.componentInstance.focusInitial();
    await fixture.whenStable();
    for (let i = 0; i < 3; i++) await press('ArrowDown'); // 12 novembre + 21 jours : 3 décembre
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-12-03');
    fixture.componentRef.setInput('months', 1);
    await fixture.whenStable();
    await fixture.whenStable();
    expect(titles()).toEqual(['novembre 2026']);
    expect(el.querySelectorAll('td[tabindex="0"]')).toHaveLength(1);
    expect(el.querySelector('td[tabindex="0"]')!.getAttribute('data-date')).toBe('2026-11-03');
    expect(document.activeElement).toBe(el.querySelector('td[tabindex="0"]'));
  });

  it('deux mois : précédent, titres et suivant se tabulent avant la grille (une rangée d’en-têtes commune)', async () => {
    const { el } = await setup();
    const order = [...el.querySelectorAll('.lc-calendar__nav, .lc-calendar__title, td[tabindex="0"]')].map((e) => e.className.includes('nav--next') ? 'suivant' : e.className.includes('nav') ? 'précédent' : e.tagName === 'TD' ? 'grille' : 'titre');
    expect(order).toEqual(['précédent', 'titre', 'titre', 'suivant', 'grille']);
  });

  it('ligne d’état d’un panneau rouvert sur une sélection : elle la dit jusqu’au premier clic, « Changer le début » redemande le début', async () => {
    const { fixture, status, click, cell, button } = await setup({ selection: { from: '2026-11-12', to: '2026-11-20' } });
    expect(status()).toBe('Période : du 12 au 20 novembre 2026 inclus. Cliquez un jour pour la changer.');
    fixture.componentRef.setInput('selection', { from: '2026-11-18', to: null });
    await fixture.whenStable();
    expect(status()).toBe('Depuis le 18 novembre 2026, sans date de fin. Cliquez un jour pour changer.');
    fixture.componentRef.setInput('selection', { from: null, to: '2026-11-20' });
    await fixture.whenStable();
    expect(status()).toBe('Jusqu’au 20 novembre 2026 inclus, sans date de début. Cliquez un jour pour changer.'.replace('’', "'"));
    fixture.componentRef.setInput('selection', { from: null, to: null });
    await fixture.whenStable();
    expect(status()).toBe('Choisissez la date de début.');
    fixture.componentRef.setInput('selection', { from: '2026-11-12', to: '2026-11-20' });
    await fixture.whenStable();
    expect(button(/Changer le début/)).toBeUndefined();
    await click(cell('2026-11-03'));
    expect(status()).toContain('Début : 3 novembre 2026');
    await click(button(/Changer le début/));
    expect(status()).toBe('Choisissez la date de début.');
  });

  it('ligne d’état en anglais', async () => {
    TestBed.overrideProvider(LC_LABELS, { useValue: LC_LABELS_EN });
    TestBed.overrideProvider(LC_LOCALE, { useValue: { locale: 'en-US', currency: 'USD' } });
    const { status } = await setup({ selection: { from: '2026-11-12', to: '2026-11-20' } });
    expect(status()).toBe('Period: from November 12 to 20, 2026 inclusive. Click a day to change it.');
  });

  it('une période complète : aria-selected partout, extrémités en disque, bande coupée en fin de semaine', async () => {
    const { el, rangeOf } = await setup({ selection: { from: '2026-11-12', to: '2026-11-18' } });
    const selected = [...el.querySelectorAll('td[aria-selected="true"]')].map((c) => c.getAttribute('data-date'));
    expect(selected).toEqual(['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18']);
    expect(rangeOf('2026-11-12')).toBe('disk right');
    expect(rangeOf('2026-11-18')).toBe('disk left');
    expect(rangeOf('2026-11-15')).toBe('left'); // dimanche : rien à droite
    expect(rangeOf('2026-11-16')).toBe('right'); // lundi : rien à gauche
    expect(rangeOf('2026-11-14')).toBe('left right');
  });

  it('période sur deux mois : la bande s’arrête au bord de chaque mois, les deux extrémités sont des disques', async () => {
    const { rangeOf } = await setup({ selection: { from: '2026-11-27', to: '2026-12-03' } });
    expect(rangeOf('2026-11-30')).toBe(''); // lundi et dernier jour du mois : pas de bande de part et d'autre
    expect(rangeOf('2026-12-01')).toBe('right');
    expect(rangeOf('2026-12-03')).toBe('disk left');
  });

  it('période d’un seul jour : un disque sans bande', async () => {
    const { rangeOf } = await setup({ selection: { from: '2026-11-12', to: '2026-11-12' } });
    expect(rangeOf('2026-11-12')).toBe('disk');
  });

  it('« Sans date de fin » : absent avant le début, puis émet { from, to: null }', async () => {
    const { range, click, cell, button, status, el } = await setup();
    expect(el.querySelector('.lc-calendar__no-end')).toBeNull();
    await click(cell('2026-11-03'));
    await click(button(/Sans date de fin/));
    expect(range).toHaveBeenCalledExactlyOnceWith({ from: '2026-11-03', to: null });
    expect(status()).toBe('Choisissez la date de début.'); // plus d'annonce de fin : le panneau est fermé au même instant
  });

  it('« Changer le début » : revient à l’invite sans fermer, le focus retourne à l’ancien début', async () => {
    const { click, cell, button, status, closed, el, fixture } = await setup();
    await click(cell('2026-11-03'));
    await click(button(/Changer le début/));
    await fixture.whenStable();
    expect(status()).toBe('Choisissez la date de début.');
    expect(button(/Changer le début/)).toBeUndefined();
    expect(closed).not.toHaveBeenCalled();
    expect(el.querySelector('td[tabindex="0"]')!.getAttribute('data-date')).toBe('2026-11-03');
  });

  it('« Aujourd’hui » montre le mois en cours sans rien choisir ; « Effacer la période » émet cleared, absent si obligatoire', async () => {
    const { fixture, click, button, titles, range, cleared, el } = await setup({ selection: { from: '2026-03-02', to: '2026-03-04' } });
    expect(titles()[0]).toBe('mars 2026');
    await click(button(/Aujourd/));
    expect(titles()[0]).toBe('novembre 2026');
    expect(range).not.toHaveBeenCalled();
    await click(button(/Effacer la période/));
    expect(cleared).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('required', true);
    await fixture.whenStable();
    expect(el.textContent).not.toContain('Effacer');
  });

  it('le mois affiché ne saute pas quand le début est posé ni quand la sélection change dans les mois visibles', async () => {
    const { fixture, click, titles, cell } = await setup({ selection: { from: '2026-11-12', to: '2026-11-18' } });
    await click(document.body.querySelector('.lc-calendar__nav--next'));
    expect(titles()).toEqual(['décembre 2026', 'janvier 2027']);
    await click(cell('2026-12-10'));
    expect(titles()).toEqual(['décembre 2026', 'janvier 2027']);
    fixture.componentRef.setInput('selection', { from: '2027-01-05', to: null });
    await fixture.whenStable();
    expect(titles()).toEqual(['décembre 2026', 'janvier 2027']);
    expect(document.body.querySelector('td[tabindex="0"]')).not.toBeNull();
  });

  it('niveaux : n’importe quel titre ouvre une seule grille ; le titre du second mois ouvre l’année du second ; choisir un mois le met à gauche', async () => {
    const { el, click, titles, cell, range } = await setup({ selection: { from: '2026-12-28', to: '2027-01-03' } });
    expect(titles()).toEqual(['décembre 2026', 'janvier 2027']);
    await click(el.querySelectorAll('button.lc-calendar__title')[1]);
    expect(titles()).toEqual(['2027']);
    expect(el.querySelector('.lc-calendar__month--full')).not.toBeNull();
    await click([...el.querySelectorAll('td')].find((c) => c.getAttribute('aria-label') === 'mars 2027')!);
    expect(titles()).toEqual(['mars 2027', 'avril 2027']);
    expect(cell('2027-03-10')).not.toBeNull();
    expect(range).not.toHaveBeenCalled();
  });

  it('clavier : Entrée = début, flèches = aperçu, Entrée = fin ; Échap pendant la fin ferme et abandonne le début', async () => {
    const { press, range, closed, status, rangeOf, el, fixture } = await setup();
    el.querySelector<HTMLElement>('td[tabindex="0"]')!.focus();
    fixture.componentInstance.focusInitial();
    await fixture.whenStable();
    await press('Enter'); // aujourd'hui, 19
    expect(status()).toContain('Début : 19 novembre 2026');
    await press('ArrowRight');
    await press('ArrowRight');
    expect(rangeOf('2026-11-21')).toContain('hollow');
    await press('Escape');
    expect(closed).toHaveBeenCalledOnce();
    expect(status()).toBe('Choisissez la date de début.');
    await press('Enter');
    await press('ArrowDown');
    await press('Enter');
    expect(range).toHaveBeenCalledExactlyOnceWith({ from: '2026-11-21', to: '2026-11-28' }); // le focus était resté sur le 21
  });

  it('raccourcis : deux lignes, rognés par les bornes, désactivés quand il n’en reste rien', async () => {
    const { el, click, range } = await setup({ presets: kitDatePresets(LC_LABELS_FR), min: '2026-11-15', max: '2026-11-30' });
    const presets = [...el.querySelectorAll<HTMLButtonElement>('.lc-calendar__preset')];
    expect(presets.map((p) => p.querySelector('.lc-calendar__preset-label')!.textContent)).toEqual(['7 derniers jours', 'La semaine dernière', '30 derniers jours', 'Ce mois-ci', 'Le mois dernier']);
    const dates = presets.map((p) => p.querySelector('.lc-calendar__preset-dates')!.textContent);
    expect(dates).toEqual(['du 15 au 19 novembre 2026', 'le 15 novembre 2026', 'du 15 au 19 novembre 2026', 'du 15 au 30 novembre 2026', 'Aucune date autorisée sur cette période.']);
    expect(presets[4].disabled).toBe(true);
    await click(presets[3]);
    expect(range).toHaveBeenCalledExactlyOnceWith({ from: '2026-11-15', to: '2026-11-30' });
  });

  it('dates d’un raccourci : même mois, mois différents, années différentes, un seul jour', async () => {
    const at = (from: string, to: string) => ({ label: 'x', interval: () => ({ from, to }) });
    const { el } = await setup({ presets: [at('2026-11-01', '2026-11-30'), at('2026-10-25', '2026-11-24'), at('2025-12-15', '2026-01-14'), at('2026-11-12', '2026-11-12')] });
    const dates = [...el.querySelectorAll('.lc-calendar__preset-dates')].map((d) => d.textContent);
    expect(dates).toEqual(['du 1 au 30 novembre 2026', 'du 25 octobre au 24 novembre 2026', 'du 15 décembre 2025 au 14 janvier 2026', 'le 12 novembre 2026']);
  });

  it('sans raccourci : aucune colonne ; mode date simple : aucun raccourci même fourni', async () => {
    const { el, fixture } = await setup();
    expect(el.querySelector('.lc-calendar__presets')).toBeNull();
    fixture.componentRef.setInput('presets', kitDatePresets(LC_LABELS_FR));
    fixture.componentRef.setInput('mode', 'single');
    await fixture.whenStable();
    expect(el.querySelector('.lc-calendar__presets')).toBeNull();
    expect(el.querySelector('[role=status]')).toBeNull();
  });

  it('les quatre raccourcis du kit, en anglais', () => {
    expect(kitDatePresets(LC_LABELS_EN).map((p) => p.label)).toEqual(['Last 7 days', 'Last week', 'Last 30 days', 'This month', 'Last month']);
    expect(kitDatePresets(LC_LABELS_EN)[0].interval(TODAY)).toEqual({ from: '2026-11-13', to: '2026-11-19' });
  });
});
