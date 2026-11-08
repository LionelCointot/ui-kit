import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { EChartsCoreOption } from '../echarts-registry';
import { LcCartesianChartBase, LC_CARTESIAN_TEMPLATE } from '../base/cartesian-chart.base';
import { LcChartFrameComponent } from '../base/chart-frame.component';
import { buildLineOption, type CartesianBuildArgs } from '../builders/line.builder';

/**
 * Courbes : évolution d'une ou plusieurs mesures. Trait de 2 px sans lissage ; points si ≤ 24 catégories ;
 * étiquette en bout de ligne si ≤ 4 séries ; l'axe peut ne pas partir de 0 (rupture d'axe visible).
 */
@Component({
  selector: 'lc-line-chart',
  imports: [LcChartFrameComponent],
  template: LC_CARTESIAN_TEMPLATE,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-line-chart' },
  styles: ':host { display: block; }',
})
export class LcLineChartComponent extends LcCartesianChartBase {
  readonly showPoints = input<'auto' | 'always' | 'never'>('auto');
  readonly directLabels = input<'auto' | 'none'>('auto');

  protected readonly legendShape = 'line';

  protected buildOption(args: CartesianBuildArgs): EChartsCoreOption {
    return buildLineOption({ ...args, directLabels: this.directLabels(), showPoints: this.showPoints() });
  }
}
