import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import type { EChartsCoreOption } from '../echarts-registry';
import { LcCartesianChartBase, LC_CARTESIAN_TEMPLATE } from '../base/cartesian-chart.base';
import { LcChartFrameComponent } from '../base/chart-frame.component';
import { buildBarOption } from '../builders/bar.builder';
import type { CartesianBuildArgs } from '../builders/line.builder';

/** Barres : comparaison ou composition par période. L'axe des valeurs part toujours de 0. */
@Component({
  selector: 'lc-bar-chart',
  imports: [LcChartFrameComponent],
  template: LC_CARTESIAN_TEMPLATE,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-bar-chart' },
  styles: ':host { display: block; }',
})
export class LcBarChartComponent extends LcCartesianChartBase {
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
  readonly stacked = input(false, { transform: booleanAttribute });
  /** Total au-dessus des barres empilées (si ≤ 12 catégories). */
  readonly totals = input(true, { transform: booleanAttribute });

  protected readonly legendShape = 'rect';
  protected override readonly zeroBaseline = true;

  protected buildOption(args: CartesianBuildArgs): EChartsCoreOption {
    return buildBarOption({
      ...args,
      orientation: this.orientation(),
      stacked: this.stacked(),
      totals: this.totals(),
      totalLabel: this.labels.total,
    });
  }
}
