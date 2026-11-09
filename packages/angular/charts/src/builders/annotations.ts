import type { LcChartMarker, LcChartPointAnnotation, LcResolvedSeries } from '../types';

/** Nombre maximal de repères verticaux affichés : au-delà, le graphique devient illisible. */
export const MAX_MARKERS = 3;

export interface ResolvedAnnotation extends LcChartPointAnnotation {
  /** Valeur de la série à cette catégorie. */
  readonly value: number;
  /** Ordonnée du point : cumul des séries empilées jusqu'à celle-ci, sinon la valeur. */
  readonly y: number;
}

export interface ResolvedOverlays {
  readonly markers: readonly LcChartMarker[];
  readonly annotations: readonly ResolvedAnnotation[];
  /** Éléments ignorés, pour l'avertissement en développement. */
  readonly warnings: readonly string[];
}

const inRange = (index: number, count: number): boolean => Number.isInteger(index) && index >= 0 && index < count;

/**
 * Retient les repères et annotations affichables : au plus 3 repères, `categoryIndex` dans les bornes,
 * série connue et valeur présente. Fonction pure ; les éléments écartés sont décrits dans `warnings`.
 */
export function resolveOverlays(
  markers: readonly LcChartMarker[],
  annotations: readonly LcChartPointAnnotation[],
  series: readonly LcResolvedSeries[],
  categoryCount: number,
  stacked: boolean,
): ResolvedOverlays {
  const warnings: string[] = [];
  const validMarkers = markers.filter((marker) => {
    const valid = inRange(marker.categoryIndex, categoryCount);
    if (!valid) warnings.push(`repère « ${marker.id} » ignoré : categoryIndex ${marker.categoryIndex} hors limites`);
    return valid;
  });
  if (validMarkers.length > MAX_MARKERS) warnings.push(`${validMarkers.length} repères : seuls les ${MAX_MARKERS} premiers sont affichés`);

  const validAnnotations: ResolvedAnnotation[] = [];
  for (const annotation of annotations) {
    const target = series.find((item) => item.id === annotation.seriesId);
    const value = target?.values[annotation.categoryIndex];
    if (!target || !inRange(annotation.categoryIndex, categoryCount) || typeof value !== 'number') {
      warnings.push(`annotation « ${annotation.label} » ignorée : série inconnue, catégorie hors limites ou valeur absente`);
      continue;
    }
    validAnnotations.push({ ...annotation, value, y: stacked ? stackedTop(series, target, annotation.categoryIndex) : value });
  }
  return { markers: validMarkers.slice(0, MAX_MARKERS), annotations: validAnnotations, warnings };
}

/** Sommet de la bande d'une série empilée : somme des séries du même groupe jusqu'à elle. */
function stackedTop(series: readonly LcResolvedSeries[], target: LcResolvedSeries, index: number): number {
  const group = target.stack ?? 'total';
  let total = 0;
  for (const item of series) {
    if ((item.stack ?? 'total') === group) {
      const value = item.values[index];
      if (typeof value === 'number') total += value;
    }
    if (item === target) break;
  }
  return total;
}
