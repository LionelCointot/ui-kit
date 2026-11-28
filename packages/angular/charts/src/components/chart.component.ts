import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, model, output } from '@angular/core';
import { lcDataState } from '@lionelcointot/ui-angular';
import type { EChartsCoreOption } from '../echarts-registry';
import { LcChartFrameComponent } from '../base/chart-frame.component';
import { textStyle } from '../builders/shared';
import { updateMotion } from '../theme/chart-motion';
import { LcChartThemeService } from '../theme/chart-theme.service';
import type { LcChartPointSelect, LcChartTable } from '../types';

/**
 * Porte de sortie : options ECharts brutes (le thème est appliqué : couleurs, police, mouvement réduit).
 * Les options ne doivent pas contenir de HTML non échappé. Seules les séries `line` et `bar` sont enregistrées.
 */
@Component({
  selector: 'lc-chart',
  imports: [LcChartFrameComponent],
  template: `
    <lc-chart-frame [title]="title() || ariaLabel()" [titleHidden]="!title()" [description]="description()" [height]="height()"
      [loading]="state() === 'loading'" [stale]="stale()" [empty]="state() === 'empty'" [emptyMessage]="emptyMessage()" [table]="table() ?? null" [(showDataTable)]="showDataTable"
      [option]="mergedOption()" (pointSelect)="pointSelect.emit($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-chart' },
  styles: ':host { display: block; }',
})
export class LcChartComponent {
  private readonly themeService = inject(LcChartThemeService);

  /** `undefined` : squelette ; `null` : état vide. */
  readonly options = input.required<EChartsCoreOption | null | undefined>();
  readonly ariaLabel = input.required<string>();
  /** Vue tableau : obligatoire pour que les valeurs restent accessibles. */
  readonly table = input<LcChartTable>();
  readonly title = input<string>();
  readonly description = input<string>();
  readonly height = input('280px');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly stale = input(false, { transform: booleanAttribute });
  readonly emptyMessage = input<string>();
  readonly showDataTable = model(false);
  readonly pointSelect = output<LcChartPointSelect>();

  protected readonly state = computed(() => lcDataState(this.options(), this.loading()));

  protected readonly mergedOption = computed<EChartsCoreOption | null>(() => {
    const options = this.options();
    if (!options) return null;
    const theme = this.themeService.theme();
    return {
      color: [...theme.categorical],
      backgroundColor: 'transparent',
      textStyle: textStyle(theme, theme.ink.muted),
      animation: !theme.reducedMotion,
      ...updateMotion(theme),
      aria: { enabled: true, label: { description: this.ariaLabel() }, decal: { show: theme.patterns } },
      ...(options as object),
    } as EChartsCoreOption;
  });
}
