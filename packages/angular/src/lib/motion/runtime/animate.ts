import type { LcMotionDuration, LcMotionEasing } from '../motion.types';
import { lcReadMotion } from './motion-tokens';
import { lcPrefersReducedMotion } from './reduced-motion';

/** Animation déjà terminée, pour les cas où rien ne doit jouer ; les appelants peuvent l'attendre, l'annuler ou la terminer sans test préalable. */
function finishedAnimation(): Animation {
  const done = Promise.resolve();
  const animation = { playState: 'finished', finished: undefined as unknown, effect: null, cancel() {}, finish() {}, play() {}, pause() {}, reverse() {} };
  animation.finished = done.then(() => animation);
  return animation as unknown as Animation;
}

/**
 * Joue `keyframes` sur `element` (Web Animations) avec la durée et la courbe de leurs rôles, lus dans les tokens de l'élément à chaque appel.
 * `delay` en millisecondes. Sous « mouvement réduit », ou sans `Element.animate` (rendu serveur, jsdom), renvoie une animation déjà terminée.
 */
export function lcAnimate(
  element: Element,
  keyframes: Keyframe[],
  options: { readonly duration: LcMotionDuration; readonly easing: LcMotionEasing; readonly delay?: number },
): Animation {
  if (lcPrefersReducedMotion() || typeof element.animate !== 'function') return finishedAnimation();
  return element.animate(keyframes, { ...lcReadMotion(element, options.duration, options.easing), delay: options.delay ?? 0, fill: 'backwards' });
}
