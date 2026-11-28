import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LcStaggerBatch, type LcSpace } from '@lionelcointot/ui-angular';
import { LcResponsiveNumber, lcSpaceVar, resolveResponsive } from '../space';

/**
 * Grille de mise en page. Les colonnes s'adaptent à la largeur du **conteneur** (requêtes de conteneur,
 * seuils sm 360, md 768, lg 1024, xl 1280 px) et non à celle de la fenêtre : un module embarqué
 * s'adapte à la place qu'on lui donne. Ses enfants qui entrent (`lc-card`, `lc-kpi-card`, `lcReveal`) arrivent en cascade, sans `lcStagger`.
 */
@Component({
  selector: 'lc-grid',
  template: '<div class="lc-grid__inner"><ng-content /></div>',
  styleUrl: './grid.component.css',
  providers: [LcStaggerBatch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-grid',
    // Cascade de ses enfants (ordre du DOM, rythme des cartes) : même contrat que `lcStagger="cards"`.
    // Rythme par défaut des enfants : `--lc-reveal-pace` (pas `--lc-stagger-pace`, qui l'emporterait sur le rythme propre de `tilt`, 70 ms).
    '[style.--lc-reveal-pace]': "'var(--lc-sys-motion-stagger-cards)'",
    '[style.--_gap]': 'gapValue()',
    '[style.--_cols]': 'cols().base',
    '[style.--_cols-sm]': 'cols().sm',
    '[style.--_cols-md]': 'cols().md',
    '[style.--_cols-lg]': 'cols().lg',
    '[style.--_cols-xl]': 'cols().xl',
  },
})
export class LcGridComponent {
  /** Nombre de colonnes, ou nombre par point de rupture du conteneur (`{ md: 2, lg: 3 }`). Défaut : 1. */
  readonly columns = input<LcResponsiveNumber>(1);
  readonly gap = input<LcSpace>('4');

  protected readonly gapValue = computed(() => lcSpaceVar(this.gap()));
  protected readonly cols = computed(() => ({
    base: resolveResponsive(this.columns(), 'base'),
    sm: resolveResponsive(this.columns(), 'sm'),
    md: resolveResponsive(this.columns(), 'md'),
    lg: resolveResponsive(this.columns(), 'lg'),
    xl: resolveResponsive(this.columns(), 'xl'),
  }));
}
