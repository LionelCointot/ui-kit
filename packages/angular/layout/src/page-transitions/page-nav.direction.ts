/** Sens d'une navigation entre pages : `none` (premier affichage), `forward`, `back`, `same` (fondu, même niveau sans ordre connu). */
export type LcPageDirection = 'none' | 'forward' | 'back' | 'same';

/** Pile d'historique du navigateur vue de l'application : chemins seuls (sans `?query` ni `#fragment`). @internal */
export interface LcNavHistory {
  readonly urls: readonly string[];
  readonly index: number;
}

/** Une navigation terminée : `url` est l'URL finale (après redirections). @internal */
export interface LcNavStepInput {
  readonly url: string;
  readonly trigger: 'imperative' | 'popstate';
  readonly replace?: boolean;
}

/** Pile de départ, avant tout affichage. @internal */
export const LC_NAV_HISTORY_EMPTY: LcNavHistory = { urls: [], index: -1 };

/** @internal */
export const pathOf = (url: string): string => url.split(/[?#]/, 1)[0];
const segmentsOf = (url: string): string[] => pathOf(url).split('/').filter(Boolean);

/** Niveau d'une page : nombre de segments non vides du chemin, au moins 1. @internal */
export function lcPathLevel(url: string): number {
  return Math.max(1, segmentsOf(url).length);
}

/** Position de la rubrique d'un chemin : première entrée de `order` égale au chemin ou préfixe de segment, -1 sinon. */
function sectionRank(path: string, order: readonly string[]): number {
  return order.findIndex((entry) => {
    const section = pathOf(entry).replace(/\/$/, '');
    return path === section || path.startsWith(section + '/');
  });
}

function compare(from: string, to: string, order: readonly string[]): LcPageDirection {
  const levels = lcPathLevel(to) - lcPathLevel(from);
  if (levels) return levels > 0 ? 'forward' : 'back';
  const [a, b] = [sectionRank(from, order), sectionRank(to, order)];
  return a < 0 || b < 0 || a === b ? 'same' : b > a ? 'forward' : 'back';
}

/**
 * Sens de la navigation `step` et pile mise à jour (fonction pure, spec mouvement v2 §5.4.3).
 * `order` : URL des rubriques du registre dans l'ordre de l'écran (vide au rendu serveur et avec `navMode='none'`).
 * @internal
 */
export function lcNavStep(
  history: LcNavHistory,
  step: LcNavStepInput,
  order: readonly string[],
): { direction: LcPageDirection; history: LcNavHistory } {
  const path = pathOf(step.url);
  const { urls, index } = history;
  if (!urls.length) return { direction: 'none', history: { urls: [path], index: 0 } };

  if (step.trigger === 'popstate') {
    const before = urls.slice(0, index).lastIndexOf(path);
    if (before >= 0) return { direction: 'back', history: { urls, index: before } };
    const after = urls.indexOf(path, index + 1);
    if (after >= 0) return { direction: 'forward', history: { urls, index: after } };
    // Entrée inconnue de la pile : on juge au niveau et on ne touche pas à la pile.
    return { direction: compare(urls[index], path, order), history };
  }

  const direction = compare(urls[index], path, order);
  if (step.replace) return { direction, history: { urls: urls.map((url, i) => (i === index ? path : url)), index } };
  return { direction, history: { urls: [...urls.slice(0, index + 1), path], index: index + 1 } };
}
