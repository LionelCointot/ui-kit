import { Directive, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

/** Sens du remplissage : `x` part de la gauche, `y` part du bas (cartes de charge). */
export type LcFillAxis = 'x' | 'y';

/**
 * Remplit l'élément selon `lcFill` (0 = vide, 1 = plein) sur toute la largeur (`x`) ou la hauteur (`y`) de son parent ; la taille et la couleur restent à l'application.
 * La directive n'écrit que `--lc-progress` (valeur finale dès le premier rendu, serveur compris) ; `motion.css` anime `scale` à l'apparition et à chaque changement.
 * `lcFillIndex` décale l'entrée de plusieurs jauges voisines (rang × `--lc-sys-motion-stagger-normal`, plafonné) ; le décalage ne vaut que pour l'entrée, jamais pour un changement de valeur.
 * Un élément `display: inline` ne se met pas à l'échelle : lui donner un `display` de bloc.
 */
@Directive({
  selector: '[lcFill]',
  host: {
    class: 'lc-fill',
    '[class.lc-fill--y]': "lcFillAxis() === 'y'",
    '[style.--lc-progress]': 'progress()',
    '[style.--lc-fill-rank]': 'rank()',
    '(transitionend)': 'ended($event)',
  },
})
export class LcFillDirective {
  readonly lcFill = input.required<number>();
  readonly lcFillAxis = input<LcFillAxis>('x');
  /** Rang de la jauge dans sa série (0 = sans décalage). */
  readonly lcFillIndex = input<number | undefined>();

  private readonly element = inject<ElementRef<Element>>(ElementRef).nativeElement;
  private readonly entering = signal(true);

  protected readonly progress = computed(() => Math.min(1, Math.max(0, this.lcFill()) || 0));
  protected readonly rank = computed(() => (this.entering() ? (this.lcFillIndex() ?? null) : null));

  constructor() {
    // Rendu serveur, mouvement réduit ou valeur nulle : aucune transition ne tourne, le décalage n'a plus de raison de rester.
    afterNextRender(() => {
      if (!this.element.getAnimations?.().length) this.entering.set(false);
    });
  }

  protected ended(event: TransitionEvent): void {
    if (event.target === event.currentTarget && event.propertyName === 'scale') this.entering.set(false);
  }
}
