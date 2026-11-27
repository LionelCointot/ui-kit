import { isDevMode } from '@angular/core';
import type { LcMotionDuration, LcMotionEasing, LcMotionToken } from '../motion.types';

/**
 * Durée (ms) d'une propriété CSS personnalisée en secondes ou millisecondes ; `NaN` si absente.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcCssMs(style: CSSStyleDeclaration, name: string): number {
  const raw = style.getPropertyValue(name).trim();
  return parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000);
}

/**
 * Durée (ms) et courbe lues dans les tokens résolus de l'élément (valeurs héritées comprises) : un seul `getComputedStyle`, relu à chaque appel
 * (un thème peut changer entre deux). `duration` et `easing` sont un rôle `sys` (`'enter'`) ou le nom d'un token composant (`'--lc-sheet-spring-easing'`).
 * Jeton absent (feuille non chargée) : durée 0 et courbe `linear`.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcReadMotion(
  element: Element,
  duration: LcMotionDuration | LcMotionToken,
  easing: LcMotionEasing | LcMotionToken,
): { readonly duration: number; readonly easing: string } {
  const style = getComputedStyle(element);
  const durationToken = duration.startsWith('--') ? duration : `--lc-sys-duration-${duration}`;
  const easingToken = easing.startsWith('--') ? easing : `--lc-sys-easing-${easing}`;
  const ms = lcCssMs(style, durationToken);
  const curve = style.getPropertyValue(easingToken).trim();
  if (isDevMode()) {
    const missing = [Number.isFinite(ms) ? '' : durationToken, curve ? '' : easingToken].filter(Boolean);
    if (missing.length) console.warn(`[ui-kit] Token de mouvement absent : ${missing.join(', ')} (animation instantanée ou linéaire) ; faute de frappe, ou feuille du kit non chargée ?`);
  }
  return { duration: Number.isFinite(ms) ? ms : 0, easing: curve || 'linear' };
}
