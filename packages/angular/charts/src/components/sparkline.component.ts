import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { LcChartHostComponent } from '../base/chart-host.component';
import { buildSparklineOption } from '../builders/sparkline.builder';
import { LcChartThemeService } from '../theme/chart-theme.service';
import type { LcChartValue } from '../types';

/** Sparkline : tendance compacte d'une seule série (ni axe, ni légende, ni info-bulle). Décrite par `ariaLabel`. */
@Component({
  selector: 'lc-sparkline',
  imports: [LcChartHostComponent],
  template: `<lc-chart-host [option]="option()" [ariaLabel]="ariaLabel()" [height]="height()" [focusable]="false" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-sparkline' },
  styles: ':host { display: block; min-width: 4rem; }',
})
export class LcSparklineComponent {
  private readonly themeService = inject(LcChartThemeService);

  readonly values = input.required<readonly LcChartValue[]>();
  readonly ariaLabel = input.required<string>();
  readonly height = input('32px');
  readonly showEndPoint = input(false, { transform: booleanAttribute });

  protected readonly option = computed(() => this.values().length === 0
    ? null
    : buildSparklineOption({ values: this.values(), summary: this.ariaLabel(), theme: this.themeService.theme(), showEndPoint: this.showEndPoint() }));
}
