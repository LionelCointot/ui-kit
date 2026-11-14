import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_ECHARTS_ENGINE } from '../echarts-registry';
import { LC_CHARTS_OPTIONS } from '../provide-lc-charts';
import type { LcCartesianData } from '../types';
import { readChartTheme } from '../theme/chart-theme.service';
import { LcBarChartComponent } from './bar-chart.component';
import { LcLineChartComponent } from './line-chart.component';

interface FakeChart {
  setOption: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  dispatchAction: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

const charts: FakeChart[] = [];

class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe(element: HTMLElement): void {
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 400 });
    queueMicrotask(this.callback);
  }
  disconnect(): void {}
}

const ROLE_TOKENS: Record<string, string> = {
  success: '#0a8a0a', warning: '#e0a000', error: '#d03030', info: '#2060c0', neutral: '#808080', highlight: '#5a40d0',
};

const data: LcCartesianData = {
  categories: ['2026', '2027', '2028'],
  series: [
    { id: 'plain', label: 'Sans rôle', values: [1, 2, 3] },
    { id: 'ko', label: 'En erreur', values: [3, 2, 1], colorRole: 'error' },
    { id: 'ok', label: 'Réussi', values: [2, 2, 2], colorRole: 'success' },
    { id: 'hl', label: 'Intermittent', values: [1, 1, 1], colorRole: 'highlight' },
  ],
};

@Component({
  imports: [LcBarChartComponent, LcLineChartComponent],
  template: `
    <lc-bar-chart title="Volumes par état" [data]="data()" [stacked]="true" />
    <lc-line-chart title="Évolution par état" [data]="data()" />
  `,
})
class RoleChartsHostComponent {
  readonly data = signal(data);
}

describe('graphiques : couleur de série par rôle (K6)', () => {
  beforeEach(() => {
    charts.length = 0;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    for (const [role, value] of Object.entries(ROLE_TOKENS)) document.documentElement.style.setProperty(`--lc-sys-chart-role-${role}`, value);
    document.documentElement.style.setProperty('--lc-sys-chart-categorical-1', '#101010');
    document.documentElement.style.setProperty('--lc-sys-chart-categorical-2', '#202020');
    TestBed.configureTestingModule({
      providers: [
        { provide: LC_CHARTS_OPTIONS, useValue: { renderer: 'svg', patterns: 'never' } },
        {
          provide: LC_ECHARTS_ENGINE,
          useValue: {
            init: () => {
              const chart: FakeChart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), dispatchAction: vi.fn(), on: vi.fn() };
              charts.push(chart);
              return chart;
            },
          },
        },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('style');
  });

  async function setup() {
    const fixture = TestBed.createComponent(RoleChartsHostComponent);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const lastOption = (index: number) => charts[index].setOption.mock.calls.at(-1)![0];

  it('readChartTheme lit les six tokens --lc-sys-chart-role-* dans LcChartTheme.roles', () => {
    const theme = readChartTheme(document.documentElement.style, { reducedMotion: false, patterns: false });
    expect(theme.roles).toEqual(ROLE_TOKENS);
  });

  it('CA-K6.1 : avec patterns "never", une série colorRole="error" utilise le token du rôle et un décalque hachuré', async () => {
    await setup();
    const bars = lastOption(0).series.filter((series: { id: string }) => series.id !== '__totals__');
    const byId = (id: string) => bars.find((series: { id: string }) => series.id === id);
    expect(byId('ko').itemStyle.color).toBe(ROLE_TOKENS['error']);
    expect(byId('ko').itemStyle.decal).toBeDefined();
    expect(byId('ko').itemStyle.decal.rotation).toBeCloseTo(Math.PI / 4);
    expect(byId('hl').itemStyle.color).toBe(ROLE_TOKENS['highlight']);
    expect(byId('hl').itemStyle.decal.rotation).toBeCloseTo(-Math.PI / 4);
    expect(byId('ok').itemStyle.color).toBe(ROLE_TOKENS['success']);
    expect(byId('ok').itemStyle.decal).toBeUndefined();
    // patterns "never" : la série sans rôle n'a aucun décalque
    expect(byId('plain').itemStyle.decal).toBeUndefined();
  });

  it('CA-K6.3 : la série sans rôle garde le premier emplacement (les rôles n\'en consomment aucun)', async () => {
    await setup();
    const plain = lastOption(0).series.find((series: { id: string }) => series.id === 'plain');
    expect(plain.itemStyle.color).toBe('#101010');
  });

  it('CA-K6.1 : la légende porte l\'icône du rôle et le libellé ; pas d\'icône pour la série sans rôle', async () => {
    const { element } = await setup();
    const items = [...element.querySelectorAll('lc-bar-chart .lc-chart-frame__legend button')];
    expect(items.length).toBe(4);
    const iconNames = items.map((item) => item.querySelector('lc-icon svg') !== null);
    expect(iconNames).toEqual([false, true, true, true]);
    expect(items[1].textContent).toContain('En erreur');
    expect(items[1].querySelector('lc-icon')!.getAttribute('aria-hidden')).toBe('true');
    const iconPaths = items.slice(1).map((item) => item.querySelector('lc-icon svg')!.innerHTML);
    expect(new Set(iconPaths).size).toBe(3);
  });

  it('CA-K6.3 : masquer une série par la légende ne repeint pas les autres (barres et courbes)', async () => {
    const { fixture, element } = await setup();
    const colors = (option: { series: { id: string; itemStyle?: { color: string }; lineStyle?: { color: string } }[] }) =>
      Object.fromEntries(option.series.filter((series) => series.id !== '__totals__').map((series) => [series.id, series.itemStyle?.color ?? series.lineStyle?.color]));
    const barsBefore = colors(lastOption(0));
    const linesBefore = colors(lastOption(1));
    element.querySelectorAll<HTMLButtonElement>('lc-bar-chart .lc-chart-frame__legend button')[1].click();
    element.querySelectorAll<HTMLButtonElement>('lc-line-chart .lc-chart-frame__legend button')[1].click();
    await fixture.whenStable();
    const barsAfter = colors(lastOption(0));
    const linesAfter = colors(lastOption(1));
    expect(Object.keys(barsAfter)).toEqual(['plain', 'ok', 'hl']);
    expect(Object.keys(linesAfter)).toEqual(['plain', 'ok', 'hl']);
    for (const id of ['plain', 'ok', 'hl']) {
      expect(barsAfter[id], `barre ${id}`).toBe(barsBefore[id]);
      expect(linesAfter[id], `courbe ${id}`).toBe(linesBefore[id]);
    }
    const legend = element.querySelectorAll('lc-bar-chart .lc-chart-frame__legend button');
    expect(legend.length).toBe(4);
    expect(legend[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('CA-K6.4 : sans colorRole, la légende n\'ajoute aucune icône et le rendu reste celui des emplacements', async () => {
    const fixture = TestBed.createComponent(RoleChartsHostComponent);
    fixture.componentInstance.data.set({
      categories: ['2026', '2027'],
      series: [{ id: 'a', label: 'A', values: [1, 2] }, { id: 'b', label: 'B', values: [2, 3] }],
    });
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('lc-bar-chart .lc-chart-frame__legend button').length).toBe(2);
    expect(element.querySelectorAll('lc-bar-chart .lc-chart-frame__legend lc-icon').length).toBe(0);
    const series = lastOption(0).series.filter((item: { id: string }) => item.id === 'a' || item.id === 'b');
    expect(series.map((item: { itemStyle: { color: string } }) => item.itemStyle.color)).toEqual(['#101010', '#202020']);
    expect(series.every((item: { itemStyle: { decal?: unknown } }) => item.itemStyle.decal === undefined)).toBe(true);
  });

  describe('motif par série (I3) : légende', () => {
    async function setupPatterns(series: LcCartesianData['series']) {
      const fixture = TestBed.createComponent(RoleChartsHostComponent);
      fixture.componentInstance.data.set({ categories: ['2026', '2027'], series });
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const swatches = (chart: string) => [...element.querySelectorAll(`${chart} .lc-chart-frame__legend .lc-chart-frame__swatch`)];
      return { swatches };
    }

    it('la pastille rect porte data-pattern pour chaque motif, et le décalque du graphique suit avec patterns "never"', async () => {
      const { swatches } = await setupPatterns([
        { id: 'a', label: 'A', values: [1, 2], pattern: 'hatch' },
        { id: 'b', label: 'B', values: [1, 2], pattern: 'hatch-reverse' },
        { id: 'c', label: 'C', values: [1, 2], pattern: 'dots' },
        { id: 'd', label: 'D', values: [1, 2], pattern: 'solid' },
      ]);
      expect(swatches('lc-bar-chart').map((swatch) => swatch.getAttribute('data-pattern'))).toEqual(['hatch', 'hatch-reverse', 'dots', 'solid']);
      const decal = (id: string) => lastOption(0).series.find((series: { id: string }) => series.id === id).itemStyle.decal;
      expect(decal('a').rotation).toBeCloseTo(Math.PI / 4);
      expect(decal('b').rotation).toBeCloseTo(-Math.PI / 4);
      expect(decal('c').symbol).toBe('circle');
      expect(decal('d')).toBeUndefined();
    });

    it('sans pattern, la pastille n\'a pas d\'attribut data-pattern', async () => {
      const { swatches } = await setupPatterns([{ id: 'a', label: 'A', values: [1, 2] }, { id: 'b', label: 'B', values: [1, 2], pattern: 'dots' }]);
      expect(swatches('lc-bar-chart').map((swatch) => swatch.hasAttribute('data-pattern'))).toEqual([false, true]);
    });

    it('la légende des courbes (line) n\'a jamais de data-pattern', async () => {
      const { swatches } = await setupPatterns([{ id: 'a', label: 'A', values: [1, 2], pattern: 'hatch' }, { id: 'b', label: 'B', values: [1, 2], pattern: 'dots' }]);
      const lineSwatches = swatches('lc-line-chart');
      expect(lineSwatches.length).toBe(2);
      expect(lineSwatches.some((swatch) => swatch.hasAttribute('data-pattern'))).toBe(false);
    });
  });
});
