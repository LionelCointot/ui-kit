import { Directive, computed, input } from '@angular/core';

/** Sens du remplissage : `x` part de la gauche, `y` part du bas (cartes de charge). */
export type LcFillAxis = 'x' | 'y';

/**
 * Remplit l'élément selon `lcFill` (0 = vide, 1 = plein) sur toute la largeur (`x`) ou la hauteur (`y`) de son parent ; la taille et la couleur restent à l'application.
 * La directive n'écrit que `--lc-progress` (valeur finale dès le premier rendu, serveur compris) ; `motion.css` anime `scale` à l'apparition et à chaque changement.
 * Un élément `display: inline` ne se met pas à l'échelle : lui donner un `display` de bloc.
 */
@Directive({
  selector: '[lcFill]',
  host: {
    class: 'lc-fill',
    '[class.lc-fill--y]': "lcFillAxis() === 'y'",
    '[style.--lc-progress]': 'progress()',
  },
})
export class LcFillDirective {
  readonly lcFill = input.required<number>();
  readonly lcFillAxis = input<LcFillAxis>('x');

  protected readonly progress = computed(() => Math.min(1, Math.max(0, this.lcFill()) || 0));
}
