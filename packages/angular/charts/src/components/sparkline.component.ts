import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { LC_LABELS, LcFormatService, LcSkeletonComponent, lcDataState } from '@lionelcointot/ui-angular';
import { LcChartHostComponent } from '../base/chart-host.component';
import { buildSparklineOption } from '../builders/sparkline.builder';
import { LcChartThemeService } from '../theme/chart-theme.service';
import type { LcChartValue } from '../types';

/**
 * Sparkline : tendance compacte d'une seule série (ni axe, ni légende, ni info-bulle). Décrite par `ariaLabel`.
 * `values` : `undefined` ou `loading` affiche un squelette, `null` ou `[]` un « — ».
 */
@Component({
  selector: 'lc-sparkline',
  imports: [LcChartHostComponent, LcSkeletonComponent],
  template: `
    @switch (state()) {
      @case ('loading') {
        <lc-skeleton shape="rect" width="100%" [height]="height()" />
      }
      @case ('empty') {
        <span class="lc-sparkline__empty" role="img" [style.height]="height()" [attr.aria-label]="ariaLabel() + ' : ' + labels.noData">{{ emptyText }}</span>
      }
      @default {
        <lc-chart-host [option]="option()" [ariaLabel]="ariaLabel()" [height]="height()" [focusable]="false" />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-sparkline',
    '[class.lc-sparkline--stale]': "stale() && state() === 'ready'",
    '[attr.aria-busy]': "state() === 'loading' || (stale() && state() === 'ready') ? 'true' : null",
  },
  styles: `
    :host { display: block; min-width: 4rem; }
    :host(.lc-sparkline--stale) { opacity: var(--lc-sparkline-stale-opacity, 0.6); }
    .lc-sparkline__empty { display: flex; align-items: center; color: var(--lc-sys-color-on-surface-muted); }
  `,
})
export class LcSparklineComponent {
  private readonly themeService = inject(LcChartThemeService);
  protected readonly labels = inject(LC_LABELS);
  protected readonly emptyText = inject(LcFormatService).format(null);

  /** `undefined` : squelette ; `null` ou `[]` : « — ». */
  readonly values = input.required<readonly LcChartValue[] | null | undefined>();
  readonly ariaLabel = input.required<string>();
  readonly height = input('32px');
  readonly showEndPoint = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  /** Recalcul en cours : le tracé précédent reste affiché, atténué. */
  readonly stale = input(false, { transform: booleanAttribute });

  protected readonly state = computed(() => lcDataState(this.values(), this.loading()));
  protected readonly option = computed(() => {
    const values = this.values();
    return values?.length
      ? buildSparklineOption({ values, summary: this.ariaLabel(), theme: this.themeService.theme(), showEndPoint: this.showEndPoint() })
      : null;
  });
}
