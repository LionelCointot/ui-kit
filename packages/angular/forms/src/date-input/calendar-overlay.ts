import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import type { Injector } from '@angular/core';

/**
 * Surcouche du panneau de calendrier, commune aux champs de date : même stratégie de position et de défilement que
 * `lc-combobox`, largeur propre au panneau. Dimensions flexibles : sans place, le panneau se limite à la fenêtre et son corps défile.
 * `onOutside` reçoit chaque clic extérieur ; `isButton` désigne le bouton calendrier, qui bascule lui-même.
 */
export function createCalendarOverlay(
  injector: Injector,
  origin: HTMLElement,
  doc: Document,
  isButton: (target: Node) => boolean,
  close: (restoreFocus: boolean) => void,
): OverlayRef {
  const overlay = injector.get(Overlay);
  const ref = overlay.create({
    positionStrategy: overlay.position().flexibleConnectedTo(origin).withFlexibleDimensions(true).withViewportMargin(8)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
      ]),
    scrollStrategy: overlay.scrollStrategies.reposition(),
    // Sans `minHeight` non nul (0 compte pour absent), le CDK ne retient jamais le dimensionnement flexible : le panneau serait seulement poussé.
    minHeight: 1,
  });
  ref.outsidePointerEvents().subscribe((event) => {
    if (isButton(event.target as Node)) return;
    // Un clic sur un autre contrôle garde son focus ; sur du vide, le focus revient au bouton.
    const active = doc.activeElement;
    close(!active || active === doc.body || ref.overlayElement.contains(active));
  });
  return ref;
}
