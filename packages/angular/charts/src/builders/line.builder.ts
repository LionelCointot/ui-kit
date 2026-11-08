import type { EChartsCoreOption } from 'echarts/core';
import { LcFormatService, LcValueFormat } from '@lionelcointot/ui-angular';
import type { LcChartTheme, LcResolvedSeries, LcValueAxis } from '../types';
import {
  GRID_BOTTOM, GRID_LEFT, SERIES_STROKE, baseOption, categoryAxis, decalFor, formatFull, minMax, padValues,
  textStyle, tooltipBase, tooltipHtml, valueAxis,
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
  const truncated = !area && lineAxisIsTruncated(series);
  const showPoints = !area && (args.showPoints === 'always' || (args.showPoints === 'auto' && categories.length <= MAX_POINTS_AUTO));
  const directLabels = showDirectLabels(args.directLabels, args.seriesCount);

  return {
    ...baseOption(theme, args.summary, args.animate ?? true),
    grid: { left: GRID_LEFT, right: directLabels ? DIRECT_LABEL_MARGIN : 16, top: 16, bottom: GRID_BOTTOM, containLabel: false },
    tooltip: {
      ...tooltipBase(theme),
      trigger: 'axis',
      axisPointer: { type: 'line', snap: true, lineStyle: { color: theme.axis, width: 1 } },
      formatter: (params: unknown) => {
        const first = (Array.isArray(params) ? params[0] : params) as { dataIndex: number };
        return axisTooltip(first.dataIndex, args, valueFormat);
      },
    },
    xAxis: { ...categoryAxis(categories, theme), boundaryGap: categories.length <= 1 },
    yAxis: valueAxis({ axis: yAxis, theme, format, fromZero: !!area || !truncated }),
    graphic: truncated ? [axisBreak(theme)] : undefined,
    series: series.map((item) => lineSeries(item, args, showPoints, directLabels)),
  };
}

/** Une seule info-bulle listant toutes les séries à l'abscisse de la catégorie. */
export function axisTooltip(index: number, args: CartesianBuildArgs, valueFormat: LcValueFormat): string {
  const rows = args.series.map((item) => ({
    color: item.color,
    shape: 'line' as const,
    label: item.label,
    value: formatFull(item.values[index], valueFormat, args.format),
  }));
  return tooltipHtml(args.categories[index] ?? '', rows, args.theme);
}

function lineSeries(item: LcResolvedSeries, args: LineBuildArgs, showPoints: boolean, directLabels: boolean): object {
  const { theme, categories, area } = args;
  const stacked = !!area?.stacked;
  return {
    id: item.id,
    name: item.label,
    type: 'line',
    data: padValues(item.values, categories.length),
    smooth: false,
    connectNulls: false,
    symbol: showPoints ? 'circle' : 'none',
    showSymbol: showPoints,
    symbolSize: 8,
    stack: area && stacked ? (item.stack ?? 'total') : undefined,
    color: item.color,
    itemStyle: { color: item.color, borderColor: theme.surface, borderWidth: SERIES_STROKE, decal: area ? decalFor(item.patternIndex, theme) : undefined },
    lineStyle: { width: SERIES_STROKE, color: area && stacked ? theme.surface : item.color },
    areaStyle: area ? { color: item.color, opacity: stacked ? 1 : 0.25, decal: decalFor(item.patternIndex, theme) } : undefined,
    emphasis: { focus: 'none' },
    endLabel: directLabels
      ? { show: true, formatter: item.label, distance: 8, ...textStyle(theme, theme.ink.primary) }
      : undefined,
    labelLayout: directLabels ? { moveOverlap: 'shiftY' } : undefined,
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
