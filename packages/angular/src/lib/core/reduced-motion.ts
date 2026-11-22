/**
 * Vrai si l'utilisateur demande moins de mouvement ; faux sans `matchMedia` (rendu serveur). Relu à chaque appel : la préférence peut changer.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcPrefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
