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
