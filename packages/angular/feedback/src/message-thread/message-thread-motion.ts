/** Taille d'une page de l'affichage progressif quand `pageSize` est absent ou invalide. */
export const DEFAULT_PAGE_SIZE = 30;
/** Décalage total maximal d'un lot d'arrivées. */
export const MAX_STAGGER_MS = 300;

/** `pageSize` utilisable : entier strictement positif, sinon `DEFAULT_PAGE_SIZE`. */
export const normalizePageSize = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : DEFAULT_PAGE_SIZE);

/** Début (ms) de l'entrée de la `index`-ième arrivée d'un lot. */
export const staggerDelay = (index: number, staggerMs: number): number => Math.min(index * staggerMs, MAX_STAGGER_MS);

/**
 * Se souvient des identifiants déjà vus : une arrivée est un identifiant jamais vu.
 * Le premier rendu non vide (y compris après une liste d'abord vide) marque tout comme vu.
 */
export class ArrivalTracker {
  private readonly seen = new Set<string>();
  private started = false;

  /** `true` une fois la première liste non vide reçue. */
  get hasStarted(): boolean {
    return this.started;
  }

  /** Identifiants nouveaux de `ids`, dans l'ordre, chacun une seule fois. */
  next(ids: readonly string[]): string[] {
    const fresh = ids.filter((id) => !this.seen.has(id) && this.seen.add(id));
    if (this.started) return fresh;
    this.started = ids.length > 0;
    return [];
  }
}

/** Durée (ms) d'une propriété CSS personnalisée en secondes ou millisecondes ; `NaN` si absente. */
export function cssMs(style: CSSStyleDeclaration, name: string): number {
  const raw = style.getPropertyValue(name).trim();
  return parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000);
}
