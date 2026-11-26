import type { LcMotionDuration, LcMotionEasing } from '../motion.types';

/** Durée (ms) d'une propriété CSS personnalisée en secondes ou millisecondes ; `NaN` si absente. @internal */
export function cssMs(style: CSSStyleDeclaration, name: string): number {
  const raw = style.getPropertyValue(name).trim();
  return parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000);
}

/**
 * Durée (ms) et courbe des rôles demandés, lues dans les tokens résolus de l'élément (valeurs héritées comprises) : un seul `getComputedStyle`,
 * relu à chaque appel (un thème peut changer entre deux). Jeton absent (feuille non chargée) : durée 0 et courbe `linear`.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcReadMotion(element: Element, duration: LcMotionDuration, easing: LcMotionEasing): { readonly duration: number; readonly easing: string } {
  const style = getComputedStyle(element);
  const ms = cssMs(style, `--lc-sys-duration-${duration}`);
  return { duration: Number.isFinite(ms) ? ms : 0, easing: style.getPropertyValue(`--lc-sys-easing-${easing}`).trim() || 'linear' };
}
