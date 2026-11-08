import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, isDevMode, model, output } from '@angular/core';
import { LC_LABELS, LcFormatService, LcValueFormat } from '@lionelcointot/ui-angular';
import type { EChartsCoreOption } from '../echarts-registry';
import { LcChartFrameComponent } from '../base/chart-frame.component';
import { buildSegmentedBarOption, prepareParts } from '../builders/segmented-bar.builder';
import { buildPartsTable } from '../builders/table';
import { LcChartThemeService } from '../theme/chart-theme.service';
import type { LcChartPointSelect, LcColorSlot, LcLegendItem, LcPart } from '../types';

/**
 * Barre segmentée : part d'un tout (remplace le donut). Au plus 6 parts, les suivantes regroupées en « Autres ».
 * `tall` : valeur ou part imprimée sur le segment si elle tient, légende des noms ; `thin` : aucun texte.
 */
@Component({
  selector: 'lc-segmented-bar',
  imports: [LcChartFrameComponent],
  template: `
    <lc-chart-frame [title]="title()" [titleHidden]="titleHidden()" [description]="description()" [height]="resolvedHeight()"
      [loading]="loading()" [stale]="stale()" [empty]="empty()" [emptyMessage]="emptyMessage()"
      [legend]="legend()" [legendToggleable]="false" [table]="table()" [(showDataTable)]="showDataTable" [option]="option()"
      [navigation]="navigation()" (pointSelect)="pointSelect.emit($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-segmented-bar' },
  styles: ':host { display: block; }',
})
export class LcSegmentedBarComponent {
  private readonly labels = inject(LC_LABELS);
  private readonly formatService = inject(LcFormatService);
  private readonly themeService = inject(LcChartThemeService);
  private readonly colorMemory = new Map<string, LcColorSlot>();

  readonly title = input.required<string>();
  readonly titleHidden = input(false, { transform: booleanAttribute });
  readonly description = input<string>();
  /** Défaut : 72px (`tall`) ou 20px (`thin`). */
  readonly height = input<string>();
  readonly loading = input(false, { transform: booleanAttribute });
  readonly stale = input(false, { transform: booleanAttribute });
  readonly emptyMessage = input<string>();
  readonly showDataTable = model(false);
  readonly parts = input.required<readonly LcPart[]>();
  readonly format = input<LcValueFormat>('number');
  readonly variant = input<'tall' | 'thin'>('tall');
  /** Total de référence : si supérieur à la somme des parts, un segment « Non réparti » est ajouté. */
  readonly total = input<number>();
  readonly pointSelect = output<LcChartPointSelect>();

  protected readonly resolvedHeight = computed(() => this.height() ?? (this.variant() === 'tall' ? '72px' : '20px'));
  private readonly prepared = computed(() => {
    const prepared = prepareParts(this.parts(), this.total(), this.colorMemory, this.themeService.theme(), this.labels);
    if (isDevMode()) {
      if (this.parts().length > 6) console.warn(`[lc-segmented-bar] Plus de 6 parts : les dernières sont regroupées en « ${this.labels.other} ».`);
      if (prepared.inconsistentTotal) console.error('[lc-segmented-bar] `total` est inférieur à la somme des parts.');
    }
    return prepared;
  });

  protected readonly empty = computed(() => this.prepared().parts.length === 0);
  protected readonly legend = computed<readonly LcLegendItem[]>(() =>
    this.variant() === 'thin' ? [] : this.prepared().parts.map((part) => ({ id: part.id, label: part.label, color: part.color, shape: 'rect', hidden: false })));
  protected readonly table = computed(() => buildPartsTable(this.prepared().parts, this.format(), this.formatService, this.labels));
  protected readonly navigation = computed(() => this.prepared().parts.map((part) => ({ id: part.id, values: [part.value] })));

  protected readonly option = computed<EChartsCoreOption | null>(() => {
    if (this.empty()) return null;
    const prepared = this.prepared();
    const summary = `${this.title()} : ${prepared.parts
      .map((part) => `${part.label} ${this.formatService.format(part.value, this.format())} (${this.formatService.percent(part.share * 100, 1)})`)
      .join(', ')}.`;
    return buildSegmentedBarOption({
      prepared, valueFormat: this.format(), variant: this.variant(), summary, shareLabel: this.labels.share,
      theme: this.themeService.theme(), format: this.formatService,
    });
  });
}
