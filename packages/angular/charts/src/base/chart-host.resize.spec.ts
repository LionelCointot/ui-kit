import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_ECHARTS_ENGINE } from '../echarts-registry';
import { LC_CHARTS_OPTIONS } from '../provide-lc-charts';
import { LcSparklineComponent } from '../components/sparkline.component';

// `chart.resize()` termine les animations en cours : le rappel initial du ResizeObserver (taille inchangée) ne doit pas l'appeler.
const callbacks: (() => void)[] = [];
let size = { width: 400, height: 48 };

class FakeResizeObserver {
  constructor(private readonly callback: () => void) { callbacks.push(callback); }
  observe(element: HTMLElement): void {
    Object.defineProperty(element, 'clientWidth', { configurable: true, get: () => size.width });
    Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => size.height });
    queueMicrotask(this.callback);
  }
  disconnect(): void {}
}

@Component({ imports: [LcSparklineComponent], template: `<lc-sparkline ariaLabel="tendance" [values]="[1, 2, 3]" />` })
class HostComponent {}

describe('lc-chart-host : redimensionnement', () => {
  const resize = vi.fn();

  beforeEach(() => {
    callbacks.length = 0;
    size = { width: 400, height: 48 };
    resize.mockClear();
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    TestBed.configureTestingModule({
      providers: [
        { provide: LC_CHARTS_OPTIONS, useValue: { renderer: 'svg', patterns: 'never' } },
        { provide: LC_ECHARTS_ENGINE, useValue: { init: () => ({ setOption: vi.fn(), resize, dispose: vi.fn(), dispatchAction: vi.fn(), on: vi.fn() }) } },
      ],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  async function mount() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  it('n\'appelle pas resize() quand le ResizeObserver rappelle avec la même taille (entrée animée non coupée)', async () => {
    await mount();
    callbacks.forEach((callback) => callback());
    expect(resize).not.toHaveBeenCalled();
  });

  it('appelle resize() quand la taille change', async () => {
    await mount();
    size = { width: 300, height: 48 };
    callbacks.forEach((callback) => callback());
    expect(resize).toHaveBeenCalledTimes(1);
    callbacks.forEach((callback) => callback());
    expect(resize).toHaveBeenCalledTimes(1);
  });
});
