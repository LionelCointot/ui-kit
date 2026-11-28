import { TestBed } from '@angular/core/testing';
import { LC_ECHARTS_ENGINE } from '../echarts-registry';
import { LcLineChartComponent } from './line-chart.component';
import { LcSparklineComponent } from './sparkline.component';

// Cas hors data-states.acceptance.spec.ts : stale combiné à loading ou à un état vide.
class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe(element: HTMLElement): void {
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 400 });
    queueMicrotask(this.callback);
  }
  disconnect(): void {}
}

describe('graphiques : stale combiné', () => {
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

  it('loading + stale : squelette, tracé absent, pas de classe stale', async () => {
    const fixture = TestBed.createComponent(LcLineChartComponent);
    fixture.componentRef.setInput('title', 'L');
    fixture.componentRef.setInput('data', { categories: ['a'], series: [{ id: 's', label: 'S', values: [1] }] });
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('stale', true);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('lc-skeleton')).not.toBeNull();
    expect(el.querySelector('lc-chart-host')).toBeNull();
    expect(el.querySelector('.lc-chart-frame__chart--stale')).toBeNull();
  });

  it('sparkline vide + stale : ni aria-busy ni classe stale', async () => {
    const fixture = TestBed.createComponent(LcSparklineComponent);
    fixture.componentRef.setInput('ariaLabel', 'Spark');
    fixture.componentRef.setInput('values', null);
    fixture.componentRef.setInput('stale', true);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.getAttribute('aria-busy')).toBeNull();
    expect(el.classList).not.toContain('lc-sparkline--stale');
  });
});
