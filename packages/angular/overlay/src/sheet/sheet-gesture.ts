/** Position verticale du doigt (px, vers le bas) à un instant (ms). */
export interface LcSheetSample {
  readonly time: number;
  readonly offset: number;
}

/** Part de sa hauteur dont il faut tirer la feuille pour la fermer (seuil de geste, pas un token : ADR 0011). */
export const SHEET_DISMISS_RATIO = 1 / 3;
/** Geste vif : vitesse vers le bas (px/ms) sur les dernières `SHEET_FLICK_WINDOW_MS`, avec au moins `SHEET_FLICK_MIN_DISTANCE_PX` de déplacement. */
export const SHEET_FLICK_SPEED = 0.6;
export const SHEET_FLICK_WINDOW_MS = 100;
export const SHEET_FLICK_MIN_DISTANCE_PX = 16;
/** Vers le haut, la feuille ne suit le doigt que de cette part : élastique quasi rigide. */
export const SHEET_UP_RESISTANCE = 0.004;

/** Décide du sort d'un tirage au relâchement (`now` : instant du relâchement). Un toucher sans déplacement ne ferme jamais. */
export function sheetShouldDismiss(offset: number, height: number, samples: readonly LcSheetSample[], now: number): boolean {
  if (offset <= 0) return false;
  if (offset > height * SHEET_DISMISS_RATIO) return true;
  if (offset < SHEET_FLICK_MIN_DISTANCE_PX) return false;
  const recent = samples.filter((sample) => now - sample.time <= SHEET_FLICK_WINDOW_MS);
  const first = recent[0];
  const last = recent.at(-1);
  if (!first || !last || last.time === first.time) return false;
  return (last.offset - first.offset) / (last.time - first.time) > SHEET_FLICK_SPEED;
}

/** Déplacement affiché pour un tirage de `offset` px : 1:1 vers le bas, élastique vers le haut. */
export const sheetTranslation = (offset: number): number => (offset < 0 ? offset * SHEET_UP_RESISTANCE : offset);
