import { LiveAnnouncer } from '@angular/cdk/a11y';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, NEVER, Observable, of, throwError } from 'rxjs';
import { LC_DATE_PICKER } from '@lionelcointot/ui-angular/forms';
import { LcDataTableComponent } from './data-table.component';
import * as model from './data-table-model';
import { LcDataColumn, LcDataSource, LcDateRange, LcDistinctValue, LcTableQuery, lcLocalSource } from './data-table-model';

interface Row { id: number; name: string; state: string; city: string; date: string; urgent: boolean }

const CITIES = ['Annecy', 'Brest', 'Caen', 'Dijon', 'Évry', 'Fréjus', 'Gap', 'Hyères', 'Istres', 'Jarnac'];
const STATES = ['Nouvelle', 'Close', 'Qualifiée'];
/** 10 lignes : État Nouvelle ×4 (1, 4, 7, 10), Close ×3 (2, 5, 8), Qualifiée ×3 (3, 6, 9) ; 10 villes distinctes ; urgentes : 1 et 2. */
const ROWS: readonly Row[] = CITIES.map((city, i) => ({
  id: i + 1, name: `Demande ${i + 1}`, state: STATES[i % 3], city, date: `2026-11-${String(i + 1).padStart(2, '0')}`, urgent: i < 2,
}));

const COLUMNS: readonly LcDataColumn<Row>[] = [
  { key: 'name', label: 'Objet', value: (row) => row.name, filter: { type: 'text', label: 'Contient' } },
  { key: 'state', label: 'État', value: (row) => row.state, filter: { type: 'multi' } },
  { key: 'city', label: 'Ville', value: (row) => row.city, filter: { type: 'multi' } },
  { key: 'date', label: 'Reçue le', sortable: true, value: (row) => row.date, filter: { type: 'dateRange' } },
  {
    key: 'urgent', label: 'Urgence', value: (row) => (row.urgent ? 'oui' : 'non'),
    filter: { type: 'single', options: [{ value: 'urgent', label: 'Urgentes', match: (row) => row.urgent }, { value: 'non', label: 'Non urgentes' }] },
  },
  { key: 'open', label: 'Voir', cardOnly: true },
];

@Component({
  imports: [LcDataTableComponent],
  template: `
    <lc-data-table caption="Demandes" [source]="source()" [columns]="columns" [trackBy]="trackBy" [(query)]="query" [chips]="chips()"
      (queryChange)="emitted.push($event)" />
  `,
})
class HostComponent {
  readonly source = signal<LcDataSource<Row> | readonly Row[]>(ROWS);
  readonly columns = COLUMNS;
  readonly trackBy = (row: Row) => row.id;
  readonly query = signal<LcTableQuery>({ filters: {}, sort: null });
  readonly chips = signal<'auto' | 'always' | 'never'>('auto');
  readonly emitted: LcTableQuery[] = [];
}

const q = (filters: LcTableQuery['filters']): LcTableQuery => ({ filters, sort: null });

/** Source serveur espionnée, adossée à la source locale ; `distinctImpl` remplace `distinct`. */
function spySource(distinctImpl?: (column: string, query: LcTableQuery) => Observable<readonly LcDistinctValue[]>) {
  const local = lcLocalSource(ROWS, COLUMNS);
  return {
    rows: vi.fn((query: LcTableQuery) => local.rows(query)),
    distinct: vi.fn(distinctImpl ?? ((column: string, query: LcTableQuery) => local.distinct(column, query))),
  };
}

describe('LcDataTableComponent', () => {
  let announce: ReturnType<typeof vi.fn>;
  let narrow$: BehaviorSubject<BreakpointState>;
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  async function setup(options: { source?: LcDataSource<Row> | readonly Row[]; query?: LcTableQuery; narrow?: boolean; chips?: 'auto' | 'always' | 'never'; picker?: 'calendar' | 'native' } = {}) {
    announce = vi.fn().mockResolvedValue(undefined);
    narrow$ = new BehaviorSubject<BreakpointState>({ matches: !!options.narrow, breakpoints: {} });
    TestBed.configureTestingModule({
      providers: [{ provide: LiveAnnouncer, useValue: { announce } }, { provide: BreakpointObserver, useValue: { observe: () => narrow$ } }, ...(options.picker ? [{ provide: LC_DATE_PICKER, useValue: options.picker }] : [])],
    });
    if (options.narrow) {
      // jsdom ignore la largeur : on reproduit la règle CSS « sous 768 px » pour rendre pastilles et bouton Filtres focalisables.
      const style = document.createElement('style');
      style.className = 'qa-narrow';
      style.textContent = '.lc-data-table__chips, .lc-data-table__tools { display: flex !important; }';
      document.head.append(style);
    }
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    if (options.source) host.source.set(options.source);
    if (options.query) host.query.set(options.query);
    if (options.chips) host.chips.set(options.chips);
    el = fixture.nativeElement as HTMLElement;
    await stable();
  }

  const stable = async () => {
    await fixture.whenStable();
    await fixture.whenStable();
  };
  const funnel = (key: string) => el.querySelector<HTMLButtonElement>(`[id$="-funnel-${key}"]`)!;
  const menu = () => document.querySelector<HTMLElement>('.lc-data-table__menu');
  const menuButtons = () => [...menu()!.querySelectorAll<HTMLButtonElement>('.lc-data-table__menu-foot button')];
  const applyBtn = () => menuButtons()[1];
  const clearBtn = () => menuButtons()[0];
  const boxes = (root: ParentNode = menu()!) => [...root.querySelectorAll<HTMLInputElement>('.lc-column-filter__list input[type=checkbox]')];
  const optionLabels = (root: ParentNode = menu()!) =>
    [...root.querySelectorAll('.lc-column-filter__option:not(.lc-column-filter__option--all) .lc-column-filter__label')].map((n) => n.textContent!.trim());
  const bodyIds = () => [...el.querySelectorAll('tbody tr:not(.lc-data-table__state)')].map((tr) => tr.querySelector('td')!.textContent!.trim());
  const open = async (key: string) => {
    funnel(key).click();
    await stable();
  };
  const click = async (node: HTMLElement) => {
    node.click();
    await stable();
  };
  const key = async (target: EventTarget, name: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    await stable();
  };
  const announced = () => announce.mock.calls.map((call) => call[0] as string);
  const lastEmitted = () => host.emitted[host.emitted.length - 1];

  afterEach(() => {
    fixture?.destroy();
    document.querySelectorAll('.cdk-overlay-container, style.qa-narrow').forEach((node) => node.remove());
  });

  describe('entonnoirs (CA-1, CA-3)', () => {
    it('CA-1 : nom « Filtrer la colonne X », aria-haspopup="dialog", aria-expanded suit le menu', async () => {
      await setup();
      expect(funnel('state').getAttribute('aria-label')).toBe('Filtrer la colonne État');
      expect(funnel('state').getAttribute('aria-haspopup')).toBe('dialog');
      expect(funnel('state').getAttribute('aria-expanded')).toBe('false');
      await open('state');
      expect(funnel('state').getAttribute('aria-expanded')).toBe('true');
      expect(menu()).not.toBeNull();
    });

    it('CA-1 : « Filtrer la colonne État (2 valeurs choisies) » ; autres types : résumé', async () => {
      await setup({ query: q({ state: ['Nouvelle', 'Close'], name: 'eau', urgent: 'urgent' }) });
      expect(funnel('state').getAttribute('aria-label')).toBe('Filtrer la colonne État (2 valeurs choisies)');
      expect(funnel('name').getAttribute('aria-label')).toBe('Filtrer la colonne Objet (« eau »)');
      expect(funnel('urgent').getAttribute('aria-label')).toBe('Filtrer la colonne Urgence (Urgentes)');
      expect(funnel('city').getAttribute('aria-label')).toBe('Filtrer la colonne Ville');
    });

    it('CA-3 : entonnoir marqué actif seulement si son filtre l\'est', async () => {
      await setup({ query: q({ state: ['Close'], city: [] }) });
      expect(funnel('state').classList).toContain('lc-data-table__funnel--on');
      expect(funnel('city').classList).not.toContain('lc-data-table__funnel--on');
    });
  });

  describe('menu multi (CA-5, CA-6, CA-7, CA-11)', () => {
    it('CA-5 : `distinct` reçoit la requête sans le filtre de sa colonne', async () => {
      const source = spySource();
      await setup({ source, query: { filters: { state: ['Close'], urgent: 'non' }, sort: { columnId: 'date', direction: 'asc' } } });
      await open('state');
      expect(source.distinct).toHaveBeenCalledWith('state', { filters: { urgent: 'non' }, sort: { columnId: 'date', direction: 'asc' } });
    });

    it('CA-5 : pendant le chargement, aria-busy, Appliquer désactivé et annonce « Chargement des valeurs de État »', async () => {
      await setup({ source: spySource(() => NEVER) });
      // `NEVER` laisse une tâche en attente : pas de whenStable, on laisse passer quelques rendus.
      funnel('state').click();
      for (let i = 0; i < 3; i++) {
        fixture.detectChanges();
        await new Promise((resolve) => setTimeout(resolve));
      }
      expect(menu()!.getAttribute('aria-busy')).toBe('true');
      expect(menu()!.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(applyBtn().disabled).toBe(true);
      expect(announced()).toContain('Chargement des valeurs de État');
    });

    it('CA-6 : une case et un nombre par valeur, annonce « 3 valeurs disponibles »', async () => {
      await setup();
      await open('state');
      const counts = [...menu()!.querySelectorAll('.lc-column-filter__option:not(.lc-column-filter__option--all)')]
        .map((node) => [node.querySelector('.lc-column-filter__label')!.textContent!.trim(), node.querySelector('.lc-column-filter__count')!.textContent!.trim()]);
      expect(counts).toEqual([['Close', '3'], ['Nouvelle', '4'], ['Qualifiée', '3']]);
      expect(announced()).toContain('3 valeurs disponibles');
      expect(applyBtn().disabled).toBe(false);
      expect(menu()!.querySelector('input[type=search]')).toBeNull();
    });

    it('CA-6 : une valeur cochée absente des valeurs distinctes reste listée avec 0', async () => {
      // Urgentes : lignes 1 (Nouvelle) et 2 (Close) ; Qualifiée, cochée, n'est pas dans la réponse de `distinct`.
      await setup({ query: q({ state: ['Qualifiée'], urgent: 'urgent' }) });
      await open('state');
      const options = [...menu()!.querySelectorAll('.lc-column-filter__option:not(.lc-column-filter__option--all)')];
      const qualified = options.find((node) => node.textContent!.includes('Qualifiée'))!;
      expect(qualified).toBeDefined();
      expect(qualified.querySelector('.lc-column-filter__count')!.textContent!.trim()).toBe('0');
      expect(qualified.querySelector<HTMLInputElement>('input')!.checked).toBe(true);
    });

    it('CA-6 : recherche au-delà de 8 valeurs ; « Sélectionner les N résultats » agit sur les visibles', async () => {
      await setup();
      await open('city');
      const search = menu()!.querySelector<HTMLInputElement>('input[type=search]')!;
      expect(search).not.toBeNull();
      expect(optionLabels()).toHaveLength(10);
      search.value = 'es';
      search.dispatchEvent(new Event('input'));
      await stable();
      // « es » sans accents ni casse : Brest, Hyères, Istres.
      expect(optionLabels()).toEqual(['Brest', 'Hyères', 'Istres']);
      expect(menu()!.querySelector('.lc-column-filter__option--all')!.textContent).toContain('Sélectionner les 3 résultats');
      await click(boxes()[0]);
      await click(applyBtn());
      expect(lastEmitted().filters).toEqual({ city: ['Brest', 'Hyères', 'Istres'] });
    });

    it('CA-6 : « Tout sélectionner » mixte quand une partie est cochée, puis tout, puis rien', async () => {
      await setup();
      await open('state');
      const all = () => boxes()[0];
      expect(all().checked).toBe(false);
      expect(all().indeterminate).toBe(false);
      await click(boxes()[1]);
      expect(all().indeterminate).toBe(true);
      expect(all().checked).toBe(false);
      await click(all());
      expect(boxes().slice(1).every((box) => box.checked)).toBe(true);
      expect(all().indeterminate).toBe(false);
      expect(all().checked).toBe(true);
      await click(all());
      expect(boxes().every((box) => !box.checked)).toBe(true);
    });

    it('CA-7 : erreur de `distinct` : alerte, focus sur « Réessayer », qui relance l\'appel', async () => {
      let fail = true;
      const local = lcLocalSource(ROWS, COLUMNS);
      const source = spySource((column, query) => (fail ? throwError(() => new Error('ko')) : local.distinct(column, query)));
      await setup({ source });
      await open('state');
      const retry = menu()!.querySelector<HTMLButtonElement>('.lc-column-filter__retry')!;
      expect(menu()!.querySelector('lc-alert')).not.toBeNull();
      expect(document.activeElement).toBe(retry);
      fail = false;
      await click(retry);
      expect(source.distinct).toHaveBeenCalledTimes(2);
      expect(optionLabels()).toEqual(['Close', 'Nouvelle', 'Qualifiée']);
    });

    it('CA-11 : Appliquer émet, ferme, rend le focus à l\'entonnoir et annonce « Filtre État appliqué. 4 résultats. »', async () => {
      await setup();
      await open('state');
      await click(boxes()[2]); // Nouvelle
      expect(host.emitted).toHaveLength(0);
      await click(applyBtn());
      expect(host.emitted).toEqual([q({ state: ['Nouvelle'] })]);
      expect(host.query()).toEqual(q({ state: ['Nouvelle'] }));
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(funnel('state'));
      expect(announced()).toContain('Filtre État appliqué. 4 résultats.');
      expect(bodyIds()).toEqual(['Demande 1', 'Demande 4', 'Demande 7', 'Demande 10']);
    });

    it('CA-11 : Échap ferme sans appliquer et rend le focus à l\'entonnoir', async () => {
      await setup();
      await open('state');
      await click(boxes()[1]);
      await key(document.activeElement ?? menu()!, 'Escape');
      expect(menu()).toBeNull();
      expect(host.emitted).toHaveLength(0);
      expect(document.activeElement).toBe(funnel('state'));
    });

    it('CA-11 : Effacer retire le filtre de la colonne et émet', async () => {
      await setup({ query: q({ state: ['Close'], city: ['Gap'] }) });
      await open('state');
      expect(clearBtn().disabled).toBe(false);
      await click(clearBtn());
      expect(host.emitted).toEqual([q({ city: ['Gap'] })]);
    });

    it('CA-11 : la liste est un seul arrêt de tabulation ; flèches, Début et Fin', async () => {
      await setup();
      await open('state');
      expect(boxes().map((box) => box.tabIndex)).toEqual([0, -1, -1, -1]);
      boxes()[0].focus();
      await key(boxes()[0], 'ArrowDown');
      expect(document.activeElement).toBe(boxes()[1]);
      await key(boxes()[1], 'End');
      expect(document.activeElement).toBe(boxes()[3]);
      await key(boxes()[3], 'ArrowUp');
      expect(document.activeElement).toBe(boxes()[2]);
      await key(boxes()[2], 'Home');
      expect(document.activeElement).toBe(boxes()[0]);
      expect(boxes().filter((box) => box.tabIndex === 0)).toHaveLength(1);
    });
  });

  describe('autres types (CA-8, CA-9, CA-10)', () => {
    describe('filtre de période : champ de date du kit (CA-P1 à CA-P11)', () => {
      // Aujourd'hui figé au 19 novembre 2026 ; lignes du jeu de test : 2026-11-01 à 2026-11-10 (Demande 1 à 10).
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 19, 12));
      });
      afterEach(() => vi.useRealTimers());

      const rangeInputs = () => [...menu()!.querySelectorAll<HTMLInputElement>('lc-date-range-input input')];
      const typeInto = async (input: HTMLInputElement, digits: string) => {
        input.focus();
        for (const char of digits) input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
        await stable();
      };
      const blur = async (input: HTMLInputElement) => {
        input.blur();
        await stable();
      };
      const calendarButton = () => menu()!.querySelector<HTMLButtonElement>('lc-date-range-input .lc-date-range-input__button')!;
      const presetButtons = () => [...document.querySelectorAll<HTMLButtonElement>('lc-date-range-input .lc-date-range-input__shortcuts button, lc-calendar-panel .lc-calendar__preset')];
      const presetLabel = (re: RegExp) => presetButtons().find((b) => re.test(b.textContent!))!;
      const ORDER_ERROR = 'La date de fin est avant la date de début.';

      it('CA-P1 : ordinateur : un lc-date-range-input dans le filtre, aucun input[type=date]', async () => {
        await setup({ picker: 'calendar' });
        await open('date');
        expect(menu()!.querySelectorAll('lc-date-range-input')).toHaveLength(1);
        expect(menu()!.querySelector('input[type=date]')).toBeNull();
      });

      it('CA-P2 : période saisie 03 → 04 novembre puis Appliquer : { from, to }, bornes incluses', async () => {
        await setup({ picker: 'calendar' });
        await open('date');
        await typeInto(rangeInputs()[0], '03112026');
        await typeInto(rangeInputs()[1], '04112026');
        await click(applyBtn());
        expect(lastEmitted().filters).toEqual({ date: { from: '2026-11-03', to: '2026-11-04' } });
        expect(bodyIds()).toEqual(['Demande 3', 'Demande 4']);
      });

      it('CA-P2 : début seul → { from } ; fin seule → { to } ; aucune clé null', async () => {
        await setup({ picker: 'calendar' });
        await open('date');
        await typeInto(rangeInputs()[0], '03112026');
        await click(applyBtn());
        expect(lastEmitted().filters).toEqual({ date: { from: '2026-11-03' } });
        expect(Object.keys(lastEmitted().filters['date'] as object)).toEqual(['from']);
        expect(bodyIds()).toHaveLength(8);
      });

      it('CA-P2 : fin seule → { to } sans clé null', async () => {
        await setup({ picker: 'calendar' });
        await open('date');
        await typeInto(rangeInputs()[1], '04112026');
        await click(applyBtn());
        expect(lastEmitted().filters).toEqual({ date: { to: '2026-11-04' } });
        expect(Object.keys(lastEmitted().filters['date'] as object)).toEqual(['to']);
        expect(bodyIds()).toEqual(['Demande 1', 'Demande 2', 'Demande 3', 'Demande 4']);
      });

      it('CA-P3a : aucun bouton radio ; cinq raccourcis du kit, dans le calendrier (ordinateur)', async () => {
        await setup({ picker: 'calendar' });
        await open('date');
        expect(menu()!.querySelector('input[type=radio]')).toBeNull();
        await click(calendarButton());
        expect(presetButtons().map((b) => b.textContent!)).toEqual([
          expect.stringMatching(/7 derniers jours/), expect.stringMatching(/La semaine dernière/), expect.stringMatching(/30 derniers jours/), expect.stringMatching(/Ce mois-ci/), expect.stringMatching(/Le mois dernier/),
        ]);
      });

      it('CA-P3a : aucun bouton radio ; cinq raccourcis du kit, sous le champ (mode natif)', async () => {
        await setup({ picker: 'native' });
        await open('date');
        expect(menu()!.querySelector('input[type=radio]')).toBeNull();
        expect(presetButtons().map((b) => b.textContent!)).toEqual([
          expect.stringMatching(/7 derniers jours/), expect.stringMatching(/La semaine dernière/), expect.stringMatching(/30 derniers jours/), expect.stringMatching(/Ce mois-ci/), expect.stringMatching(/Le mois dernier/),
        ]);
      });

      it('CA-P3b : « 7 derniers jours » puis Appliquer : { from: 13/11, to: 19/11 } fixes, sans clé preset', async () => {
        await setup({ picker: 'native' });
        await open('date');
        await click(presetLabel(/7 derniers jours/));
        await click(applyBtn());
        const value = lastEmitted().filters['date'] as Record<string, unknown>;
        expect(value).toEqual({ from: '2026-11-13', to: '2026-11-19' });
        expect(Object.keys(value)).not.toContain('preset');
      });

      it('CA-P3c : contrat : LC_DEFAULT_DATE_PRESETS n\'existe plus ; preset et presets ne compilent plus', () => {
        expect(model).not.toHaveProperty('LC_DEFAULT_DATE_PRESETS');
        // @ts-expect-error `preset` est retiré de LcDateRange
        const range: LcDateRange = { preset: 7 };
        // @ts-expect-error `presets` est retiré du filtre `dateRange`
        const filter: LcDataColumn<Row>['filter'] = { type: 'dateRange', presets: [7] };
        expect([range, filter]).toHaveLength(2);
      });

      it('CA-P3c : pastille : « depuis le … », « jusqu\'au … » ou les deux dates ; requête avec preset ignorée', async () => {
        await setup({ query: q({ date: { from: '2026-11-03' } }), chips: 'always' });
        expect(el.querySelector('.lc-data-table__chip')!.textContent).toContain('depuis le 3 nov.');
        host.query.set(q({ date: { to: '2026-11-04' } }));
        await stable();
        expect(el.querySelector('.lc-data-table__chip')!.textContent).toContain('jusqu\'au 4 nov.');
        host.query.set(q({ date: { from: '2026-11-03', to: '2026-11-04' } }));
        await stable();
        expect(el.querySelector('.lc-data-table__chip')!.textContent).toMatch(/3\s*[–-]\s*4 nov\./);
        host.query.set(q({ date: { preset: 7 } as unknown as LcDateRange }));
        await stable();
        expect(el.querySelector('.lc-data-table__chip')).toBeNull();
        expect(bodyIds()).toHaveLength(10);
      });

      it('CA-P4 : ordinateur : date, raccourci, calendrier ouvert puis fermé, fermeture du menu : rien n\'est émis avant Appliquer', async () => {
        await setup({ picker: 'calendar' });
        await open('date');
        await typeInto(rangeInputs()[0], '03112026');
        expect(host.emitted).toHaveLength(0);
        await click(calendarButton());
        expect(document.querySelector('lc-calendar-panel')).not.toBeNull();
        await click(presetLabel(/7 derniers jours/));
        expect(host.emitted).toHaveLength(0);
        if (document.querySelector('lc-calendar-panel')) await click(calendarButton());
        expect(host.emitted).toHaveLength(0);
        await key(document.activeElement ?? menu()!, 'Escape');
        expect(host.emitted).toHaveLength(0);
        expect(host.query()).toEqual(q({}));
      });

      it('CA-P4 : téléphone : rien n\'est émis avant « Afficher N » ; puis { from, to } fixes', async () => {
        vi.setSystemTime(new Date(2026, 10, 10, 12)); // 04 → 10 nov. : 7 lignes ; « Afficher N » est désactivé à 0 résultat
        await setup({ narrow: true, picker: 'native' });
        await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
        const dialog = el.querySelector<HTMLDialogElement>('lc-sheet dialog')!;
        const toggle = [...dialog.querySelectorAll<HTMLButtonElement>('.lc-data-table__section-toggle')].find((b) => b.textContent!.includes('Reçue le'))!;
        await click(toggle);
        await click([...dialog.querySelectorAll<HTMLButtonElement>('.lc-date-range-input__shortcuts button')].find((b) => /7 derniers jours/.test(b.textContent!))!);
        expect(host.emitted).toHaveLength(0);
        expect(host.query()).toEqual(q({}));
        await click(dialog.querySelector<HTMLButtonElement>('.lc-data-table__panel-apply')!);
        expect(host.emitted).toEqual([q({ date: { from: '2026-11-04', to: '2026-11-10' } })]);
      });

      it('CA-P10 : panneau du téléphone sans LC_DATE_PICKER (pointeur fin simulé) : champ natif ; rien émis avant « Afficher N » ; période préremplie à la réouverture', async () => {
        const original = window.matchMedia;
        window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia; // pointeur fin et survol : en `auto`, le kit choisirait son calendrier
        try {
          await setup({ narrow: true }); // pas de LC_DATE_PICKER fourni
          const dialog = () => el.querySelector<HTMLDialogElement>('lc-sheet dialog')!;
          const openSection = async () => {
            await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
            const toggle = [...dialog().querySelectorAll<HTMLButtonElement>('.lc-data-table__section-toggle')].find((b) => b.textContent!.includes('Reçue le'))!;
            if (toggle.getAttribute('aria-expanded') !== 'true') await click(toggle);
          };
          const dates = () => [...dialog().querySelectorAll<HTMLInputElement>('lc-date-range-input input')];
          await openSection();
          expect(dates().map((i) => i.type)).toEqual(['date', 'date']);
          expect(dialog().querySelector('lc-date-range-input .lc-date-range-input__button')).toBeNull();
          dates()[0].value = '2026-11-03';
          dates()[0].dispatchEvent(new Event('input', { bubbles: true }));
          dates()[0].dispatchEvent(new Event('change', { bubbles: true }));
          dates()[1].value = '2026-11-04';
          dates()[1].dispatchEvent(new Event('input', { bubbles: true }));
          dates()[1].dispatchEvent(new Event('change', { bubbles: true }));
          await stable();
          expect(host.emitted).toHaveLength(0);
          await click(dialog().querySelector<HTMLButtonElement>('.lc-data-table__panel-apply')!);
          expect(host.emitted).toEqual([q({ date: { from: '2026-11-03', to: '2026-11-04' } })]);
          await openSection();
          expect(dates().map((i) => i.value)).toEqual(['2026-11-03', '2026-11-04']);
        } finally {
          window.matchMedia = original;
        }
      });

      it('CA-P4b : date tapée incomplète ou impossible : aucune émission, aucun message du filtre', async () => {
        await setup({ picker: 'calendar' });
        await open('date');
        await typeInto(rangeInputs()[0], '0311');
        await blur(rangeInputs()[0]);
        await typeInto(rangeInputs()[1], '31022026');
        await blur(rangeInputs()[1]);
        expect(host.emitted).toHaveLength(0);
        expect(menu()!.querySelector('.lc-column-filter__error')).toBeNull();
        expect(menu()!.textContent).not.toContain(ORDER_ERROR);
      });

      it('CA-P6 : fin avant début : message du composant, une seule fois, sans message ni aria-describedby du filtre ; Appliquer désactivé ; rien émis', async () => {
        await setup({ picker: 'calendar' });
        await open('date');
        await typeInto(rangeInputs()[0], '10112026');
        await typeInto(rangeInputs()[1], '02112026');
        expect(menu()!.textContent!.split(ORDER_ERROR)).toHaveLength(2);
        expect(menu()!.querySelector('lc-date-range-input')!.textContent).toContain(ORDER_ERROR);
        expect(menu()!.querySelector('.lc-column-filter__error')).toBeNull();
        const outside = [...menu()!.querySelectorAll('[aria-describedby]')].filter((node) => !node.closest('lc-date-range-input'));
        expect(outside).toHaveLength(0);
        expect(applyBtn().disabled).toBe(true);
        expect(host.emitted).toHaveLength(0);
      });

      it('CA-P11 : menu rouvert avec { from, to } actif : le champ l\'affiche ; Effacer le vide et retire le filtre', async () => {
        await setup({ picker: 'calendar', query: q({ date: { from: '2026-11-03', to: '2026-11-04' } }) });
        await open('date');
        expect(rangeInputs().map((i) => i.value)).toEqual(['03/11/2026', '04/11/2026']);
        await click(clearBtn());
        expect(lastEmitted().filters).toEqual({});
        await open('date');
        expect(rangeInputs().map((i) => i.value)).toEqual(['jj/mm/aaaa', 'jj/mm/aaaa']); // masque du champ vide
        expect(applyBtn().disabled).toBe(false);
        await click(applyBtn());
        expect(lastEmitted().filters).toEqual({}); // aucune date : pas de filtre
      });
    });

    it('CA-9 : focus sur le champ à l\'ouverture ; Entrée applique', async () => {
      await setup();
      await open('name');
      const input = menu()!.querySelector<HTMLInputElement>('input[type=search]')!;
      expect(document.activeElement).toBe(input);
      input.value = 'DEMANDE 1';
      input.dispatchEvent(new Event('input'));
      await stable();
      await key(input, 'Enter');
      expect(host.emitted).toEqual([q({ name: 'DEMANDE 1' })]);
      expect(bodyIds()).toEqual(['Demande 1', 'Demande 10']);
    });

    it('CA-10 : groupe de boutons radio ; `match` de l\'option appliqué', async () => {
      await setup();
      await open('urgent');
      const radios = [...menu()!.querySelectorAll<HTMLInputElement>('fieldset input[type=radio]')];
      expect(radios).toHaveLength(2);
      await click(radios[0]);
      await click(applyBtn());
      expect(host.emitted).toEqual([q({ urgent: 'urgent' })]);
      expect(bodyIds()).toEqual(['Demande 1', 'Demande 2']);
    });
  });

  describe('résumé, pastilles, tri, états (CA-12, CA-13, CA-16, CA-17, CA-18)', () => {
    it('CA-12 : ligne « N sur total » seulement si un filtre est actif', async () => {
      await setup();
      expect(el.querySelector('.lc-data-table__summary')).toBeNull();
      host.query.set(q({ state: ['Close'] }));
      await stable();
      expect(el.querySelector('.lc-data-table__summary')!.textContent!.replace(/\s+/g, ' ').trim()).toContain('3 résultats sur 10');
    });

    it('CA-12 : « Effacer les filtres » vide, émet, focus sur le premier entonnoir, annonce le nombre', async () => {
      await setup({ query: { filters: { state: ['Close'], city: ['Brest'] }, sort: { columnId: 'date', direction: 'desc' } } });
      await click(el.querySelector<HTMLButtonElement>('.lc-data-table__summary button')!);
      expect(host.emitted).toEqual([{ filters: {}, sort: { columnId: 'date', direction: 'desc' } }]);
      expect(document.activeElement).toBe(funnel('name'));
      expect(announced()).toContain('Filtres effacés. 10 résultats.');
    });

    it('CA-13 : `never` sans pastilles ; `always` et `auto` les rendent (la largeur décide en CSS pour `auto`)', async () => {
      await setup({ query: q({ state: ['Close'] }), chips: 'never' });
      expect(el.querySelector('.lc-data-table__chip')).toBeNull();
      host.chips.set('always');
      await stable();
      expect(el.querySelector('lc-data-table')!.classList).toContain('lc-data-table--chips-always');
      expect(el.querySelectorAll('.lc-data-table__chip')).toHaveLength(1);
      host.chips.set('auto');
      await stable();
      expect(el.querySelector('lc-data-table')!.classList).not.toContain('lc-data-table--chips-always');
      expect(el.querySelectorAll('.lc-data-table__chip')).toHaveLength(1);
    });

    it('pastille : la valeur passe à la ligne au lieu d\'être tronquée', async () => {
      await setup({ query: q({ state: ['Close', 'Nouvelle'] }), chips: 'always' });
      const value = getComputedStyle(el.querySelector('.lc-data-table__chip-value')!);
      expect(value.textOverflow).not.toBe('ellipsis');
      expect(value.whiteSpace).not.toBe('nowrap');
      expect(value.overflowWrap).toBe('anywhere');
    });

    it('CA-13 : pastille « Modifier le filtre X : résumé » ; retrait : émet, focus à la pastille suivante, puis au bouton Filtres', async () => {
      await setup({ query: q({ state: ['Close', 'Nouvelle'], urgent: 'urgent' }), narrow: true });
      const edit = el.querySelector<HTMLButtonElement>('[id$="-chip-state"]')!;
      expect(edit.getAttribute('aria-label')).toBe('Modifier le filtre État : Close, Nouvelle');
      const remove = (k: string) => el.querySelector<HTMLButtonElement>(`[id$="-chip-${k}"]`)!.parentElement!.querySelector<HTMLButtonElement>('.lc-data-table__chip-remove')!;
      expect(remove('state').getAttribute('aria-label')).toBe('Retirer le filtre État');
      await click(remove('state'));
      expect(host.emitted).toEqual([q({ urgent: 'urgent' })]);
      expect(document.activeElement).toBe(el.querySelector('[id$="-chip-urgent"]'));
      await click(remove('urgent'));
      expect(lastEmitted()).toEqual(q({}));
      expect(document.activeElement).toBe(el.querySelector('[id$="-filters"]'));
    });

    it('CA-13 : sur ordinateur, la pastille rouvre le menu de sa colonne ; « Tout effacer » émet', async () => {
      await setup({ query: q({ state: ['Close'] }), chips: 'always' });
      await click(el.querySelector<HTMLButtonElement>('[id$="-chip-state"]')!);
      expect(menu()!.textContent).toContain('Filtrer : État');
      await key(document.activeElement!, 'Escape');
      const clearAll = [...el.querySelectorAll<HTMLButtonElement>('.lc-data-table__chips button')].find((b) => b.textContent!.includes('Tout effacer'))!;
      await click(clearAll);
      expect(host.emitted).toEqual([q({})]);
    });

    it('CA-16 : tri : aria-sort, cycle croissant, décroissant, aucun ; émet à chaque fois', async () => {
      await setup();
      const th = () => funnel('date').closest('th')!;
      const sort = () => th().querySelector<HTMLButtonElement>('.lc-data-table__sort')!;
      expect(th().hasAttribute('aria-sort')).toBe(false);
      await click(sort());
      expect(th().getAttribute('aria-sort')).toBe('ascending');
      await click(sort());
      expect(th().getAttribute('aria-sort')).toBe('descending');
      expect(bodyIds()[0]).toBe('Demande 10');
      await click(sort());
      expect(th().hasAttribute('aria-sort')).toBe(false);
      expect(host.emitted.map((e) => e.sort)).toEqual([{ columnId: 'date', direction: 'asc' }, { columnId: 'date', direction: 'desc' }, null]);
    });

    it('CA-17 : aucun résultat : en-têtes conservés, « Aucun résultat ne correspond à ces filtres » et « Effacer les filtres »', async () => {
      await setup({ query: q({ state: ['Close'], urgent: 'urgent', city: ['Annecy'] }) });
      expect(el.querySelectorAll('thead th').length).toBe(COLUMNS.length);
      const state = el.querySelector('tbody .lc-data-table__state')!;
      expect(state.textContent).toContain('Aucun résultat ne correspond à ces filtres');
      await click([...state.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.includes('Effacer les filtres'))!);
      expect(lastEmitted()).toEqual(q({}));
      expect(bodyIds()).toHaveLength(10);
    });

    it('CA-17 : erreur de `rows` : alerte et « Réessayer » qui relance', async () => {
      let fail = true;
      const local = lcLocalSource(ROWS, COLUMNS);
      const source = { rows: vi.fn((query: LcTableQuery) => (fail ? throwError(() => new Error('ko')) : local.rows(query))), distinct: local.distinct };
      await setup({ source });
      const alert = el.querySelector('tbody lc-alert')!;
      expect(alert.textContent).toContain('Impossible de charger les lignes.');
      fail = false;
      await click(alert.querySelector<HTMLButtonElement>('button')!);
      expect(source.rows).toHaveBeenCalledTimes(2);
      expect(bodyIds()).toHaveLength(10);
    });

    it('CA-18 : légende : nombre de lignes et filtres actifs', async () => {
      await setup({ query: q({ state: ['Close'] }) });
      expect(el.querySelector('caption')!.textContent!.trim()).toBe('Demandes : 3 résultats, filtré par État (Close).');
    });
  });

  describe('téléphone (CA-14, CA-15)', () => {
    it('résumé de section du panneau : passe à la ligne au lieu d\'être tronqué', async () => {
      await setup({ query: q({ state: ['Close'] }), narrow: true });
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
      const summary = getComputedStyle(el.querySelector('.lc-data-table__section-summary')!);
      expect(summary.textOverflow).not.toBe('ellipsis');
      expect(summary.whiteSpace).not.toBe('nowrap');
      expect(summary.overflowWrap).toBe('anywhere');
    });

    it('CA-14 : bouton « Filtres (N) » nommé « Filtres, N actifs » ; libellés des cartes', async () => {
      await setup({ query: q({ state: ['Close'], city: ['Brest'] }), narrow: true });
      const button = el.querySelector<HTMLButtonElement>('[id$="-filters"]')!;
      expect(button.textContent!.trim()).toBe('Filtres (2)');
      expect(button.getAttribute('aria-label')).toBe('Filtres, 2 actifs');
      const cells = [...el.querySelectorAll('tbody tr:first-child td')];
      expect(cells[0].getAttribute('data-label')).toBeNull();
      expect(cells[1].getAttribute('data-label')).toBe('État');
      expect(cells[5].classList).toContain('lc-data-table__card-only');
    });

    it('boutons du pied absents tant que la feuille n\'est pas ouverte (aucun « Appliquer » caché à cliquer)', async () => {
      await setup({ narrow: true });
      expect(el.querySelector('.lc-data-table__panel-apply')).toBeNull();
      expect(el.querySelector('lc-sheet .lc-sheet__footer')!.querySelectorAll('button')).toHaveLength(0);
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
      expect(el.querySelector('lc-sheet .lc-sheet__footer .lc-data-table__panel-apply')).not.toBeNull();
    });

    it('CA-15 : rien n\'est appliqué avant « Afficher N » ; le nombre suit les choix', async () => {
      await setup({ narrow: true });
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
      const dialog = el.querySelector<HTMLDialogElement>('lc-sheet dialog')!;
      const toggle = [...dialog.querySelectorAll<HTMLButtonElement>('.lc-data-table__section-toggle')].find((b) => b.textContent!.includes('État'))!;
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      await click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      await click(boxes(dialog)[1]); // Close
      expect(host.emitted).toHaveLength(0);
      expect(host.query()).toEqual(q({}));
      const apply = dialog.querySelector<HTMLButtonElement>('.lc-data-table__panel-apply')!;
      expect(apply.textContent!.trim()).toBe('Afficher 3 résultats');
      expect(dialog.querySelector('[aria-live="polite"]')!.textContent).toBe('3 résultats');
      await click(apply);
      expect(host.emitted).toEqual([q({ state: ['Close'] })]);
    });

    it('CA-H2 : une section jamais ouverte n\'est pas rendue ; repliée après ouverture, elle garde son filtre rendu (la hauteur se replie sans se vider) et devient inert', async () => {
      await setup({ narrow: true });
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
      const dialog = el.querySelector<HTMLDialogElement>('lc-sheet dialog')!;
      const toggle = [...dialog.querySelectorAll<HTMLButtonElement>('.lc-data-table__section-toggle')].find((b) => b.textContent!.includes('État'))!;
      const body = () => document.getElementById(toggle.getAttribute('aria-controls')!)!;
      expect(body().querySelector('lc-column-filter')).toBeNull();
      expect(body().hasAttribute('inert')).toBe(true);
      await click(toggle);
      expect(body().querySelector('lc-column-filter')).not.toBeNull();
      expect(body().hasAttribute('inert')).toBe(false);
      await click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(body().hasAttribute('inert')).toBe(true);
      expect(body().querySelector('lc-column-filter')).not.toBeNull();
    });

    it('panneau : le premier contrôle (croix) porte autofocus, le dialogue n\'est pas focalisé à la main ; le bouton s\'appelle « Annuler »', async () => {
      await setup({ narrow: true });
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
      const dialog = el.querySelector<HTMLDialogElement>('lc-sheet dialog')!;
      expect(dialog.querySelector('button')!.hasAttribute('autofocus')).toBe(true);
      expect(dialog.hasAttribute('tabindex')).toBe(false);
      expect(dialog.querySelector('.lc-sheet__close')!.textContent!.trim()).toBe('Annuler');
      expect(el.querySelector('dialog.lc-data-table__panel')).toBeNull();
    });

    it('CA-15 : Échap ferme sans appliquer et rend le focus au bouton Filtres', async () => {
      await setup({ narrow: true });
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
      const dialog = el.querySelector<HTMLDialogElement>('lc-sheet dialog')!;
      await click(dialog.querySelector<HTMLButtonElement>('.lc-data-table__section-toggle')!);
      await click([...dialog.querySelectorAll<HTMLButtonElement>('.lc-data-table__section-toggle')].find((b) => b.textContent!.includes('État'))!);
      await click(boxes(dialog)[1]);
      dialog.dispatchEvent(new Event('close')); // Échap natif : le navigateur ferme le dialogue puis émet `close`
      await stable();
      expect(dialog.querySelector('.lc-data-table__panel-body')).toBeNull();
      expect(host.emitted).toHaveLength(0);
      expect(document.activeElement).toBe(el.querySelector('[id$="-filters"]'));
    });

    it('spec filtre-période §13 (a) : requête inversée fournie par le code, « Afficher N » ouvre la section en faute, focalise « Du » et n\'émet rien', async () => {
      await setup({ query: q({ date: { from: '2026-11-10', to: '2026-11-03' } }), narrow: true, picker: 'native' });
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
      const dialog = el.querySelector<HTMLDialogElement>('lc-sheet dialog')!;
      dialog.setAttribute('open', ''); // jsdom n'a pas `showModal()` : sans `open`, le dialogue n'est pas rendu et `focus()` est sans effet
      const toggle = [...dialog.querySelectorAll<HTMLButtonElement>('.lc-data-table__section-toggle')].find((b) => b.textContent!.includes('Reçue le'))!;
      if (toggle.getAttribute('aria-expanded') === 'true') await click(toggle); // le test part d'une section repliée
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      await click(dialog.querySelector<HTMLButtonElement>('.lc-data-table__panel-apply')!);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(dialog.querySelector('[id$="-panel-date-from"]'));
      expect(host.emitted).toHaveLength(0);
    });

    it('CA-13 : sous 768 px, la pastille rouvre le panneau sur sa colonne', async () => {
      await setup({ query: q({ city: ['Gap'] }), narrow: true });
      await click(el.querySelector<HTMLButtonElement>('[id$="-chip-city"]')!);
      const dialog = el.querySelector<HTMLDialogElement>('lc-sheet dialog')!;
      const toggle = [...dialog.querySelectorAll<HTMLButtonElement>('.lc-data-table__section-toggle')].find((b) => b.textContent!.includes('Ville'))!;
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });
  });
  describe('mouvement (spec 2026-11-mouvement, T6)', () => {
    /** Simule une animation finie en cours sur l'élément ; `finish()` la termine. */
    const animate = (node: HTMLElement) => {
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => (finish = resolve));
      node.getAnimations = (() => [{ finished }]) as unknown as typeof node.getAnimations;
      return finish;
    };
    const openPanel = async () => {
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
      const dialog = el.querySelector<HTMLDialogElement>('lc-sheet dialog')!;
      dialog.close = vi.fn();
      return dialog;
    };
    const rowNodes = () => [...el.querySelectorAll<HTMLElement>('tbody tr:not(.lc-data-table__state)')];

    it('panneau : la croix pose data-closing, puis close() seulement après la fin du fondu', async () => {
      await setup({ narrow: true });
      const dialog = await openPanel();
      const finish = animate(dialog);
      await click(dialog.querySelector<HTMLButtonElement>('.lc-sheet__close')!);
      expect(dialog.hasAttribute('data-closing')).toBe(true);
      expect(dialog.close).not.toHaveBeenCalled();
      finish();
      await stable();
      await stable();
      expect(dialog.close).toHaveBeenCalledOnce();
      expect(dialog.hasAttribute('data-closing')).toBe(false);
      expect(el.querySelector('.lc-data-table__panel-body')).toBeNull();
    });

    it('panneau : Échap (cancel) est intercepté et ferme en fondu ; « Afficher N » aussi', async () => {
      await setup({ narrow: true });
      let dialog = await openPanel();
      let finish = animate(dialog);
      const cancel = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(cancel);
      expect(cancel.defaultPrevented).toBe(true);
      await stable(); // la feuille pose `data-closing` à son prochain passage de détection de changements
      expect(dialog.hasAttribute('data-closing')).toBe(true);
      finish();
      await stable();
      expect(dialog.close).toHaveBeenCalledOnce();

      dialog = await openPanel();
      finish = animate(dialog);
      await click(dialog.querySelector<HTMLButtonElement>('.lc-data-table__panel-apply')!);
      expect(dialog.hasAttribute('data-closing')).toBe(true);
      expect(dialog.close).not.toHaveBeenCalled();
      finish();
      await stable();
      expect(dialog.close).toHaveBeenCalledOnce();
    });

    it('panneau : rouvrir pendant le fondu annule la fermeture', async () => {
      await setup({ narrow: true });
      const dialog = await openPanel();
      const finish = animate(dialog);
      await click(dialog.querySelector<HTMLButtonElement>('.lc-sheet__close')!);
      expect(dialog.hasAttribute('data-closing')).toBe(true);
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!);
      expect(dialog.hasAttribute('data-closing')).toBe(false);
      finish();
      await stable();
      expect(dialog.close).not.toHaveBeenCalled();
    });

    it('menu de filtre : fermeture en fondu (lc-overlay--closing), colonne gardée jusqu\'au retrait du panneau', async () => {
      await setup();
      await open('state');
      const pane = document.querySelector<HTMLElement>('.lc-data-table__overlay')!;
      const finish = animate(pane);
      await click(applyBtn());
      expect(pane.classList.contains('lc-overlay--closing')).toBe(true);
      expect(menu()).not.toBeNull();
      finish();
      await stable();
      expect(menu()).toBeNull();
    });

    const ranks = () => rowNodes().map((row) => row.style.getPropertyValue('--lc-reveal-rank'));

    it('cascade à l\'ouverture : lcReveal sur les 8 premières lignes seulement, sur téléphone comme sur ordinateur', async () => {
      for (const narrow of [true, false]) {
        await setup({ narrow });
        expect(rowNodes()).toHaveLength(10);
        expect(ranks()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '', '']);
        TestBed.resetTestingModule();
      }
    });

    it('tri, suppression : les lignes conservées gardent leur élément et ne rejouent aucune entrée', async () => {
      await setup();
      const before = rowNodes();
      host.source.set([...ROWS]); // nouvelle source, même requête : lignes conservées (suivies par id), pas de cascade
      await stable();
      expect(rowNodes()[0]).toBe(before[0]);
      expect(ranks().every((rank) => rank === '')).toBe(true);
      expect(el.querySelector('tbody')!.classList.contains('lc-data-table__body--refill')).toBe(false);
    });

    it('filtre : la liste est reconstruite (aucune ligne conservée), la cascade attend le délai de remplissage (classe du corps)', async () => {
      await setup();
      const before = rowNodes();
      host.query.set(q({ state: ['Close'] })); // lignes 2, 5, 8
      await stable();
      const after = rowNodes();
      expect(after).toHaveLength(3);
      expect(after.some((row) => before.includes(row))).toBe(false);
      expect(ranks()).toEqual(['0', '1', '2']);
      expect(el.querySelector('tbody')!.classList.contains('lc-data-table__body--refill')).toBe(true);
      expect(el.querySelector('tbody')!.hidden).toBe(false); // masqué le temps du rendu seulement
      host.source.set([...ROWS]); // un tri ou une suppression ensuite : plus de refill
      await stable();
      expect(el.querySelector('tbody')!.classList.contains('lc-data-table__body--refill')).toBe(false);
    });

    it('filtre : seules les 8 premières lignes de la nouvelle liste portent une entrée', async () => {
      await setup();
      host.query.set(q({ city: ['Annecy', 'Brest', 'Caen', 'Dijon', 'Évry', 'Fréjus', 'Gap', 'Hyères', 'Istres'] }));
      await stable();
      expect(rowNodes()).toHaveLength(9);
      expect(ranks().filter((rank) => rank !== '')).toHaveLength(8);
    });

    describe('animations (lcFlip, lcAnimate)', () => {
      type Call = { target: HTMLElement; keyframes: Record<string, unknown>[]; options: KeyframeAnimationOptions };
      let calls: Call[];

      /** Web Animations simulée : `animate` enregistre ses appels ; la mise en page est simulée (40 px par ligne, dans l'ordre du DOM). */
      const stubLayout = (reduced = false) => {
        calls = [];
        (HTMLElement.prototype as { animate?: unknown }).animate = function (this: HTMLElement, keyframes: Record<string, unknown>[], options: KeyframeAnimationOptions) {
          calls.push({ target: this, keyframes, options });
          return { finished: Promise.resolve(), cancel() {} };
        };
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
          return { top: [...document.querySelectorAll('tbody tr')].indexOf(this) * 40 } as DOMRect;
        });
        vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
        vi.stubGlobal('getComputedStyle', () => ({
          getPropertyValue: (name: string) => ({ '--lc-list-move-duration': '200ms', '--lc-list-move-easing': 'ease-in-out', '--lc-sys-duration-fast': '150ms', '--lc-overlay-easing': 'ease-out' })[name] ?? '',
        }));
      };

      afterEach(() => {
        delete (HTMLElement.prototype as { animate?: unknown }).animate;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
      });

      it('tri : les lignes qui changent de place glissent (translateY de l\'ancienne à la nouvelle place), les autres n\'animent rien', async () => {
        await setup();
        const before = rowNodes();
        stubLayout();
        host.query.set({ filters: {}, sort: { columnId: 'date', direction: 'desc' } });
        await stable();
        const moved = calls.filter((call) => call.keyframes[1]?.['transform'] === 'none');
        expect(moved.length).toBeGreaterThan(0);
        expect(moved.length).toBeLessThan(before.length + 1);
        expect(moved.every((call) => before.includes(call.target))).toBe(true);
        expect(moved[0].options).toMatchObject({ duration: 200, easing: 'ease-in-out' });
        expect(calls.every((call) => !('opacity' in call.keyframes[0]))).toBe(true); // aucune entrée ni sortie
      });

      it('filtre : aucune ligne ne glisse (la liste est reconstruite)', async () => {
        await setup();
        stubLayout();
        host.query.set(q({ state: ['Close'] }));
        await stable();
        expect(calls).toHaveLength(0);
      });

      it('réduction de mouvement : ni glissement ni fondu', async () => {
        await setup();
        stubLayout(true);
        host.query.set({ filters: {}, sort: { columnId: 'date', direction: 'desc' } });
        await stable();
        host.query.set(q({ state: ['Close'] }));
        await stable();
        expect(calls).toHaveLength(0);
      });

      type ChipTarget = { fadeOutChip(event: unknown): void };
      const chipComponent = () => fixture.debugElement.query(By.directive(LcDataTableComponent)).componentInstance as ChipTarget;

      it('CA-H4 : pastille sortante : fondu duration-fast, sortie du flux à sa place, non cliquable (data-leaving) ; retirée à la fin du fondu', async () => {
        await setup({ query: q({ state: ['Close'] }), chips: 'always' });
        stubLayout();
        const chip = el.querySelector<HTMLElement>('.lc-data-table__chip')!;
        const animationComplete = vi.fn();
        chipComponent().fadeOutChip({ target: chip, animationComplete });
        expect(chip.hasAttribute('data-leaving')).toBe(true);
        expect(chip.style.left).toMatch(/px$/);
        expect(chip.style.top).toMatch(/px$/);
        expect(calls[0].keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
        expect(calls[0].options).toEqual({ duration: 150, easing: 'ease-out', delay: 0, fill: 'forwards' });
        await new Promise((resolve) => setTimeout(resolve));
        expect(animationComplete).toHaveBeenCalledOnce();
      });

      it('CA-R1 : pastille sortante en réduction de mouvement : retrait immédiat, sans animation', async () => {
        await setup({ query: q({ state: ['Close'] }), chips: 'always' });
        stubLayout(true);
        const animationComplete = vi.fn();
        chipComponent().fadeOutChip({ target: el.querySelector<HTMLElement>('.lc-data-table__chip')!, animationComplete });
        expect(animationComplete).toHaveBeenCalledOnce();
        expect(calls).toHaveLength(0);
      });

      it('CA-H4 : retrait d\'une pastille : le bloc de la liste glisse d\'un seul trait de sa place d\'avant (translateY) vers sa place d\'après', async () => {
        await setup({ query: q({ state: ['Close'] }), chips: 'always' });
        stubLayout();
        // La rangée se resserre quand la pastille disparaît : le bloc de la liste remonte de 60 à 20.
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
          return { top: this.classList.contains('lc-data-table__scroll') ? (document.querySelector('.lc-data-table__chip') ? 60 : 20) : 0 } as DOMRect;
        });
        await click(el.querySelector<HTMLButtonElement>('.lc-data-table__chip-remove')!);
        await stable();
        const slides = calls.filter((call) => call.target.classList.contains('lc-data-table__scroll'));
        expect(slides).toHaveLength(1);
        expect(slides[0].keyframes).toEqual([{ transform: 'translateY(40px)' }, { transform: 'none' }]);
        expect(slides[0].options).toMatchObject({ duration: 200, easing: 'ease-in-out' });
      });
    });

    it('panneau : une première attente ne ferme pas le dialogue rouvert puis refermé pendant la seconde', async () => {
      await setup({ narrow: true });
      const dialog = await openPanel();
      const finishFirst = animate(dialog);
      await click(dialog.querySelector<HTMLButtonElement>('.lc-sheet__close')!);
      await click(el.querySelector<HTMLButtonElement>('[id$="-filters"]')!); // rouvre pendant le fondu
      const finishSecond = animate(dialog);
      await click(dialog.querySelector<HTMLButtonElement>('.lc-sheet__close')!);
      expect(dialog.hasAttribute('data-closing')).toBe(true);
      finishFirst();
      await stable();
      expect(dialog.close).not.toHaveBeenCalled();
      finishSecond();
      await stable();
      expect(dialog.close).toHaveBeenCalledOnce();
    });

    it('menu de filtre : Échap passe par la fermeture en fondu (contenu présent, focus rendu à l\'entonnoir, rien d\'appliqué)', async () => {
      await setup();
      await open('state');
      const pane = document.querySelector<HTMLElement>('.lc-data-table__overlay')!;
      const finish = animate(pane);
      // keyCode comme un vrai navigateur : le CDK s'y fie pour détacher lui-même le panneau sans `disableClose`.
      (document.activeElement ?? menu()!).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
      await stable();
      expect(pane.classList.contains('lc-overlay--closing')).toBe(true);
      expect(menu()).not.toBeNull();
      finish();
      await stable();
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(funnel('state'));
      expect(host.emitted).toHaveLength(0);
    });

    it('menu de filtre : rouvrir la même colonne pendant le fondu annule la fermeture', async () => {
      await setup();
      await open('state');
      const pane = document.querySelector<HTMLElement>('.lc-data-table__overlay')!;
      const finish = animate(pane);
      await click(applyBtn());
      expect(pane.classList.contains('lc-overlay--closing')).toBe(true);
      await open('state');
      expect(pane.classList.contains('lc-overlay--closing')).toBe(false);
      finish();
      await stable();
      expect(menu()).not.toBeNull();
      expect(funnel('state').getAttribute('aria-expanded')).toBe('true');
    });

    it('menu de filtre : ouvrir une autre colonne pendant le fondu garde le menu, sur la nouvelle colonne', async () => {
      await setup();
      await open('state');
      const pane = document.querySelector<HTMLElement>('.lc-data-table__overlay')!;
      const finish = animate(pane);
      await click(applyBtn());
      expect(pane.classList.contains('lc-overlay--closing')).toBe(true);
      await open('city');
      expect(pane.classList.contains('lc-overlay--closing')).toBe(false);
      finish();
      await stable();
      expect(menu()).not.toBeNull();
      expect(optionLabels()).toContain('Annecy');
      expect(funnel('city').getAttribute('aria-expanded')).toBe('true');
    });
  });
});
