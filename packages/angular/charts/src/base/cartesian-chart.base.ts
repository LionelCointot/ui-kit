import { Directive, booleanAttribute, computed, inject, input, isDevMode, model, output, signal } from '@angular/core';
import { LC_LABELS, LcFormatService, LcValueFormat } from '@lionelcointot/ui-angular';
import type { EChartsCoreOption } from '../echarts-registry';
import { prepareSeries } from '../builders/palette';
import { LC_CHART_ROLE_ICONS } from '../builders/series-roles';
import type { CartesianBuildArgs } from '../builders/line.builder';
import { annualTicks, categoryLabels } from '../builders/shared';
import type { ResolvedOverlays } from '../builders/annotations';
import { buildSummary, describeOverlays } from '../builders/summary';
import { buildCartesianTable, buildOverlayRows } from '../builders/table';
import { LcChartThemeService } from '../theme/chart-theme.service';
import type { LcCartesianData, LcChartPointSelect, LcColorSlot, LcLegendItem, LcValueAxis } from '../types';

/** Gabarit commun des graphiques cartésiens (ligne, aire, barres) : un cadre et ses entrées. */
export const LC_CARTESIAN_TEMPLATE = `
  <lc-chart-frame [title]="title()" [titleHidden]="titleHidden()" [description]="description()" [height]="height()"
    [loading]="loading()" [stale]="stale()" [empty]="empty()" [emptyMessage]="emptyMessage()"
    [legend]="legend()" [table]="table()" [(showDataTable)]="showDataTable" [option]="option()" [navigation]="navigation()"
    (legendToggle)="toggleSeries($event)" (pointSelect)="pointSelect.emit($event)" />
`;

const MAX_POINTS_WARNING = 5000;

/**
 * Base des graphiques cartésiens : couleurs mémorisées par identifiant de série, séries masquables par la légende
 * sans repeindre les autres, vue tableau, état vide. Les sous-classes fournissent seulement l'option ECharts.
 */
@Directive()
export abstract class LcCartesianChartBase {
  protected readonly labels = inject(LC_LABELS);
  protected readonly formatService = inject(LcFormatService);
  protected readonly themeService = inject(LcChartThemeService);

  readonly title = input.required<string>();
  readonly titleHidden = input(false, { transform: booleanAttribute });
  readonly description = input<string>();
  readonly height = input('280px');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly stale = input(false, { transform: booleanAttribute });
  readonly emptyMessage = input<string>();
  readonly showDataTable = model(false);
  readonly data = input.required<LcCartesianData>();
  readonly yAxis = input<LcValueAxis>({});
  readonly pointSelect = output<LcChartPointSelect>();

  /** Aires et barres : l'axe des valeurs part toujours de 0 (un `min` positif de `yAxis` est ignoré). */
  protected readonly zeroBaseline: boolean = false;
  /** Forme des pastilles de la légende. */
  protected abstract readonly legendShape: 'line' | 'rect';
  protected abstract buildOption(args: CartesianBuildArgs): EChartsCoreOption;
  /** Repères et annotations validés pour les séries `all` (texte, tableau) ou `visible` (tracé) ; vides par défaut. */
  protected overlays(_scope: 'all' | 'visible'): Pick<ResolvedOverlays, 'markers' | 'annotations'> | undefined {
    return undefined;
  }

  /** Emplacements de couleur mémorisés pour cette instance. */
  private readonly colorMemory = new Map<string, LcColorSlot>();
  private readonly hidden = signal<ReadonlySet<string>>(new Set());

  protected readonly valueFormat = computed<LcValueFormat>(() => this.yAxis().format ?? 'number');
  protected readonly categories = computed(() => categoryLabels(this.data(), this.formatService));
  protected readonly prepared = computed(() => {
    const data = this.data();
    this.warnAboutData(data);
    this.warnAboutAxis();
    return prepareSeries(data.series, this.colorMemory, this.themeService.theme(), this.labels.other, this.hidden());
  });

  readonly empty = computed(() => {
    const { all } = this.prepared();
    return this.categories().length === 0 || all.length === 0
      || all.every((item) => item.values.every((value) => value === null || value === undefined));
  });

  protected readonly legend = computed<readonly LcLegendItem[]>(() =>
    this.prepared().all.map((item) => ({
      id: item.id, label: item.label, color: item.color, shape: this.legendShape, hidden: this.hidden().has(item.id),
      icon: item.role ? LC_CHART_ROLE_ICONS[item.role] : undefined,
      pattern: this.legendShape === 'rect' ? item.pattern : undefined,
      dashed: item.lineStyle === 'dashed', symbol: item.symbol,
    })));

  protected readonly table = computed(() => {
    const { all } = this.prepared();
    const table = buildCartesianTable(this.categories(), all, this.valueFormat(), this.formatService, this.labels);
    const overlays = this.overlays('all');
    if (!overlays) return table;
    const extra = buildOverlayRows(overlays, this.categories(), all, this.valueFormat(), this.formatService, this.labels);
    return { ...table, rows: [...table.rows, ...extra] };
  });

  protected readonly navigation = computed(() => this.prepared().visible.map((item) => ({ id: item.id, values: item.values })));

  protected readonly option = computed<EChartsCoreOption | null>(() => {
    if (this.empty()) return null;
    const { all, visible } = this.prepared();
    const categories = this.categories();
    const valueFormat = this.valueFormat();
    const overlays = this.overlays('all');
    return this.buildOption({
      categories,
      series: visible,
      yAxis: this.yAxis(),
      summary: buildSummary(this.title(), categories, visible, valueFormat, this.formatService, this.labels)
        + (overlays ? describeOverlays(overlays, categories, this.labels) : ''),
      theme: this.themeService.theme(),
      format: this.formatService,
      seriesCount: all.length,
      directLabels: 'auto',
      overlays: this.overlays('visible'),
      annualTicks: annualTicks(this.data().categories, this.data().categoryKind),
    });
  });

  /** Masque ou affiche une série (légende) ; les autres gardent leur couleur. */
  protected toggleSeries(id: string): void {
    this.hidden.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < this.prepared().all.length - 1) next.add(id); // au moins une série reste affichée
      return next;
    });
  }

  private warnAboutAxis(): void {
    const min = this.yAxis().min;
    if (isDevMode() && this.zeroBaseline && min !== undefined && min > 0) {
      console.warn(`[lc-chart] yAxis.min (${min}) ignoré : l'axe des valeurs d'une aire ou de barres part toujours de 0.`);
    }
  }

  private warnAboutData(data: LcCartesianData): void {
    if (!isDevMode()) return;
    if (data.series.length > 8) {
      console.warn(`[lc-chart] ${data.series.length} séries : au-delà de 8, les dernières sont regroupées en « ${this.labels.other} ».`);
    }
    if (data.series.some((item) => item.values.length < data.categories.length)) {
      console.warn('[lc-chart] Une série a moins de valeurs que de catégories : complétée par des trous.');
    }
    if (data.series.length * data.categories.length > MAX_POINTS_WARNING) {
      console.warn(`[lc-chart] Plus de ${MAX_POINTS_WARNING} points : envisagez provideLcCharts({ renderer: 'canvas' }).`);
    }
  }
}
