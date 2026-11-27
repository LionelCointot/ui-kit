import { Directive, computed, input } from '@angular/core';
import { LcStaggerBatch } from '../runtime/stagger';

/** Rythme d'une cascade : `--lc-sys-motion-stagger-<rythme>`. */
export type LcStaggerPace = 'fine' | 'normal' | 'cards';

/**
 * Met en cascade les `lcReveal` qu'il contient, y compris ceux d'un composant enfant : chacun prend son rang à sa création
 * (les éléments créés dans le même rendu forment un lot ; le rendu suivant repart de 0), son délai est `min(rang, plafond) × décalage` (calculé en CSS).
 * Le `lcStagger` le plus proche fait foi ; `lcRevealIndex` impose un rang. Le plafond et les décalages sont des tokens (`--lc-sys-motion-stagger-*`).
 */
@Directive({
  selector: '[lcStagger]',
  providers: [LcStaggerBatch],
  host: { '[style.--lc-stagger-pace]': 'pace()' },
})
export class LcStaggerDirective {
  /** Rythme : `fine`, `normal` (par défaut, aussi pour `lcStagger` sans valeur) ou `cards`. */
  readonly lcStagger = input<'' | LcStaggerPace>('');

  protected readonly pace = computed(() => `var(--lc-sys-motion-stagger-${this.lcStagger() || 'normal'})`);
}
