import type { OverlayRef } from '@angular/cdk/overlay';

/** Classe posée sur le panneau pendant son fondu de sortie. @internal */
export const LC_OVERLAY_CLOSING_CLASS = 'lc-overlay--closing';

/**
 * Attend la fin des animations finies de l'élément et, par défaut, de ses descendants (les infinies, spinner ou squelette, sont ignorées ; immédiat sans animation
 * ou sans `getAnimations`). Une animation annulée ne bloque pas l'attente. `{ subtree: false }` ignore les descendants : une section qui se replie
 * dans une feuille ne retarde pas sa fermeture.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export async function lcAnimationsEnd(element: Element, options: { readonly subtree?: boolean } = {}): Promise<void> {
  const animations = typeof element.getAnimations === 'function' ? element.getAnimations({ subtree: options.subtree ?? true }) : [];
  // Une animation infinie (spinner, squelette…) ne finit jamais : l'attendre bloquerait le retrait.
  const finite = animations.filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity);
  await Promise.allSettled(finite.map((animation) => animation.finished));
}

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
    element.classList.remove(LC_OVERLAY_CLOSING_CLASS);
  });
  element.classList.add(LC_OVERLAY_CLOSING_CLASS);
  try {
    await lcAnimationsEnd(element);
  } finally {
    attachments.unsubscribe();
  }
  if (reopened || !element.classList.contains(LC_OVERLAY_CLOSING_CLASS) || !overlayRef.hasAttached()) return;
  overlayRef.detach();
  element.classList.remove(LC_OVERLAY_CLOSING_CLASS);
}
