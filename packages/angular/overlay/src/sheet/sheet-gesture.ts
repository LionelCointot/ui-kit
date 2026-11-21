/** Position verticale du doigt (px, vers le bas) à un instant (ms). */
export interface LcSheetSample {
  readonly time: number;
  readonly offset: number;
}

/** Part de sa hauteur dont il faut tirer la feuille pour la fermer, quand le jeton `--lc-sheet-dismiss-ratio` est absent. */
export const SHEET_DEFAULT_DISMISS_RATIO = 0.25;
/** Geste vif : vitesse vers le bas (px/ms) sur les dernières `SHEET_FLICK_WINDOW_MS`, avec au moins `SHEET_FLICK_MIN_DISTANCE_PX` de déplacement. */
export const SHEET_FLICK_SPEED = 0.5;
export const SHEET_FLICK_WINDOW_MS = 100;
export const SHEET_FLICK_MIN_DISTANCE_PX = 16;

/** Décide du sort d'un tirage au relâchement (`now` : instant du relâchement). Un toucher sans déplacement ne ferme jamais. */
export function sheetShouldDismiss(offset: number, height: number, ratio: number, samples: readonly LcSheetSample[], now: number): boolean {
  if (offset <= 0) return false;
  if (offset > height * ratio) return true;
  if (offset < SHEET_FLICK_MIN_DISTANCE_PX) return false;
  const recent = samples.filter((sample) => now - sample.time <= SHEET_FLICK_WINDOW_MS);
  const first = recent[0];
  const last = recent.at(-1);
  if (!first || !last || last.time === first.time) return false;
  return (last.offset - first.offset) / (last.time - first.time) > SHEET_FLICK_SPEED;
}
