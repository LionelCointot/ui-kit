import type { LcFormatService, LcLabels, LcValueFormat } from '@lionelcointot/ui-angular';
import type { LcChartSummaryInfo } from '@lionelcointot/ui-angular';
import type { LcResolvedSeries } from '../types';

/** Résumé lu par les technologies d'assistance : titre, séries, plage de catégories, extrême. */
export function buildSummary(
  title: string,
  categories: readonly string[],
  series: readonly LcResolvedSeries[],
  valueFormat: LcValueFormat,
  format: LcFormatService,
  labels: LcLabels,
): string {
  let max: LcChartSummaryInfo['max'];
  let best = -Infinity;
  for (const item of series) {
    item.values.forEach((value, index) => {
      if (typeof value === 'number' && value > best) {
        best = value;
        max = { value: format.format(value, valueFormat), series: item.label, category: categories[index] ?? '' };
      }
    });
  }
  return labels.chartSummary({
    title,
    seriesCount: series.length,
    categoryCount: categories.length,
    first: categories[0] ?? '',
    last: categories[categories.length - 1] ?? '',
    max,
  });
}
