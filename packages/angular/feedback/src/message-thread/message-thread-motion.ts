/** Taille d'une page de l'affichage progressif quand `pageSize` est absent ou invalide. */
const DEFAULT_PAGE_SIZE = 30;

/** `pageSize` utilisable : entier strictement positif, sinon `DEFAULT_PAGE_SIZE`. */
export const normalizePageSize = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : DEFAULT_PAGE_SIZE);

/**
 * Se souvient des identifiants déjà vus : une arrivée est un identifiant jamais vu.
 * Le premier rendu du composant ouvre le fil, vide ou non : tout ce qu'il contient est vu.
 * Ensuite, tout identifiant nouveau est une arrivée, y compris le premier message d'un fil vide.
 */
export class ArrivalTracker {
  private readonly seen = new Set<string>();
  private started = false;

  /** `true` une fois le premier rendu reçu. */
  get hasStarted(): boolean {
    return this.started;
  }

  /** Identifiants nouveaux de `ids`, dans l'ordre, chacun une seule fois. */
  next(ids: readonly string[]): string[] {
    const fresh = ids.filter((id) => !this.seen.has(id) && this.seen.add(id));
    if (this.started) return fresh;
    this.started = true;
    return [];
  }
}
