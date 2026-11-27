import type { OverlayRef } from '@angular/cdk/overlay';
import { LC_OVERLAY_CLOSING_CLASS, lcAnimate } from '@lionelcointot/ui-angular';

/** Valeurs aux tokens `--lc-dialog-*`, `--lc-drawer-*` et `--lc-overlay-*` (lus à chaque appel) ; `lcAnimate` ne joue rien sous mouvement réduit. */
type Kind = 'dialog' | 'drawer';

const BACKDROP = {
  dialog: { enter: '--lc-overlay-enter-duration', exit: '--lc-overlay-exit-duration' },
  drawer: { enter: '--lc-drawer-backdrop-enter-duration', exit: '--lc-drawer-backdrop-exit-duration' },
} as const;

/** Le panneau animé est le conteneur CDK (ses voisins sont les ancres du piège à focus) ; le `panelClass` lui-même ne bouge pas (taille et position du CDK). */
const panelOf = (overlayRef: OverlayRef): HTMLElement | null => overlayRef.overlayElement.querySelector(':scope > .cdk-dialog-container');

const numberToken = (element: Element, name: string): number => parseFloat(getComputedStyle(element).getPropertyValue(name));

/** Écart de glissement du tiroir : 100 % de sa largeur vers son bord (inversé en écriture de droite à gauche). */
const slide = (panel: Element, side: 'start' | 'end'): string => `${(side === 'end') === (getComputedStyle(panel).direction !== 'rtl') ? 100 : -100}% 0`;

function fadeBackdrop(overlayRef: OverlayRef, kind: Kind, entering: boolean): Animation | undefined {
  const backdrop = overlayRef.backdropElement;
  if (!backdrop) return undefined;
  return lcAnimate(backdrop, entering ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], {
    duration: BACKDROP[kind][entering ? 'enter' : 'exit'], easing: 'out', fill: entering ? 'backwards' : 'forwards',
  });
}

/**
 * Entrée du dialogue : échelle et opacité du conteneur, depuis le centre de `trigger` (l'élément actif à l'ouverture ; sans lui, le centre du dialogue).
 * À appeler une fois le dialogue rendu et positionné : l'origine se mesure dans le repère du conteneur.
 */
export function lcDialogEnter(overlayRef: OverlayRef, trigger: Element | null): void {
  const panel = panelOf(overlayRef);
  if (!panel) return;
  const from = trigger?.getBoundingClientRect();
  if (from && (from.width || from.height)) {
    const to = panel.getBoundingClientRect();
    panel.style.transformOrigin = `${from.left + from.width / 2 - to.left}px ${from.top + from.height / 2 - to.top}px`;
  }
  lcAnimate(panel, [{ opacity: 0, scale: numberToken(panel, '--lc-dialog-enter-scale') }, { opacity: 1, scale: 1 }], {
    duration: '--lc-dialog-enter-duration', easing: '--lc-dialog-enter-easing',
  });
  fadeBackdrop(overlayRef, 'dialog', true);
}

/** Entrée du tiroir : glissement de toute sa largeur depuis son bord. */
export function lcDrawerEnter(overlayRef: OverlayRef, side: 'start' | 'end'): void {
  const panel = panelOf(overlayRef);
  if (!panel) return;
  lcAnimate(panel, [{ translate: slide(panel, side) }, { translate: '0 0' }], { duration: '--lc-drawer-enter-duration', easing: '--lc-drawer-enter-easing' });
  fadeBackdrop(overlayRef, 'drawer', true);
}

/** Sortie d'un dialogue ou d'un tiroir ; se résout à la fin des animations (tout de suite sous mouvement réduit). Le panneau et le voile gardent leur état final jusqu'au retrait. */
export async function lcOverlayLeave(overlayRef: OverlayRef, kind: Kind, side: 'start' | 'end' = 'end'): Promise<void> {
  overlayRef.overlayElement.classList.add(LC_OVERLAY_CLOSING_CLASS);
  const panel = panelOf(overlayRef);
  const animations = [fadeBackdrop(overlayRef, kind, false)];
  if (panel && kind === 'dialog') {
    animations.push(lcAnimate(panel, [{ opacity: 1, scale: 1 }, { opacity: 0, scale: numberToken(panel, '--lc-dialog-exit-scale') }], {
      duration: '--lc-dialog-exit-duration', easing: '--lc-dialog-exit-easing', fill: 'forwards',
    }));
  } else if (panel) {
    animations.push(lcAnimate(panel, [{ translate: '0 0' }, { translate: slide(panel, side) }], {
      duration: '--lc-drawer-exit-duration', easing: '--lc-drawer-exit-easing', fill: 'forwards',
    }));
  }
  await Promise.allSettled(animations.map((animation) => animation?.finished));
}
