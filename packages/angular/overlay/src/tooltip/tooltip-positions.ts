import { ConnectedPosition } from '@angular/cdk/overlay';

export type LcOverlayDirection = 'above' | 'below' | 'start' | 'end';

/** Position demandée d'abord, puis son opposé, puis les deux autres : la première qui tient dans la fenêtre est retenue. */
const ORDER: Record<LcOverlayDirection, LcOverlayDirection[]> = {
  above: ['above', 'below', 'end', 'start'],
  below: ['below', 'above', 'end', 'start'],
  start: ['start', 'end', 'above', 'below'],
  end: ['end', 'start', 'above', 'below'],
};

/* Aucun `offsetX`/`offsetY` : le CDK les applique en `translate` après la poussée dans la fenêtre, et ce sont des nombres de px
   (pas de token). L'écart avec l'élément est donc un remplissage transparent du panneau (token `space-1`), compté dans sa taille :
   il est pris en compte pour le choix de la position et pour la poussée, et l'info-bulle reste entière dans la fenêtre. */
export const POSITIONS: Record<LcOverlayDirection, ConnectedPosition> = {
  above: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
  below: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
  start: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' },
  end: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
};

/** Positions CDK dans l'ordre de repli de la direction demandée (interne, partagé par `lcTooltip` et `lc-toggletip`). */
export const positionsFor = (direction: LcOverlayDirection): ConnectedPosition[] => ORDER[direction].map((d) => POSITIONS[d]);
