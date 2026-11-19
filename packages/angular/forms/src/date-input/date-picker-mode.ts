import { InjectionToken } from '@angular/core';

/** Sélecteur de date : calendrier du kit, champ natif, ou choix selon l'appareil (ADR 0008). */
export type LcDatePickerMode = 'auto' | 'native' | 'calendar';

export const LC_DATE_PICKER = new InjectionToken<LcDatePickerMode>('LC_DATE_PICKER', {
  providedIn: 'root',
  factory: () => 'auto',
});

/** En `auto` : calendrier si le pointeur est précis et survole ; `matchMedia` absent ou en erreur : natif. */
export function resolveDatePickerMode(
  mode: LcDatePickerMode,
  document: Document,
): 'native' | 'calendar' {
  if (mode !== 'auto') return mode;
  try {
    return document.defaultView?.matchMedia?.('(pointer: fine) and (hover: hover)').matches
      ? 'calendar'
      : 'native';
  } catch {
    return 'native';
  }
}
