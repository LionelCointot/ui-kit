import { Directive, computed, input, isDevMode } from '@angular/core';

/** Rang maximal de la cascade : au-delà, les éléments partagent le dernier délai. */
const MAX_REVEAL_INDEX = 7;

/**
 * Entrée en fondu et descente à l'insertion de l'élément, retardée de `min(lcRevealIndex, 7)` écarts de cascade.
 * Rejoue à chaque réinsertion (`@if`, clé changée) : ne pas la poser sur un contenu réinséré à chaque rendu.
 * Attention : `transition` et `transition-delay` restent posés sur l'hôte. Le délai `index × stagger` s'applique donc aussi
 * à tout changement ultérieur d'opacity ou de transform (ex. un `:hover` avec transform), et la `transition` abrégée peut
 * remplacer celle de l'hôte : si l'élément a ses propres transitions, poser `lcReveal` sur un enveloppant.
 * Styles et tokens `--lc-reveal-*` : feuille globale `ui-angular.css`.
 *
 * @example <li lcReveal [lcRevealIndex]="i">…</li>
 */
@Directive({
  selector: '[lcReveal]',
  host: { '[style.--lc-reveal-index]': 'index()' },
})
export class LcRevealDirective {
  /** Rang dans la cascade (entier ≥ 0, plafonné à 7). */
  readonly lcRevealIndex = input<number>(0);

  protected readonly index = computed(() => {
    const value = this.lcRevealIndex();
    if (!Number.isInteger(value) || value < 0) {
      if (isDevMode()) console.warn(`[lcReveal] lcRevealIndex doit être un entier ≥ 0 (reçu : ${value}) ; 0 est utilisé.`);
      return 0;
    }
    return Math.min(value, MAX_REVEAL_INDEX);
  });
}
