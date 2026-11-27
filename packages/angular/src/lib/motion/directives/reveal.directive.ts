import { DestroyRef, Directive, ElementRef, InjectionToken, type Provider, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { LcStaggerBatch } from '../runtime/stagger';

/** Départ de l'entrée : `rise` monte, `drop` descend, `fade` sur place, `scale` et `pop` grossissent, `left` et `right` glissent, `tilt` (indicateurs) monte en s'inclinant, `card` (cartes) monte de 26 px en 800 ms. */
export type LcRevealVariant = 'rise' | 'drop' | 'fade' | 'scale' | 'pop' | 'left' | 'right' | 'tilt' | 'card';

/** Variante d'un composant dont l'hôte entre seul (`lc-card`, `lc-kpi-card`) quand `lcReveal` est vide. */
const REVEAL_DEFAULT = new InjectionToken<LcRevealVariant>('LC_REVEAL_DEFAULT');
/** Lot dont l'hôte d'une carte prend son rang : celui du `lcStagger` ou de la grille au-dessus, sinon un lot par élément parent. */
const REVEAL_BATCH = new InjectionToken<LcStaggerBatch>('LC_REVEAL_BATCH');
/** Lots des cartes posées dans un conteneur sans `lcStagger` (grille faite main) : un par élément parent, donc une cascade par grille. */
const SIBLING_BATCHES = new WeakMap<Element, LcStaggerBatch>();

/**
 * Providers d'un composant dont l'hôte porte `LcRevealDirective` en `hostDirectives` : variante par défaut, rang d'après le `lcStagger` le plus proche
 * (sinon d'après ses frères : une cascade par conteneur, dans l'ordre du DOM), et lot propre pour son contenu, qui ne décale donc pas les cartes voisines.
 * Une carte ajoutée seule plus tard repart du rang 0.
 * Cas limites : un lot au-dessus (`lcStagger`, `lc-grid` ou carte) est repris tel quel, donc deux grilles faites main dans la même carte partagent une cascade.
 * La clé « parent » est le nœud parent du gabarit, l'élément même sans directive ; dans un `ng-container`, c'est le commentaire du conteneur : une cascade par conteneur.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcRevealHost(variant: LcRevealVariant): Provider[] {
  return [
    { provide: REVEAL_DEFAULT, useValue: variant },
    {
      provide: REVEAL_BATCH,
      useFactory: () => {
        const above = inject(LcStaggerBatch, { skipSelf: true, optional: true });
        // Élément parent de la déclaration : le parent DOM n'existe pas encore pour la racine d'un `@for`.
        const parent = inject(ElementRef, { skipSelf: true, optional: true })?.nativeElement as Element | undefined;
        if (above || !parent) return above ?? new LcStaggerBatch();
        return SIBLING_BATCHES.get(parent) ?? SIBLING_BATCHES.set(parent, new LcStaggerBatch()).get(parent)!;
      },
    },
    { provide: LcStaggerBatch, useFactory: () => new LcStaggerBatch() },
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
  private readonly arrival = (inject(REVEAL_BATCH, { self: true, optional: true }) ?? inject(LcStaggerBatch, { optional: true }))?.next(Infinity) ?? 0;
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
