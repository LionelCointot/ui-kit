import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import type { EChartsCoreOption } from '../echarts-registry';
import { LC_CARTESIAN_TEMPLATE } from '../base/cartesian-chart.base';
import { LcTimelineChartBase } from '../base/timeline-chart.base';
import { LcChartFrameComponent } from '../base/chart-frame.component';
import { buildAreaOption } from '../builders/area.builder';
import type { CartesianBuildArgs } from '../builders/line.builder';

/**
 * Aires : composition dans le temps (empilées par défaut : la somme est le total). L'axe des valeurs part toujours de 0.
 * `markers` trace des repères verticaux (3 au plus) et `annotations` des points annotés.
 */
@Component({
  selector: 'lc-area-chart',
  imports: [LcChartFrameComponent],
  template: LC_CARTESIAN_TEMPLATE,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-area-chart' },
  styles: ':host { display: block; }',
})
export class LcAreaChartComponent extends LcTimelineChartBase {
  readonly stacked = input(true, { transform: booleanAttribute });
  readonly directLabels = input<'auto' | 'none'>('auto');

  protected readonly legendShape = 'rect';
  protected override readonly zeroBaseline = true;

  protected override isStacked(): boolean {
    return this.stacked();
  }

  protected buildOption(args: CartesianBuildArgs): EChartsCoreOption {
    return buildAreaOption({ ...args, directLabels: this.directLabels(), stacked: this.stacked() });
  }
}
