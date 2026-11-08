import { LcFormatService, LcLabels, LcValueFormat } from '@lionelcointot/ui-angular';
import type { LcChartTable, LcResolvedSeries } from '../types';
import type { ResolvedPart } from './segmented-bar.builder';
import { formatFull } from './shared';

/** Vue tableau : catégories en lignes, séries en colonnes, valeurs au format complet. Toutes les séries y figurent, masquées ou non. */
export function buildCartesianTable(
  categories: readonly string[],
  series: readonly LcResolvedSeries[],
  valueFormat: LcValueFormat,
  format: LcFormatService,
  labels: Pick<LcLabels, 'category'>,
): LcChartTable {
  return {
    columns: [labels.category, ...series.map((item) => item.label)],
    rows: categories.map((category, index) => [category, ...series.map((item) => formatFull(item.values[index], valueFormat, format))]),
  };
}

export function buildPartsTable(
  parts: readonly ResolvedPart[],
  valueFormat: LcValueFormat,
  format: LcFormatService,
  labels: Pick<LcLabels, 'part' | 'value' | 'share'>,
): LcChartTable {
  return {
    columns: [labels.part, labels.value, labels.share],
    rows: parts.map((part) => [part.label, formatFull(part.value, valueFormat, format), format.percent(part.share * 100, 1)]),
  };
}
