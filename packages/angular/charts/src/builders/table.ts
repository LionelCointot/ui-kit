import { LcFormatService, LcLabels, LcValueFormat } from '@lionelcointot/ui-angular';
import type { LcChartTable, LcResolvedSeries } from '../types';
import type { ResolvedOverlays } from './annotations';
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

/**
 * Lignes dédiées aux repères et points annotés (« Repère : {label} (catégorie) ») : un repère montre la valeur de chaque série
 * à sa position, un point annoté la valeur de sa série seulement.
 */
export function buildOverlayRows(
  overlays: Pick<ResolvedOverlays, 'markers' | 'annotations'>,
  categories: readonly string[],
  series: readonly LcResolvedSeries[],
  valueFormat: LcValueFormat,
  format: LcFormatService,
  labels: Pick<LcLabels, 'chartMarker' | 'chartAnnotation'>,
): (readonly (string | number)[])[] {
  const markerRows = overlays.markers.map((marker) => [
    `${labels.chartMarker} : ${marker.label} (${categories[marker.categoryIndex]})`,
    ...series.map((item) => formatFull(item.values[marker.categoryIndex], valueFormat, format)),
  ]);
  const pointRows = overlays.annotations.map((point) => [
    `${labels.chartAnnotation} : ${point.label} (${categories[point.categoryIndex]})`,
    ...series.map((item) => (item.id === point.seriesId ? formatFull(point.value, valueFormat, format) : '')),
  ]);
  return [...markerRows, ...pointRows];
}
