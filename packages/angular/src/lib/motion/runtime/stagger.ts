/**
 * Compteur de lot : donne un rang à chaque élément créé dans le même lot, plafonné à `cap` ; le lot repart de 0 à la microtâche suivante
 * (tout ce qui se crée dans le même rendu forme une cascade, le rendu suivant en démarre une autre).
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export class LcStaggerBatch {
  private count = 0;

  /** Rang du prochain élément du lot, au plus `cap`. */
  next(cap: number): number {
    if (this.count === 0) queueMicrotask(() => (this.count = 0));
    return Math.min(this.count++, cap);
  }
}

/** Lots des jauges : un par élément parent, distinct de celui des cartes (une jauge ne consomme jamais un rang de carte). */
const GAUGE_BATCHES = new WeakMap<Element, LcStaggerBatch>();

/**
 * Rang d'arrivée d'une jauge parmi ses sœurs, c'est-à-dire parmi les jauges créées dans le même rendu sous `parent` ; 0 sans parent.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcGaugeArrival(parent: Element | null | undefined): number {
  if (!parent) return 0;
  return (GAUGE_BATCHES.get(parent) ?? GAUGE_BATCHES.set(parent, new LcStaggerBatch()).get(parent)!).next(Infinity);
}

/** Décalage total maximal d'un lot d'arrivées. */
const MAX_STAGGER_MS = 300;

/**
 * Début (ms) de l'entrée de la `index`-ième arrivée d'un lot de `count` : pas `staggerMs`, réduit pour que le lot tienne en 300 ms.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export const staggerDelay = (index: number, count: number, staggerMs: number): number => index * Math.min(staggerMs, count > 1 ? MAX_STAGGER_MS / (count - 1) : staggerMs);
