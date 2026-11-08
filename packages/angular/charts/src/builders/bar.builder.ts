import type { EChartsCoreOption } from 'echarts/core';
import { LcValueFormat } from '@lionelcointot/ui-angular';
import type { LcChartTheme, LcResolvedSeries } from '../types';
import {
  BAR_RADIUS, GRID_BOTTOM, GRID_LEFT, baseOption, categoryAxis, decalFor, formatFull, formatTick, padValues,
  textStyle, tooltipBase, tooltipHtml, valueAxis,
} from './shared';
import type { CartesianBuildArgs } from './line.builder';

export interface BarBuildArgs extends CartesianBuildArgs {
  readonly orientation: 'vertical' | 'horizontal';
  readonly stacked: boolean;
  readonly totals: boolean;
  /** Libellé du total dans l'info-bulle d'une barre empilée. */
  readonly totalLabel: string;
  readonly animate?: boolean;
}

const MAX_TOTAL_CATEGORIES = 12;
const TOTALS_SERIES_ID = '__totals__';

/** Total de chaque catégorie (valeurs absentes ignorées). */
export function categoryTotals(series: readonly LcResolvedSeries[], length: number): number[] {
  return Array.from({ length }, (_, index) => series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0));
}

/**
 * Index de la série qui termine la pile pour une catégorie (la plus extérieure, du côté du signe de la valeur) :
 * seule son extrémité est arrondie.
 */
export function endOfStackIndex(series: readonly LcResolvedSeries[], categoryIndex: number, group: string | undefined, negative: boolean): number {
  let found = -1;
  series.forEach((item, index) => {
    if ((item.stack ?? 'total') !== (group ?? 'total')) return;
    const value = item.values[categoryIndex];
    if (typeof value === 'number' && value !== 0 && (value < 0) === negative) found = index;
  });
  return found;
}

/** Option ECharts d'un histogramme (vertical ou horizontal, groupé ou empilé). L'axe des valeurs part de 0. Fonction pure. */
export function buildBarOption(args: BarBuildArgs): EChartsCoreOption {
  const { categories, series, theme, format, yAxis, orientation, stacked } = args;
  const horizontal = orientation === 'horizontal';
  const valueFormat: LcValueFormat = yAxis?.format ?? 'number';
  const withTotals = stacked && args.totals && categories.length <= MAX_TOTAL_CATEGORIES && series.length > 0;

  const barSeries = series.map((item, seriesIndex) => ({
    id: item.id,
    name: item.label,
    type: 'bar',
    stack: stacked ? (item.stack ?? 'total') : undefined,
    barMaxWidth: 48,
    data: padValues(item.values, categories.length).map((value, categoryIndex) => ({
      value,
      itemStyle: { borderRadius: radius(value, stacked ? endOfStackIndex(series, categoryIndex, item.stack, (value ?? 0) < 0) === seriesIndex : true, horizontal) },
    })),
    itemStyle: { color: item.color, borderColor: theme.surface, borderWidth: 1, decal: decalFor(item.patternIndex, theme) },
    emphasis: { focus: 'none', itemStyle: { opacity: 0.85 } },
  }));

  const totalsSeries = withTotals
    ? [{
        id: TOTALS_SERIES_ID,
        name: args.totalLabel,
        type: 'bar',
        stack: series[0].stack ?? 'total',
        silent: true,
        tooltip: { show: false },
        itemStyle: { color: 'transparent', borderWidth: 0 },
        data: categories.map(() => 0),
        label: {
          show: true,
          position: horizontal ? 'right' : 'top',
          formatter: (params: { dataIndex: number }) => formatTick(categoryTotals(series, categories.length)[params.dataIndex], yAxis, format),
          ...textStyle(theme, theme.ink.secondary),
        },
      }]
    : [];

  const category = categoryAxis(categories, theme, horizontal);
  const value = valueAxis({ axis: yAxis, theme, format, fromZero: true });
  return {
    ...baseOption(theme, args.summary, args.animate ?? true),
    grid: { left: horizontal ? 96 : GRID_LEFT, right: 24, top: 16, bottom: GRID_BOTTOM, containLabel: horizontal },
    tooltip: {
      ...tooltipBase(theme),
      trigger: 'item',
      formatter: (params: unknown) => {
        const { seriesIndex, dataIndex } = params as { seriesIndex: number; dataIndex: number };
        return barTooltip(seriesIndex, dataIndex, args, valueFormat);
      },
    },
    xAxis: horizontal ? value : category,
    yAxis: horizontal ? { ...category, inverse: true } : value,
    series: [...barSeries, ...totalsSeries],
  };
}

/** Info-bulle d'une marque : catégorie, série, valeur et, si la barre est empilée, total de la barre. */
export function barTooltip(seriesIndex: number, categoryIndex: number, args: BarBuildArgs, valueFormat: LcValueFormat): string {
  const item = args.series[seriesIndex];
  if (!item) return '';
  const row = { color: item.color, shape: 'rect' as const, label: item.label, value: formatFull(item.values[categoryIndex], valueFormat, args.format) };
  const footer = args.stacked
    ? { label: args.totalLabel, value: formatFull(categoryTotals(args.series, args.categories.length)[categoryIndex], valueFormat, args.format) }
    : undefined;
  return tooltipHtml(args.categories[categoryIndex] ?? '', [row], args.theme, footer);
}

/** Rayon d'angle : seule l'extrémité de la donnée est arrondie (4 px), la base reste carrée sur la ligne de base. */
export function radius(value: number | null, rounded: boolean, horizontal: boolean): number[] {
  if (!rounded || value === null) return [0, 0, 0, 0];
  const negative = value < 0;
  if (horizontal) return negative ? [BAR_RADIUS, 0, 0, BAR_RADIUS] : [0, BAR_RADIUS, BAR_RADIUS, 0];
  return negative ? [0, 0, BAR_RADIUS, BAR_RADIUS] : [BAR_RADIUS, BAR_RADIUS, 0, 0];
}

export type { LcChartTheme };
