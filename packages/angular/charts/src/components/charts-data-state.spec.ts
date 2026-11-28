import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_ECHARTS_ENGINE } from '../echarts-registry';
import type { LcCartesianData, LcPart } from '../types';
import { LcBarChartComponent } from './bar-chart.component';
import { LcChartComponent } from './chart.component';
import { LcLineChartComponent } from './line-chart.component';
import { LcSegmentedBarComponent } from './segmented-bar.component';
import { LcSparklineComponent } from './sparkline.component';

const data: LcCartesianData = { categories: ['a', 'b'], series: [{ id: 's', label: 'S', values: [1, 2] }] };
const parts: LcPart[] = [{ id: 'p', label: 'P', value: 1 }];

@Component({
  imports: [LcLineChartComponent, LcBarChartComponent, LcSegmentedBarComponent, LcChartComponent, LcSparklineComponent],
  template: `
    <lc-line-chart title="L" [data]="cartesian()" [loading]="loading()" [stale]="stale()" [emptyMessage]="message()" />
    <lc-bar-chart title="B" [data]="cartesian()" />
    <lc-segmented-bar title="S" [parts]="parts()" />
    <lc-chart ariaLabel="C" [options]="options()" [emptyMessage]="message()" />
    <lc-sparkline ariaLabel="Spark" [values]="values()" [loading]="loading()" [stale]="stale()" />
  `,
})
class HostComponent {
  readonly cartesian = signal<LcCartesianData | null | undefined>(data);
  readonly parts = signal<LcPart[] | null | undefined>(parts);
  readonly options = signal<Record<string, unknown> | null | undefined>({ series: [] });
  readonly values = signal<number[] | null | undefined>([1, 2, 3]);
  readonly loading = signal(false);
  readonly stale = signal(false);
  readonly message = signal<string | undefined>(undefined);
}

class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe(element: HTMLElement): void {
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 400 });
    queueMicrotask(this.callback);
  }
  disconnect(): void {}
}

describe('graphiques : état des données', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    TestBed.configureTestingModule({
      providers: [{
        provide: LC_ECHARTS_ENGINE,
        useValue: { init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), dispatchAction: vi.fn(), on: vi.fn() }) },
      }],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const flush = async () => { await fixture.whenStable(); };
    return { host: fixture.componentInstance, element, flush };
  }

  const frameOf = (element: HTMLElement, tag: string) => element.querySelector(`${tag} lc-chart-frame`)!;

  it('undefined : squelette et aria-busy sur le cadre, ni message vide ni tracé', async () => {
    const { host, element, flush } = await setup();
    host.cartesian.set(undefined);
    host.parts.set(undefined);
    host.options.set(undefined);
    await flush();
    for (const tag of ['lc-line-chart', 'lc-bar-chart', 'lc-segmented-bar', 'lc-chart']) {
      expect(frameOf(element, tag).querySelector('lc-skeleton'), tag).not.toBeNull();
      expect(frameOf(element, tag).getAttribute('aria-busy'), tag).toBe('true');
      expect(frameOf(element, tag).querySelector('.lc-chart-frame__empty'), tag).toBeNull();
    }
  });

  it('null : texte vide du cadre (emptyMessage ou noData), sans squelette ni aria-busy', async () => {
    const { host, element, flush } = await setup();
    host.cartesian.set(null);
    host.parts.set(null);
    host.options.set(null);
    host.message.set('Rien ici');
    await flush();
    expect(frameOf(element, 'lc-line-chart').querySelector('.lc-chart-frame__empty')!.textContent).toBe('Rien ici');
    expect(frameOf(element, 'lc-chart').querySelector('.lc-chart-frame__empty')!.textContent).toBe('Rien ici');
    expect(frameOf(element, 'lc-bar-chart').querySelector('.lc-chart-frame__empty')!.textContent).toBe('Aucune donnée');
    host.message.set('');
    await flush();
    expect(frameOf(element, 'lc-chart').querySelector('.lc-chart-frame__empty')!.textContent).toBe('Aucune donnée');
    for (const tag of ['lc-line-chart', 'lc-bar-chart', 'lc-segmented-bar', 'lc-chart']) {
      expect(frameOf(element, tag).querySelector('lc-skeleton'), tag).toBeNull();
      expect(frameOf(element, tag).getAttribute('aria-busy'), tag).toBeNull();
    }
  });

  it('affinage vide existant : séries toutes null et parts [] restent vides', async () => {
    const { host, element, flush } = await setup();
    host.cartesian.set({ categories: ['a'], series: [{ id: 's', label: 'S', values: [null] }] });
    host.parts.set([]);
    await flush();
    expect(frameOf(element, 'lc-line-chart').querySelector('.lc-chart-frame__empty')).not.toBeNull();
    expect(frameOf(element, 'lc-segmented-bar').querySelector('.lc-chart-frame__empty')).not.toBeNull();
  });

  it('loading avec donnée : squelette, tracé absent ; stale pendant le squelette sans classe', async () => {
    const { host, element, flush } = await setup();
    host.loading.set(true);
    host.stale.set(true);
    await flush();
    const frame = frameOf(element, 'lc-line-chart');
    expect(frame.querySelector('lc-skeleton')).not.toBeNull();
    expect(frame.querySelector('lc-chart-host')).toBeNull();
    expect(frame.querySelector('.lc-chart-frame__chart--stale')).toBeNull();
  });

  describe('lc-sparkline', () => {
    const sparkline = (element: HTMLElement) => element.querySelector('lc-sparkline')!;

    it('undefined : squelette à sa hauteur, aria-busy', async () => {
      const { host, element, flush } = await setup();
      host.values.set(undefined);
      await flush();
      expect(sparkline(element).querySelector('lc-skeleton')).not.toBeNull();
      expect(sparkline(element).getAttribute('aria-busy')).toBe('true');
      expect(sparkline(element).querySelector('lc-chart-host')).toBeNull();
    });

    it('null et [] : « — » visible, nom accessible ariaLabel + noData, sans aria-busy', async () => {
      const { host, element, flush } = await setup();
      for (const empty of [null, []]) {
        host.values.set(empty);
        await flush();
        const dash = sparkline(element).querySelector('.lc-sparkline__empty')!;
        expect(dash.textContent).toBe('—');
        expect(dash.getAttribute('aria-label')).toBe('Spark : Aucune donnée');
        expect(sparkline(element).getAttribute('aria-busy')).toBeNull();
        expect(sparkline(element).querySelector('lc-skeleton')).toBeNull();
      }
    });

    it('stale : tracé gardé, classe et aria-busy ; avec undefined, squelette sans classe', async () => {
      const { host, element, flush } = await setup();
      host.stale.set(true);
      await flush();
      expect(sparkline(element).classList).toContain('lc-sparkline--stale');
      expect(sparkline(element).getAttribute('aria-busy')).toBe('true');
      expect(sparkline(element).querySelector('lc-chart-host')).not.toBeNull();
      host.values.set(undefined);
      await flush();
      expect(sparkline(element).classList).not.toContain('lc-sparkline--stale');
      expect(sparkline(element).querySelector('lc-skeleton')).not.toBeNull();
      host.values.set([1, 2]);
      await flush();
      expect(sparkline(element).querySelector('lc-chart-host')).not.toBeNull();
    });
  });
});
