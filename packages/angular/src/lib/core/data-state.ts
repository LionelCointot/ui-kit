/** État d'affichage d'un composant de données : squelette, vide ou contenu. */
export type LcDataState = 'loading' | 'empty' | 'ready';

/**
 * `undefined` ou `loading` : squelette ; `null` ou tableau vide : vide ; sinon : prêt
 * (`0`, `''`, `NaN`, `{}` et `[0]` sont prêts : un chiffre à 0 s'affiche).
 */
export function lcDataState(data: unknown, loading = false): LcDataState {
  if (loading || data === undefined) return 'loading';
  if (data === null || (Array.isArray(data) && data.length === 0)) return 'empty';
  return 'ready';
}
