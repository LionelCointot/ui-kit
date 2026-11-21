import type { OverlayRef } from '@angular/cdk/overlay';

const CLOSING_CLASS = 'lc-overlay--closing';

/**
 * Ferme un panneau CDK en fondu : pose `lc-overlay--closing`, attend la fin des animations du panneau (les animations infinies sont ignorées ; immédiat sans
 * animation, en réduction de mouvement ou sans `getAnimations`), puis `detach()`. Une réouverture pendant le fondu
 * (rattachement, ou classe retirée par l'appelant) annule le retrait ; un panneau détruit ou déjà détaché est laissé tel quel.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export async function lcDetachAnimated(overlayRef: OverlayRef): Promise<void> {
  const element = overlayRef.overlayElement;
  if (!overlayRef.hasAttached()) return;
  let reopened = false;
  const attachments = overlayRef.attachments().subscribe(() => {
    reopened = true;
    element.classList.remove(CLOSING_CLASS);
  });
  element.classList.add(CLOSING_CLASS);
  try {
    const animations = typeof element.getAnimations === 'function' ? element.getAnimations({ subtree: true }) : [];
    // Une animation infinie (spinner, squelette…) ne finit jamais : l'attendre bloquerait le retrait.
    const finite = animations.filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity);
    await Promise.allSettled(finite.map((animation) => animation.finished));
  } finally {
    attachments.unsubscribe();
  }
  if (reopened || !element.classList.contains(CLOSING_CLASS) || !overlayRef.hasAttached()) return;
  overlayRef.detach();
  element.classList.remove(CLOSING_CLASS);
}
