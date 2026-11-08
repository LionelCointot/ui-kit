import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, booleanAttribute, effect, inject, input, output, signal, viewChild,
} from '@angular/core';
import { LC_CHARTS_OPTIONS } from '../provide-lc-charts';
import { ECharts, EChartsCoreOption, LC_ECHARTS_ENGINE } from '../echarts-registry';
import { LcChartThemeService } from '../theme/chart-theme.service';
import type { LcChartPointSelect, LcChartValue } from '../types';

export interface LcChartNavigationSeries {
  readonly id: string;
  readonly values: readonly LcChartValue[];
}

/**
 * Cycle de vie d'une instance ECharts (interne) : initialisation différée tant que la largeur est nulle
 * (onglet masqué), `setOption`, redimensionnement, libération à la destruction, navigation au clavier.
 */
@Component({
  selector: 'lc-chart-host',
  template: `
    <div #canvas class="lc-chart-host__canvas" [style.height]="height()"
      [attr.tabindex]="focusable() ? 0 : null" [attr.role]="focusable() ? 'group' : 'img'" [attr.aria-label]="ariaLabel()"
      (keydown)="onKeydown($event)" (blur)="hideTip()"></div>
  `,
  styleUrl: './chart-host.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-chart-host' },
})
export class LcChartHostComponent {
  private readonly engine = inject(LC_ECHARTS_ENGINE);
  private readonly options = inject(LC_CHARTS_OPTIONS);
  private readonly themeService = inject(LcChartThemeService);
  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');

  readonly option = input.required<EChartsCoreOption | null>();
  readonly ariaLabel = input.required<string>();
  readonly height = input('280px');
  /** Zone de tracé atteignable au clavier (flèches, Début, Fin, Échap, Entrée). */
  readonly focusable = input(true, { transform: booleanAttribute });
  /** Séries navigables au clavier (la première porte l'info-bulle et l'événement `pointSelect`). */
  readonly navigation = input<readonly LcChartNavigationSeries[]>([]);
  readonly categoryCount = input(0);
  readonly pointSelect = output<LcChartPointSelect>();

  private chart?: ECharts;
  private observer?: ResizeObserver;
  private lastTheme: unknown;
  private mounted = signal(false);
  private activeIndex = -1;

  constructor() {
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        this.mounted.set(true);
        return;
      }
      this.observer = new ResizeObserver(() => this.onResize());
      this.observer.observe(this.canvas().nativeElement);
      this.onResize();
    });
    effect(() => {
      const option = this.option();
      const theme = this.themeService.theme();
      if (!this.mounted() || !option) return;
      const themeChanged = this.lastTheme !== undefined && this.lastTheme !== theme;
      this.lastTheme = theme;
      this.ensureChart();
      // Changement de thème : nouvelle option appliquée sans animation.
      this.chart?.setOption(themeChanged ? { ...(option as object), animation: false } : option, { notMerge: true });
    });
    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.chart?.dispose();
      this.chart = undefined;
    });
  }

  private onResize(): void {
    if (!this.mounted() && this.canvas().nativeElement.clientWidth > 0) this.mounted.set(true);
    else this.chart?.resize();
  }

  private ensureChart(): void {
    if (this.chart) return;
    this.chart = this.engine.init(this.canvas().nativeElement, undefined, { renderer: this.options.renderer });
    this.chart.on('click', (params: unknown) => {
      const { seriesId, dataIndex, value } = params as { seriesId?: string; dataIndex: number; value: unknown };
      if (seriesId !== undefined) {
        this.pointSelect.emit({ seriesId, categoryIndex: dataIndex, value: typeof value === 'number' ? value : null });
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.categoryCount();
    if (!this.chart || count === 0) return;
    let next = this.activeIndex;
    switch (event.key) {
      case 'ArrowRight': next = Math.min(count - 1, this.activeIndex + 1); break;
      case 'ArrowLeft': next = Math.max(0, this.activeIndex < 0 ? 0 : this.activeIndex - 1); break;
      case 'Home': next = 0; break;
      case 'End': next = count - 1; break;
      case 'Escape': this.hideTip(); this.activeIndex = -1; return;
      case 'Enter': this.emitActive(); event.preventDefault(); return;
      default: return;
    }
    event.preventDefault();
    this.activeIndex = next;
    this.chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: next });
  }

  protected hideTip(): void {
    this.chart?.dispatchAction({ type: 'hideTip' });
  }

  private emitActive(): void {
    const first = this.navigation()[0];
    if (!first || this.activeIndex < 0) return;
    this.pointSelect.emit({ seriesId: first.id, categoryIndex: this.activeIndex, value: first.values[this.activeIndex] ?? null });
  }
}
