import { InjectionToken } from '@angular/core';

/**
 * Interne : `lc-date-range-input` compose deux `lc-date-input` et se déclare à eux par ce jeton. Un champ qui le trouve
 * n'affiche pas son bouton calendrier (la période n'en a qu'un) et lui demande si la date saisie est admise.
 */
export interface LcDatePartHost {
  /** Vrai si la date saisie par `part` est refusée (fin avant début) : la valeur vaut alors `null`, la saisie reste invalide. */
  rejects(part: unknown, iso: string): boolean;
  /** Après chaque saisie : `incomplete` (date à moitié tapée), `order` (refusée), sinon `null`. */
  entered(part: unknown, state: 'incomplete' | 'order' | null): void;
}

export const LC_DATE_PART = new InjectionToken<LcDatePartHost>('LC_DATE_PART');
