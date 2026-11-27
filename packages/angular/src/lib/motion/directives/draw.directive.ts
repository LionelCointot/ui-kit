import { Directive, ElementRef, computed, inject, input, isDevMode } from '@angular/core';

const SHAPES = ['path', 'circle', 'line', 'polyline'];

/**
 * Dessine un tracé SVG (`path`, `circle`, `line`, `polyline`) de 0 (rien) à `lcDraw` (1 = tracé entier).
 * Pose `pathLength="1"` et `--lc-progress` (valeur finale dès le premier rendu, serveur compris) ; `motion.css` anime `stroke-dashoffset` à l'apparition et à chaque changement.
 */
@Directive({
  selector: '[lcDraw]',
  host: {
    class: 'lc-draw',
    pathLength: '1',
    '[style.--lc-progress]': 'progress()',
  },
})
export class LcDrawDirective {
  readonly lcDraw = input.required<number>();

  protected readonly progress = computed(() => Math.min(1, Math.max(0, this.lcDraw()) || 0));

  constructor() {
    const { tagName, namespaceURI } = inject<ElementRef<Element>>(ElementRef).nativeElement;
    if (isDevMode() && !(namespaceURI === 'http://www.w3.org/2000/svg' && SHAPES.includes(tagName.toLowerCase()))) {
      console.warn(`[lcDraw] attendu sur un <path>, <circle>, <line> ou <polyline> d'un SVG, trouvé <${tagName.toLowerCase()}> : le tracé s'affiche tel quel, sans animation.`);
    }
  }
}
