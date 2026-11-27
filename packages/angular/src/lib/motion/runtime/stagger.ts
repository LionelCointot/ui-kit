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

/** Décalage total maximal d'un lot d'arrivées. */
const MAX_STAGGER_MS = 300;

/**
 * Début (ms) de l'entrée de la `index`-ième arrivée d'un lot de `count` : pas `staggerMs`, réduit pour que le lot tienne en 300 ms.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export const staggerDelay = (index: number, count: number, staggerMs: number): number => index * Math.min(staggerMs, count > 1 ? MAX_STAGGER_MS / (count - 1) : staggerMs);
