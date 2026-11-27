import { DestroyRef, Directive, ElementRef, InjectionToken, type Provider, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { LcStaggerBatch } from '../runtime/stagger';

/** Départ de l'entrée : `rise` monte, `drop` descend, `fade` sur place, `scale` et `pop` grossissent, `left` et `right` glissent, `tilt` (indicateurs) monte en s'inclinant, `card` (cartes) monte de 26 px en 800 ms. */
export type LcRevealVariant = 'rise' | 'drop' | 'fade' | 'scale' | 'pop' | 'left' | 'right' | 'tilt' | 'card';

/** Variante d'un composant dont l'hôte entre seul (`lc-card`, `lc-kpi-card`) quand `lcReveal` est vide. */
const REVEAL_DEFAULT = new InjectionToken<LcRevealVariant>('LC_REVEAL_DEFAULT');
/** Lot commun des cartes sans `lcStagger` au-dessus : elles prennent leur rang dans l'ordre de création du rendu, qui est l'ordre du DOM entre frères. */
const SHARED_BATCH = new InjectionToken<LcStaggerBatch>('LC_REVEAL_SHARED_BATCH', { providedIn: 'root', factory: () => new LcStaggerBatch() });

/**
 * Providers d'un composant dont l'hôte porte `LcRevealDirective` en `hostDirectives` : variante par défaut, et rang pris auprès du `lcStagger` le plus proche
 * (sinon d'un lot commun, pour une grille faite main). Une carte ajoutée seule plus tard repart du rang 0.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcRevealHost(variant: LcRevealVariant): Provider[] {
  return [
    { provide: REVEAL_DEFAULT, useValue: variant },
    { provide: LcStaggerBatch, useFactory: () => inject(LcStaggerBatch, { skipSelf: true, optional: true }) ?? inject(SHARED_BATCH) },
  ];
}

/**
 * Fait apparaître l'élément à sa création (`@if`, `@for`) et le fait sortir avant son retrait (`animate.leave`) ; le CSS vit dans `motion.css`.
 * La classe d'entrée est retirée à `animationend` : un élément déplacé par un `@for` ne rejoue rien. Un `@for` sans `track` stable recrée ses éléments (nouvelles arrivées).
 * Un élément qui déclare lui-même `animate.leave` ne porte pas `lcReveal` (une seule animation de sortie).
 * `lcReveal` vide = `rise` ; `null` désactive l'entrée de cet élément (la sortie reste déclarée).
 * Un élément retiré sous un ancêtre `[hidden]` n'a rien à sortir : il quitte aussitôt (liste vidée d'un coup, sans qu'aucune sortie ne soit visible).
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
  private readonly byDefault = inject(REVEAL_DEFAULT, { optional: true });
  private readonly playing = signal(true);
  private readonly active = computed(() => this.lcReveal() != null);

  protected readonly rank = computed(() => (this.active() ? (this.lcRevealIndex() ?? this.arrival) : null));
  protected readonly classes = computed(() => {
    if (!this.playing() || !this.active()) return '';
    const variant = this.lcReveal() || this.byDefault || 'rise';
    return variant === 'rise' ? 'lc-reveal' : `lc-reveal lc-reveal--${variant}`;
  });

  constructor() {
    // Avant que la sortie d'Angular ne pose sa classe : le nœud est déjà détaché quand elle le fait, et son retrait ensuite est sans effet.
    inject(DestroyRef).onDestroy(() => {
      if (this.element.closest('[hidden]')) this.element.remove();
    });
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
