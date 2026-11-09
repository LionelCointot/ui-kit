import { Directive, computed, input, isDevMode } from '@angular/core';
import { resolveOverlays, type ResolvedOverlays } from '../builders/annotations';
import type { LcChartMarker, LcChartPointAnnotation } from '../types';
import { LcCartesianChartBase } from './cartesian-chart.base';

/**
 * Base des graphiques à abscisses ordonnées (courbes et aires) : repères verticaux (3 au plus) et points annotés,
 * ajoutés à la description accessible et à la vue tableau.
 */
@Directive()
export abstract class LcTimelineChartBase extends LcCartesianChartBase {
  /** Repères verticaux sur l'axe des catégories (ex. un point d'équilibre) ; au plus 3, les suivants sont ignorés. */
  readonly markers = input<readonly LcChartMarker[]>([]);
  /** Points annotés d'une série. */
  readonly annotations = input<readonly LcChartPointAnnotation[]>([]);

  private readonly overlaysAll = computed(() => this.resolve(this.prepared().all, true));
  private readonly overlaysVisible = computed(() => this.resolve(this.prepared().visible, false));

  protected override overlays(scope: 'all' | 'visible'): Pick<ResolvedOverlays, 'markers' | 'annotations'> | undefined {
    const overlays = scope === 'all' ? this.overlaysAll() : this.overlaysVisible();
    return overlays.markers.length + overlays.annotations.length > 0 ? overlays : undefined;
  }

  private resolve(series: Parameters<typeof resolveOverlays>[2], warn: boolean): ResolvedOverlays {
    const overlays = resolveOverlays(this.markers(), this.annotations(), series, this.categories().length, this.isStacked());
    if (warn && isDevMode()) overlays.warnings.forEach((message) => console.warn(`[lc-chart] ${message}.`));
    return overlays;
  }

  /** Aires empilées : l'ordonnée d'un point annoté est le sommet de sa bande (surchargé par l'aire). */
  protected isStacked(): boolean {
    return false;
  }
}
