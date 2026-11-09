import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_ECHARTS_ENGINE } from '../echarts-registry';
import type { LcCartesianData, LcChartPointSelect } from '../types';
import { LcLineChartComponent } from './line-chart.component';
import { LcBarChartComponent } from './bar-chart.component';
import { LcSegmentedBarComponent } from './segmented-bar.component';

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

const data: LcCartesianData = {
  categories: ['2026', '2027', '2028'],
  series: [
    { id: 'a', label: 'Capital', values: [100, 80, 60] },
    { id: 'b', label: '<img src=x onerror=alert(1)>', values: [10, 20, 30] },
  ],
};

@Component({
  imports: [LcLineChartComponent, LcBarChartComponent, LcSegmentedBarComponent],
  template: `
    <lc-line-chart title="Capital restant dû" description="Par année" [data]="data()" [yAxis]="{ format: 'money' }"
      [stale]="stale()" [(showDataTable)]="showTable" (pointSelect)="selected.set($event)" />
    <lc-bar-chart title="Répartition" [data]="data()" [stacked]="true" />
    <lc-segmented-bar title="Coût" format="money" [parts]="[{ id: 'k', label: 'Capital', value: 100 }, { id: 'i', label: 'Intérêts', value: 50 }]" />
  `,
})
class ChartsHostComponent {
  readonly data = signal(data);
  readonly stale = signal(false);
  readonly showTable = signal(false);
  readonly selected = signal<LcChartPointSelect | null>(null);
}

describe('graphiques', () => {
  beforeEach(() => {
    charts.length = 0;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    TestBed.configureTestingModule({
      providers: [{
        provide: LC_ECHARTS_ENGINE,
        useValue: {
          init: () => {
            const chart: FakeChart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), dispatchAction: vi.fn(), on: vi.fn() };
            charts.push(chart);
            return chart;
          },
        },
      }],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    const fixture = TestBed.createComponent(ChartsHostComponent);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('est une figure nommée par son titre et décrite par sa description', async () => {
    const { element } = await setup();
    const figure = element.querySelector('lc-line-chart lc-chart-frame')!;
    expect(figure.getAttribute('role')).toBe('figure');
    const title = element.querySelector('lc-line-chart .lc-chart-frame__title')!;
    expect(figure.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent).toContain('Capital restant dû');
    expect(figure.getAttribute('aria-describedby')).toBe(element.querySelector('lc-line-chart .lc-chart-frame__description')!.id);
  });

  it('initialise une instance par graphique, applique l\'option et la libère à la destruction', async () => {
    const { fixture } = await setup();
    expect(charts.length).toBe(3);
    expect(charts[0].setOption).toHaveBeenCalled();
    const option = charts[0].setOption.mock.calls[0][0];
    expect(option.series.length).toBe(2);
    fixture.destroy();
    expect(charts.every((chart) => chart.dispose.mock.calls.length === 1)).toBe(true);
  });

  it('affiche une légende HTML à partir de 2 séries, et en échappe les libellés', async () => {
    const { element } = await setup();
    const items = element.querySelectorAll('lc-line-chart .lc-chart-frame__legend button');
    expect(items.length).toBe(2);
    expect(items[1].textContent).toContain('<img src=x onerror=alert(1)>');
    expect(element.querySelector('lc-line-chart img')).toBeNull();
    expect(items[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('masquer une série dans la légende ne repeint pas les autres', async () => {
    const { fixture, element } = await setup();
    const first = charts[0].setOption.mock.calls.at(-1)![0];
    const colors = first.series.map((series: { color: string }) => series.color);
    element.querySelectorAll<HTMLButtonElement>('lc-line-chart .lc-chart-frame__legend button')[0].click();
    await fixture.whenStable();
    const latest = charts[0].setOption.mock.calls.at(-1)![0];
    expect(latest.series.length).toBe(1);
    expect(latest.series[0].id).toBe('b');
    expect(latest.series[0].color).toBe(colors[1]);
    expect(element.querySelectorAll('lc-line-chart .lc-chart-frame__legend button')[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('une seule série : pas de légende', async () => {
    const { fixture, element } = await setup();
    fixture.componentInstance.data.set({ categories: ['a', 'b'], series: [{ id: 'x', label: 'Seule', values: [1, 2] }] });
    await fixture.whenStable();
    expect(element.querySelector('lc-line-chart .lc-chart-frame__legend')).toBeNull();
  });

  it('vue tableau : « Voir les données » affiche toutes les valeurs au format complet', async () => {
    const { fixture, element } = await setup();
    const toggle = element.querySelector<HTMLButtonElement>('lc-line-chart .lc-chart-frame__data-toggle')!;
    expect(toggle.textContent).toContain('Voir les données');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.showTable()).toBe(true);
    const table = element.querySelector('lc-line-chart table')!;
    expect(table.querySelectorAll('tbody tr').length).toBe(3);
    expect(table.querySelectorAll('thead th').length).toBe(3);
    expect(table.querySelector('tbody tr')!.textContent!.replace(/\s/g, ' ')).toContain('100,00');
    expect(toggle.textContent).toContain('Masquer les données');
  });

  it('stale : le rendu précédent reste affiché, atténué, sans squelette', async () => {
    const { fixture, element } = await setup();
    fixture.componentInstance.stale.set(true);
    await fixture.whenStable();
    const host = element.querySelector('lc-line-chart lc-chart-host')!;
    expect(host.classList).toContain('lc-chart-frame__chart--stale');
    expect(element.querySelector('lc-line-chart lc-skeleton')).toBeNull();
    expect(element.querySelector('lc-line-chart lc-chart-frame')!.getAttribute('aria-busy')).toBe('true');
    expect(charts[0].dispose).not.toHaveBeenCalled();
  });

  it('clavier : flèches et Début/Fin affichent l\'info-bulle, Échap la masque, Entrée émet pointSelect', async () => {
    const { fixture, element } = await setup();
    const canvas = element.querySelector<HTMLElement>('lc-line-chart .lc-chart-host__canvas')!;
    expect(canvas.getAttribute('tabindex')).toBe('0');
    const press = (key: string) => canvas.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    press('ArrowRight');
    expect(charts[0].dispatchAction).toHaveBeenLastCalledWith({ type: 'showTip', seriesIndex: 0, dataIndex: 0 });
    press('ArrowRight');
    press('End');
    expect(charts[0].dispatchAction).toHaveBeenLastCalledWith({ type: 'showTip', seriesIndex: 0, dataIndex: 2 });
    press('ArrowLeft');
    expect(charts[0].dispatchAction).toHaveBeenLastCalledWith({ type: 'showTip', seriesIndex: 0, dataIndex: 1 });
    press('Enter');
    expect(fixture.componentInstance.selected()).toEqual({ seriesId: 'a', categoryIndex: 1, value: 80 });
    press('Escape');
    expect(charts[0].dispatchAction).toHaveBeenLastCalledWith({ type: 'hideTip' });
  });

  it('état vide : message à la place du tracé, sans instance ECharts', async () => {
    const { fixture, element } = await setup();
    const before = charts.length;
    fixture.componentInstance.data.set({ categories: [], series: [] });
    await fixture.whenStable();
    expect(element.querySelector('lc-line-chart .lc-chart-frame__empty')!.textContent).toContain('Aucune donnée');
    expect(element.querySelector('lc-line-chart .lc-chart-host__canvas')).toBeNull();
    expect(charts.length).toBe(before);
  });

  it('barre segmentée : légende non interactive et tableau des parts', async () => {
    const { element } = await setup();
    const frame = element.querySelector('lc-segmented-bar')!;
    expect(frame.querySelectorAll('.lc-chart-frame__legend button').length).toBe(0);
    expect(frame.querySelectorAll('.lc-chart-frame__legend li').length).toBe(2);
    expect(frame.querySelector('.lc-chart-frame__data-toggle')).not.toBeNull();
  });

  it('un repère s\'affiche sur la courbe et la vue tableau contient la ligne « Repère »', async () => {
    @Component({
      imports: [LcLineChartComponent],
      template: `<lc-line-chart title="Patrimoine" [data]="data" [markers]="markers" [(showDataTable)]="showTable" />`,
    })
    class MarkerHostComponent {
      readonly data = data;
      readonly showTable = signal(true);
      readonly markers = [{ id: 'eq', categoryIndex: 1, label: 'Point d\'équilibre' }];
    }
    const fixture = TestBed.createComponent(MarkerHostComponent);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    const option = charts.at(-1)!.setOption.mock.calls[0][0];
    expect(option.series[0].markLine.data[0].xAxis).toBe(1);
    expect(option.aria.label.description).toContain('Repère : Point d\'équilibre (2027).');
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).map((row) => row.textContent);
    expect(rows.some((text) => text?.includes('Repère : Point d\'équilibre (2027)'))).toBe(true);
  });

  it('la légende reflète le style de trait et le symbole de la série', async () => {
    @Component({
      imports: [LcLineChartComponent],
      template: `<lc-line-chart title="Courbes" [data]="styled" />`,
    })
    class StyledHostComponent {
      readonly styled: LcCartesianData = {
        categories: ['a', 'b'],
        series: [
          { id: 'x', label: 'X', values: [1, 2], lineStyle: 'dashed', symbol: 'triangle' },
          { id: 'y', label: 'Y', values: [2, 3] },
        ],
      };
    }
    const fixture = TestBed.createComponent(StyledHostComponent);
    await fixture.whenStable();
    const swatches = (fixture.nativeElement as HTMLElement).querySelectorAll('.lc-chart-frame__swatch');
    expect(swatches[0].classList).toContain('lc-chart-frame__swatch--dashed');
    expect(swatches[0].querySelector('.lc-chart-frame__symbol--triangle')).not.toBeNull();
    expect(swatches[1].classList).not.toContain('lc-chart-frame__swatch--dashed');
  });
});
