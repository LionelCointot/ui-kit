import { Directive, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { LcStaggerBatch } from '../runtime/stagger';

/** Départ de l'entrée : `rise` monte, `drop` descend, `fade` sur place, `scale` et `pop` grossissent, `left` et `right` glissent, `tilt` (cartes) monte en s'inclinant. */
export type LcRevealVariant = 'rise' | 'drop' | 'fade' | 'scale' | 'pop' | 'left' | 'right' | 'tilt';

/**
 * Fait apparaître l'élément à sa création (`@if`, `@for`) et le fait sortir avant son retrait (`animate.leave`) ; le CSS vit dans `motion.css`.
 * La classe d'entrée est retirée à `animationend` : un élément déplacé par un `@for` ne rejoue rien. Un `@for` sans `track` stable recrée ses éléments (nouvelles arrivées).
 * Un élément qui déclare lui-même `animate.leave` ne porte pas `lcReveal` (une seule animation de sortie).
 * `lcReveal` vide = `rise` ; `null` désactive l'entrée de cet élément (la sortie reste déclarée).
 */
@Directive({
  selector: '[lcReveal]',
  host: {
    '[class]': 'classes()',
    '[style.--lc-reveal-rank]': 'rank()',
    '(animationend)': 'ended($event)',
    'animate.leave': 'lc-leave',
  },
})
export class LcRevealDirective {
  readonly lcReveal = input<'' | LcRevealVariant | null | undefined>('');
  /** Rang imposé dans la cascade ; sans `lcStagger`, le décalage est celui de `normal`. Sous `lcStagger`, l'élément consomme quand même un rang du lot. */
  readonly lcRevealIndex = input<number | undefined>();

  private readonly element = inject<ElementRef<Element>>(ElementRef).nativeElement;
  /** Rang d'arrivée auprès du `lcStagger` le plus proche (0 hors d'un `lcStagger`) ; le plafond est appliqué en CSS. */
  private readonly arrival = inject(LcStaggerBatch, { optional: true })?.next(Infinity) ?? 0;
  private readonly playing = signal(true);
  private readonly active = computed(() => this.lcReveal() != null);

  protected readonly rank = computed(() => (this.active() ? (this.lcRevealIndex() ?? this.arrival) : null));
  protected readonly classes = computed(() => {
    if (!this.playing() || !this.active()) return '';
    const variant = this.lcReveal() || 'rise';
    return variant === 'rise' ? 'lc-reveal' : `lc-reveal lc-reveal--${variant}`;
  });

  constructor() {
    // Rendu serveur, animation déjà finie ou coupée (mouvement réduit) : aucune animation ne tourne, la classe n'a plus de raison de rester.
    // Retirée à la microtâche, hors du passage de rendu : l'insertion reste observable (MutationObserver) avec sa classe, et le rendu ne repasse pas aussitôt.
    afterNextRender(() => {
      if (!this.element.getAnimations?.().length) queueMicrotask(() => this.playing.set(false));
    });
  }

  protected ended(event: AnimationEvent): void {
    if (event.target === event.currentTarget && event.animationName === 'lc-reveal-in') this.playing.set(false);
  }
}
