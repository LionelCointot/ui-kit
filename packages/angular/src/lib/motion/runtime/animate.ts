import type { LcMotionDuration, LcMotionEasing, LcMotionToken } from '../motion.types';
import { lcReadMotion } from './motion-tokens';
import { lcPrefersReducedMotion } from './reduced-motion';

/** Animation déjà terminée : seuls `playState`, `finished`, `cancel` et `finish` sont fournis (voir `lcAnimate`). */
function finishedAnimation(): Animation {
  const animation = { playState: 'finished', finished: undefined as unknown, cancel() {}, finish() {} };
  animation.finished = Promise.resolve(animation);
  return animation as unknown as Animation;
}

/**
 * Joue `keyframes` sur `element` (Web Animations) avec la durée et la courbe demandées, lues dans les tokens de l'élément à chaque appel :
 * un rôle `sys` (`'enter'`, `'entrance'`) ou le nom d'un token composant (`'--lc-sheet-spring-easing'`, réglable par thème). `delay` en millisecondes.
 * `fill` vaut `'backwards'` par défaut : l'état de départ s'applique pendant le `delay`, l'état final revient au style de l'élément.
 *
 * `pseudoElement` cible un pseudo-élément de l'élément (`::view-transition-new(root)` sur `<html>`).
 *
 * Sous « mouvement réduit », ou sans `Element.animate` (rendu serveur, jsdom), rien ne joue et l'objet rendu est une animation déjà terminée,
 * qui ne fournit que `playState` (`'finished'`), `finished` (résolue), `cancel()` et `finish()` : n'utiliser que ces membres.
 */
export function lcAnimate(
  element: Element,
  keyframes: Keyframe[],
  options: { readonly duration: LcMotionDuration | LcMotionToken; readonly easing: LcMotionEasing | LcMotionToken; readonly delay?: number; readonly fill?: FillMode; readonly pseudoElement?: string },
): Animation {
  if (lcPrefersReducedMotion() || typeof element.animate !== 'function') return finishedAnimation();
  return element.animate(keyframes, { ...lcReadMotion(element, options.duration, options.easing), delay: options.delay ?? 0, fill: options.fill ?? 'backwards', pseudoElement: options.pseudoElement });
}
