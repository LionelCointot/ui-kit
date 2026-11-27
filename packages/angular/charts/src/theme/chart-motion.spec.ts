// Acceptation de docs/specs/2026-12-mouvement-v2.md, T11 : CA-28 (durée et courbe de lc-chart lues des tokens, animation coupée sous mouvement réduit).
// Contrat : `LC_CHART_EASING` (./chart-motion) = table « rôle de courbe sys → nom d'easing ECharts/zrender » ; tokens `--lc-chart-sparkline-duration`,
// `--lc-chart-update-duration`, `--lc-chart-update-stagger` (T1). Les valeurs ci-dessous viennent d'un calcul indépendant : erreur quadratique moyenne entre
// chaque `cubic-bezier` de §5.2 et chacun des easings de zrender (200 points) ; le plus proche est retenu.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import easingFuncs from 'zrender/lib/animation/easing.js';
import { LC_ECHARTS_ENGINE } from '../echarts-registry';
import { LC_CHARTS_OPTIONS } from '../provide-lc-charts';
import { LcAreaChartComponent } from '../components/area-chart.component';
import { LcBarChartComponent } from '../components/bar-chart.component';
import { LcChartComponent } from '../components/chart.component';
import { LcLineChartComponent } from '../components/line-chart.component';
import { LcSparklineComponent } from '../components/sparkline.component';
import { LC_CHART_EASING } from './chart-motion';

const EXPECTED_EASING: Record<string, string> = {
  standard: 'cubicOut', // écart 0,039 : pas d'équivalent exact
  entrance: 'exponentialOut', // 0,004
  fill: 'quinticOut', // 0,021
  soft: 'cubicOut', // 0,003
  out: 'cubicOut', // 0,011
  pop: 'backOut', // 0,039 : le dépassement (12-15 %) n'est qu'approché
  'pop-strong': 'backOut', // 0,127 : dépassement de 30 % non reproductible
  title: 'quinticOut', // 0,005 (et non quarticOut, 0,043, malgré « power4.out » dans la spec)
  draw: 'quadraticInOut', // 0,008
  inout: 'cubicInOut', // 0,014
  exit: 'sinusoidalIn', // 0,014
  stack: 'quarticOut', // 0,044
};

interface FakeChart { setOption: ReturnType<typeof vi.fn>; resize: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn>; dispatchAction: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> }
const charts: FakeChart[] = [];

class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe(element: HTMLElement): void {
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 400 });
    queueMicrotask(this.callback);
  }
  disconnect(): void {}
}

const DATA = { categories: ['a', 'b', 'c'], series: [{ id: 's', label: 'S', values: [1, 2, 3] }] };

@Component({
  imports: [LcSparklineComponent, LcBarChartComponent, LcLineChartComponent, LcAreaChartComponent, LcChartComponent],
  template: `
    <lc-sparkline ariaLabel="tendance" [values]="[1, 2, 3]" />
    <lc-bar-chart title="Barres" [data]="data" />
    <lc-line-chart title="Courbe" [data]="data" />
    <lc-area-chart title="Aire" [data]="data" />
    <lc-chart ariaLabel="Brut" [options]="raw" [table]="{ columns: ['x'], rows: [['a']] }" />
  `,
})
class MotionHostComponent {
  readonly data = DATA;
  readonly raw = { xAxis: { type: 'category', data: ['a'] }, yAxis: { type: 'value' }, series: [{ type: 'line', data: [1] }] };
}

const SPARKLINE = 0;
const OTHERS = [1, 2, 3, 4];

describe('graphiques : mouvement depuis les tokens (T11, CA-28)', () => {
  const root = document.documentElement.style;

  beforeEach(() => {
    charts.length = 0;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    media(false); // le navigateur de test peut demander la réduction : on fixe le contexte
    root.setProperty('--lc-chart-sparkline-duration', '777ms');
    root.setProperty('--lc-chart-update-duration', '555ms');
    root.setProperty('--lc-chart-update-stagger', '33ms');
    TestBed.configureTestingModule({
      providers: [
        { provide: LC_CHARTS_OPTIONS, useValue: { renderer: 'svg', patterns: 'never' } },
        { provide: LC_ECHARTS_ENGINE, useValue: { init: () => {
          const chart: FakeChart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), dispatchAction: vi.fn(), on: vi.fn() };
          charts.push(chart);
          return chart;
        } } },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('style');
  });

  async function mount() {
    const fixture = TestBed.createComponent(MotionHostComponent);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    expect(charts.length).toBe(5);
    // premier setOption : le rendu initial ; un changement de thème ultérieur applique animation: false (comportement existant)
    return charts.map((chart) => chart.setOption.mock.calls[0][0]);
  }

  const media = (reduced: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)', media: query, addEventListener: () => {}, removeEventListener: () => {},
  }));
  const reduceMotion = () => media(true);

  it('CA-28 : la table couvre les 12 rôles de courbe de §5.2 avec des noms d\'easing que zrender connaît', () => {
    expect(Object.keys(LC_CHART_EASING).sort()).toEqual(Object.keys(EXPECTED_EASING).sort());
    for (const name of Object.values(LC_CHART_EASING)) expect(Object.keys(easingFuncs)).toContain(name);
  });

  it('CA-28 : la table donne, pour chaque rôle, l\'easing le plus proche (calcul indépendant)', () => {
    expect({ ...LC_CHART_EASING }).toEqual(EXPECTED_EASING);
  });

  it('CA-28 : la sparkline passe animationDuration = token sparkline-duration et animationEasing = LC_CHART_EASING.draw', async () => {
    const option = (await mount())[SPARKLINE];
    expect(option.animation).toBe(true);
    expect(option.animationDuration).toBe(777);
    expect(option.animationEasing).toBe(LC_CHART_EASING['draw']);
  });

  it('CA-28 : barres, courbe, aire et lc-chart passent animationDuration et animationDurationUpdate = token update-duration, courbe draw, décalage = update-stagger × rang', async () => {
    const options = await mount();
    for (const index of OTHERS) {
      const option = options[index];
      expect(option.animation, `graphique ${index}`).toBe(true);
      expect(option.animationDuration, `graphique ${index}`).toBe(555);
      expect(option.animationDurationUpdate, `graphique ${index}`).toBe(555);
      expect(option.animationEasing, `graphique ${index}`).toBe(LC_CHART_EASING['draw']);
      expect(option.animationEasingUpdate, `graphique ${index}`).toBe(LC_CHART_EASING['draw']);
      expect(typeof option.animationDelayUpdate, `graphique ${index}`).toBe('function');
      expect([0, 1, 3].map((rank) => option.animationDelayUpdate(rank))).toEqual([0, 33, 99]);
    }
  });

  it('CA-28 : aucune durée en dur (changer un token change l\'option)', async () => {
    root.setProperty('--lc-chart-update-duration', '123ms');
    root.setProperty('--lc-chart-sparkline-duration', '321ms');
    const options = await mount();
    expect(options[SPARKLINE].animationDuration).toBe(321);
    expect(options[1].animationDuration).toBe(123);
  });

  it('CA-28 : sous mouvement réduit, animation vaut false pour tous les graphiques', async () => {
    reduceMotion();
    const options = await mount();
    expect(options.map((option) => option.animation)).toEqual([false, false, false, false, false]);
  });
});
