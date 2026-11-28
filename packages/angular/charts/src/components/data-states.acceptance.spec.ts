import type { Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LC_LABELS } from '@lionelcointot/ui-angular';
import { LC_ECHARTS_ENGINE } from '../echarts-registry';
import { LcAreaChartComponent } from './area-chart.component';
import { LcBarChartComponent } from './bar-chart.component';
import { LcChartComponent } from './chart.component';
import { LcLineChartComponent } from './line-chart.component';
import { LcSegmentedBarComponent } from './segmented-bar.component';
import { LcSparklineComponent } from './sparkline.component';

// Spec 2026-12-squelette-automatique, CA-2 à CA-5, composants 6 à 11 (§5.3) ; aria-busy sur le cadre `lc-chart-frame` pour 6 à 10.
type Kind = 'undefined' | 'null' | 'empty' | 'ready';
interface Case {
  name: string;
  cmp: Type<unknown>;
  fixed: Record<string, unknown>;
  bind: (kind: Kind) => Record<string, unknown>;
  /** Texte rendu seulement quand la donnée est prête (légende) ; absent : aucun texte de donnée. */
  dataText?: string;
  list: boolean;
  /** Entrée `emptyMessage` (sparkline : tiret, pas de message). */
  frame: boolean;
  staleClass: string;
}

const value = (kind: Kind, ready: unknown) => ({ undefined: undefined, null: null, empty: [], ready })[kind];
const field = (name: string, ready: unknown) => (kind: Kind) => ({ [name]: value(kind, ready) });
const cartesian = { categories: ['2026', '2027'], series: [{ id: 'a', label: 'Capital', values: [1, 2] }, { id: 'b', label: 'Intérêts', values: [3, 4] }] };
// `empty` : pour les graphiques cartésiens, une liste vide de série (règle d'affinage §5.2).
const cartesianBind = (kind: Kind) => ({ data: kind === 'empty' ? { categories: ['2026'], series: [] } : value(kind, cartesian) });
const FRAME_STALE = '.lc-chart-frame__chart--stale';

const cases: Case[] = [
  { name: '6 lc-chart', cmp: LcChartComponent, fixed: { ariaLabel: 'Courbe' }, bind: field('options', { series: [{ type: 'line', data: [1, 2] }] }), list: false, frame: true, staleClass: FRAME_STALE },
  ...[['7 lc-line-chart', LcLineChartComponent], ['8 lc-area-chart', LcAreaChartComponent], ['9 lc-bar-chart', LcBarChartComponent]].map(([name, cmp]) => (
    { name: name as string, cmp: cmp as Type<unknown>, fixed: { title: 'Évolution' }, bind: cartesianBind, dataText: 'Capital', list: true, frame: true, staleClass: FRAME_STALE })),
  {
    name: '10 lc-segmented-bar', cmp: LcSegmentedBarComponent, fixed: { title: 'Coût' }, bind: field('parts', [{ id: 'k', label: 'Capital', value: 100 }, { id: 'i', label: 'Intérêts', value: 50 }]),
    dataText: 'Capital', list: true, frame: true, staleClass: FRAME_STALE,
  },
  { name: '11 lc-sparkline', cmp: LcSparklineComponent, fixed: { ariaLabel: 'Tendance des mensualités' }, bind: field('values', [1, 2, 3]), list: true, frame: false, staleClass: '.lc-sparkline--stale' },
];

class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe(element: HTMLElement): void {
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 400 });
    queueMicrotask(this.callback);
  }
  disconnect(): void {}
}

const settle = async (fixture: ComponentFixture<unknown>) => {
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
};
const text = (el: HTMLElement) => el.textContent!.replace(/\s+/g, ' ');

describe.each(cases)('états de données : $name', (c) => {
  const noData = () => TestBed.inject(LC_LABELS).noData;

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    TestBed.configureTestingModule({
      providers: [{ provide: LC_ECHARTS_ENGINE, useValue: { init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), dispatchAction: vi.fn(), on: vi.fn() }) } }],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function render(kind: Kind, extra: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(c.cmp);
    for (const [name, v] of Object.entries({ ...c.fixed, ...c.bind(kind), ...extra })) fixture.componentRef.setInput(name, v);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host, busy: c.frame ? host.querySelector<HTMLElement>('lc-chart-frame')! : host };
  }
  const set = async (fixture: ComponentFixture<unknown>, inputs: Record<string, unknown>) => {
    for (const [name, v] of Object.entries(inputs)) fixture.componentRef.setInput(name, v);
    await settle(fixture);
  };
  const stale = (host: HTMLElement) => host.matches(c.staleClass) || host.querySelector(c.staleClass) !== null;

  function expectSkeleton(host: HTMLElement, busy: HTMLElement) {
    expect(host.querySelectorAll('lc-skeleton').length).toBeGreaterThan(0);
    expect(text(host)).not.toContain(noData());
    expect(text(host)).not.toContain('—');
    if (c.dataText) expect(text(host)).not.toContain(c.dataText);
    expect(busy.getAttribute('aria-busy')).toBe('true');
  }
  function expectEmpty(host: HTMLElement, busy: HTMLElement, message = noData()) {
    if (c.frame) expect(text(host)).toContain(message);
    else {
      expect(text(host)).toContain('—');
      const names = [host, ...host.querySelectorAll<HTMLElement>('[aria-label]')].map((el) => el.getAttribute('aria-label') ?? '').join(' ');
      expect(names).toContain(c.fixed['ariaLabel'] as string);
      expect(names).toContain(noData());
    }
    expect(host.querySelector('lc-skeleton')).toBeNull();
    expect(busy.hasAttribute('aria-busy')).toBe(false);
  }

  it('CA-2 : undefined affiche le squelette, ni texte vide, ni donnée, aria-busy (cadre pour 6 à 10)', async () => {
    const { host, busy } = await render('undefined');
    expectSkeleton(host, busy);
  });

  it('CA-3a CA-3d : null affiche l\'état vide, sans squelette ni aria-busy', async () => {
    const { host, busy } = await render('null');
    expectEmpty(host, busy);
  });

  it.runIf(c.frame)('CA-3a : emptyMessage relayé au cadre, une chaîne vide retombe sur noData', async () => {
    const { fixture, host, busy } = await render('null', { emptyMessage: 'Rien ici' });
    expectEmpty(host, busy, 'Rien ici');
    await set(fixture, { emptyMessage: '' });
    expectEmpty(host, busy);
  });

  it.runIf(c.list)('CA-3b : [] (séries vides pour 7 à 9) donne le même état vide que null', async () => {
    const { host, busy } = await render('empty');
    expectEmpty(host, busy);
  });

  it.runIf(c.name.match(/^[789] /) !== null)('CA-3c : séries toutes null : vide', async () => {
    const { host, busy } = await render('ready', { data: { categories: ['a', 'b'], series: [{ id: 'x', label: 'X', values: [null, null] }] } });
    expectEmpty(host, busy);
  });

  it('CA-4 : loading avec une donnée présente affiche le squelette, pas la donnée', async () => {
    const { fixture, host, busy } = await render('ready');
    expect(host.querySelector('lc-skeleton')).toBeNull();
    if (c.dataText) expect(text(host)).toContain(c.dataText);
    expect(busy.hasAttribute('aria-busy')).toBe(false);
    await set(fixture, { loading: true });
    expectSkeleton(host, busy);
  });

  it('CA-5 : stale garde la donnée, aria-busy et classe ; undefined : squelette sans classe ; séquence valeurs, undefined, valeurs', async () => {
    const { fixture, host, busy } = await render('ready');
    expect(stale(host)).toBe(false);
    await set(fixture, { stale: true });
    if (c.dataText) expect(text(host)).toContain(c.dataText);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    expect(stale(host)).toBe(true);
    expect(host.querySelector('lc-skeleton')).toBeNull();
    await set(fixture, c.bind('undefined'));
    expectSkeleton(host, busy);
    expect(stale(host)).toBe(false);
    await set(fixture, c.bind('ready'));
    if (c.dataText) expect(text(host)).toContain(c.dataText);
    expect(host.querySelector('lc-skeleton')).toBeNull();
  });
});
