import type { EChartsCoreOption } from 'echarts/core';
import { LcFormatService, LcValueFormat } from '@lionelcointot/ui-angular';
import type { LcChartTheme, LcResolvedSeries, LcValueAxis } from '../types';
import { LC_CHART_EASING } from '../theme/chart-motion';
import type { ResolvedOverlays } from './annotations';
import {
  GRID_BOTTOM, GRID_LEFT, SERIES_STROKE, baseOption, categoryAxis, formatFull, markBorder, minMax, padValues,
  roleIconHtml, seriesDecal, textStyle, tooltipBase, tooltipHtml, valueAxis,
} from './shared';

export interface CartesianBuildArgs {
  /** Libellés de catégories déjà formatés. */
  readonly categories: readonly string[];
  /** Séries tracées (les séries masquées sont déjà écartées). */
  readonly series: readonly LcResolvedSeries[];
  readonly yAxis?: LcValueAxis;
  readonly summary: string;
  readonly theme: LcChartTheme;
  readonly format: LcFormatService;
  /** Nombre total de séries du graphique (masquées comprises), pour décider des étiquettes directes. */
  readonly seriesCount: number;
  readonly directLabels: 'auto' | 'none';
  /** Repères verticaux et points annotés déjà validés (voir `resolveOverlays`) ; courbes et aires seulement. */
  readonly overlays?: Pick<ResolvedOverlays, 'markers' | 'annotations'>;
  /** Années à étiqueter sur l'axe d'un grand nombre de mois ou de dates (voir `annualTicks`) ; courbes et aires. */
  readonly annualTicks?: readonly (string | null)[] | null;
}

export interface LineBuildArgs extends CartesianBuildArgs {
  readonly showPoints: 'auto' | 'always' | 'never';
  /** Aire : bandes pleines (empilées) ou translucides. */
  readonly area?: { readonly stacked: boolean };
  /** Évite d'animer un changement de thème. */
  readonly animate?: boolean;
}

const MAX_POINTS_AUTO = 24;
const MAX_DIRECT_LABEL_SERIES = 4;
const DIRECT_LABEL_MARGIN = 96;
const MARKER_LABEL_HEIGHT = 20;
const DASH_PATTERN = [6, 4];
const PRIMARY_POINT_SIZE = 10;
const SECONDARY_POINT_SIZE = 8;

/** Vrai si l'axe d'une ligne peut ne pas partir de 0 : toutes les valeurs sont positives et groupées loin de 0. */
export function lineAxisIsTruncated(series: readonly LcResolvedSeries[]): boolean {
  const range = minMax(series);
  return !!range && range.min > 0 && (range.max - range.min) / range.max < 0.5;
}

export function showDirectLabels(mode: 'auto' | 'none', seriesCount: number): boolean {
  return mode === 'auto' && seriesCount <= MAX_DIRECT_LABEL_SERIES;
}

/** Option ECharts d'une courbe (ou d'une aire, voir `area.builder.ts`). Fonction pure. */
export function buildLineOption(args: LineBuildArgs): EChartsCoreOption {
  const { categories, series, theme, format, yAxis } = args;
  const valueFormat: LcValueFormat = yAxis?.format ?? 'number';
  const area = args.area;
  const truncated = !area && (yAxis?.min !== undefined ? yAxis.min > 0 : lineAxisIsTruncated(series));
  const showPoints = !area && (args.showPoints === 'always' || (args.showPoints === 'auto' && categories.length <= MAX_POINTS_AUTO));
  const directLabels = showDirectLabels(args.directLabels, args.seriesCount);
  // Réserve en haut de la zone de tracé : étiquette de repère ou étiquette d'annotation au-dessus d'un point (ex. à 100 %).
  const hasMarkers = (args.overlays?.markers.length ?? 0) > 0;
  const hasTopLabels = hasMarkers || (args.overlays?.annotations ?? []).some((a) => a.emphasis === 'primary' && (a.labelPosition ?? 'top') === 'top');

  return {
    ...baseOption(theme, args.summary, args.animate ?? true),
    grid: { left: GRID_LEFT, right: directLabels ? DIRECT_LABEL_MARGIN : 16, top: hasTopLabels ? 16 + MARKER_LABEL_HEIGHT : 16, bottom: GRID_BOTTOM, containLabel: false },
    tooltip: {
      ...tooltipBase(theme),
      trigger: 'axis',
      axisPointer: { type: 'line', snap: true, lineStyle: { color: theme.axis, width: 1 } },
      formatter: (params: unknown) => {
        const first = (Array.isArray(params) ? params[0] : params) as { dataIndex: number };
        return axisTooltip(first.dataIndex, args, valueFormat);
      },
    },
    xAxis: { ...categoryAxis(categories, theme, false, args.annualTicks), boundaryGap: categories.length <= 1 },
    yAxis: valueAxis({ axis: yAxis, theme, format, fromZero: !!area || !truncated }),
    graphic: truncated ? [axisBreak(theme)] : undefined,
    series: series.map((item, index) => lineSeries(item, args, showPoints, directLabels, index === 0)),
  };
}

/** Une seule info-bulle listant toutes les séries à l'abscisse de la catégorie. */
export function axisTooltip(index: number, args: CartesianBuildArgs, valueFormat: LcValueFormat): string {
  const rows = args.series.map((item) => ({
    color: item.color,
    shape: 'line' as const,
    label: item.label,
    value: formatFull(item.values[index], valueFormat, args.format),
    iconHtml: roleIconHtml(item),
  }));
  return tooltipHtml(args.categories[index] ?? '', rows, args.theme);
}

function lineSeries(item: LcResolvedSeries, args: LineBuildArgs, showPoints: boolean, directLabels: boolean, first: boolean): object {
  const { theme, categories, area } = args;
  const stacked = !!area?.stacked;
  return {
    id: item.id,
    name: item.label,
    type: 'line',
    animationEasing: LC_CHART_EASING['draw'], // le défaut `linear` de la série l'emporte sur l'option globale
    animationEasingUpdate: LC_CHART_EASING['draw'],
    data: padValues(item.values, categories.length),
    smooth: false,
    connectNulls: false,
    symbol: showPoints ? (item.symbol ?? 'circle') : 'none',
    showSymbol: showPoints,
    symbolSize: 8,
    stack: area && stacked ? (item.stack ?? 'total') : undefined,
    color: item.color,
    itemStyle: { color: item.color, ...markBorder(item, theme, SERIES_STROKE), decal: area ? seriesDecal(item, theme) : undefined },
    lineStyle: { width: SERIES_STROKE, color: area && stacked ? theme.surface : area && item.role === 'warning' ? theme.ink.primary : item.color, type: item.lineStyle === 'dashed' && !area ? DASH_PATTERN : 'solid' },
    areaStyle: area ? { color: item.color, opacity: stacked ? 1 : 0.25, decal: seriesDecal(item, theme) } : undefined,
    emphasis: { focus: 'none' },
    endLabel: directLabels
      ? { show: true, formatter: item.label, distance: 8, ...textStyle(theme, theme.ink.primary) }
      : undefined,
    labelLayout: directLabels ? { moveOverlap: 'shiftY' } : undefined,
    markLine: first ? markerLines(args) : undefined,
    markPoint: pointAnnotations(item, args),
  };
}

/** Repères verticaux : ligne fine de la couleur de repère, étiquette en encre principale en haut de la zone de tracé. */
function markerLines(args: LineBuildArgs): object | undefined {
  const markers = args.overlays?.markers ?? [];
  if (markers.length === 0) return undefined;
  const { theme } = args;
  return {
    silent: true,
    symbol: 'none',
    animation: false,
    lineStyle: { type: 'solid', width: 1, color: theme.markerColor },
    label: { show: true, position: 'end', distance: 4, ...textStyle(theme, theme.ink.primary) },
    data: markers.map((marker) => ({ name: marker.id, xAxis: marker.categoryIndex, label: { formatter: () => marker.label } })),
  };
}

/** Points annotés d'une série : plein et étiqueté (`primary`) ou rond creux discret (`secondary`). */
function pointAnnotations(item: LcResolvedSeries, args: LineBuildArgs): object | undefined {
  const own = (args.overlays?.annotations ?? []).filter((annotation) => annotation.seriesId === item.id);
  if (own.length === 0) return undefined;
  const { theme } = args;
  return {
    silent: true,
    animation: false,
    symbol: 'circle',
    data: own.map((annotation) => {
      const primary = annotation.emphasis === 'primary';
      return {
        name: annotation.label,
        coord: [annotation.categoryIndex, annotation.y],
        symbolSize: primary ? PRIMARY_POINT_SIZE : SECONDARY_POINT_SIZE,
        itemStyle: primary
          ? { color: item.color, borderColor: theme.surface, borderWidth: SERIES_STROKE }
          : { color: theme.surface, borderColor: item.color, borderWidth: SERIES_STROKE },
        label: primary
          ? { show: true, position: annotation.labelPosition ?? 'top', distance: 6, formatter: () => annotation.label, ...textStyle(theme, theme.ink.primary) }
          : { show: false },
      };
    }),
  };
}

/** Rupture d'axe visible : deux petits traits obliques sur l'axe des valeurs quand il ne part pas de 0. */
function axisBreak(theme: LcChartTheme): object {
  const stroke = { stroke: theme.ink.muted, lineWidth: 1.5, fill: 'none' };
  return {
    type: 'group',
    left: GRID_LEFT - 8,
    bottom: GRID_BOTTOM + 8,
    silent: true,
    children: [
      { type: 'line', shape: { x1: 0, y1: 4, x2: 10, y2: -2 }, style: stroke },
      { type: 'line', shape: { x1: 0, y1: 10, x2: 10, y2: 4 }, style: stroke },
    ],
  };
}
