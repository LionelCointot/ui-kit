import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { EChartsCoreOption } from '../echarts-registry';
import { LC_CARTESIAN_TEMPLATE } from '../base/cartesian-chart.base';
import { LcTimelineChartBase } from '../base/timeline-chart.base';
import { LcChartFrameComponent } from '../base/chart-frame.component';
import { buildLineOption, type CartesianBuildArgs } from '../builders/line.builder';

/**
 * Courbes : évolution d'une ou plusieurs mesures. Trait de 2 px sans lissage ; points si ≤ 24 catégories ;
 * étiquette en bout de ligne si ≤ 4 séries ; l'axe peut ne pas partir de 0 (rupture d'axe visible).
 * `lineStyle` et `symbol` par série distinguent les courbes sans la couleur seule ; `markers` trace des repères verticaux
 * (3 au plus) et `annotations` des points annotés.
 */
@Component({
  selector: 'lc-line-chart',
  imports: [LcChartFrameComponent],
  template: LC_CARTESIAN_TEMPLATE,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-line-chart' },
  styles: ':host { display: block; }',
})
export class LcLineChartComponent extends LcTimelineChartBase {
  readonly showPoints = input<'auto' | 'always' | 'never'>('auto');
  readonly directLabels = input<'auto' | 'none'>('auto');

  protected readonly legendShape = 'line';

  protected buildOption(args: CartesianBuildArgs): EChartsCoreOption {
    return buildLineOption({ ...args, directLabels: this.directLabels(), showPoints: this.showPoints() });
  }
}
