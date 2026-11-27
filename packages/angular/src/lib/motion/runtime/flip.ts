import { lcAnimate } from './animate';
import { lcPrefersReducedMotion } from './reduced-motion';

/** Écart minimal (px) à partir duquel un élément est considéré déplacé. */
const THRESHOLD_PX = 0.5;

/**
 * Position verticale (haut) de chaque élément, toutes lues d'un lot (aucune écriture entre deux lectures).
 * Vide sous « mouvement réduit » ou sans Web Animations : rien ne sera animé, inutile de lire.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcFlipRead(elements: Iterable<Element>): Map<Element, number> {
  const list = [...elements];
  if (!list.length || lcPrefersReducedMotion() || typeof list[0].animate !== 'function') return new Map();
  return new Map(list.map((element) => [element, element.getBoundingClientRect().top]));
}

/**
 * FLIP : chaque élément présent dans `before` et `after` glisse de son ancienne place à la nouvelle (`transform`, tokens `--lc-list-move-*`, sans délai) ;
 * ceux qui n'ont pas bougé de 0,5 px au moins, ajoutés ou retirés n'animent rien. Écritures seulement : l'appelant a déjà fait toutes ses lectures.
 * Renvoie les animations jouées, pour que l'appelant puisse les annuler avant sa prochaine lecture.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcFlipPlay(before: ReadonlyMap<Element, number>, after: ReadonlyMap<Element, number>): Animation[] {
  const played: Animation[] = [];
  for (const [element, top] of after) {
    const from = before.get(element);
    if (from === undefined || Math.abs(from - top) < THRESHOLD_PX) continue;
    played.push(lcAnimate(element, [{ transform: `translateY(${from - top}px)` }, { transform: 'none' }], { duration: '--lc-list-move-duration', easing: '--lc-list-move-easing' }));
  }
  return played;
}
