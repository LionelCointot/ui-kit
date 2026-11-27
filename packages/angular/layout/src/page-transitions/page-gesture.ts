/** Position horizontale du doigt (px, vers la droite) à un instant (ms). */
export interface LcPageSample {
  readonly time: number;
  readonly offset: number;
}

/** Part de la largeur dont il faut tirer la page pour revenir en arrière (valeur de d53, seuil de geste et non un token : ADR 0011). */
export const PAGE_BACK_ENGAGE_RATIO = 0.5;
/** Geste vif : vitesse vers la droite (px/ms) sur les dernières `PAGE_BACK_FLICK_WINDOW_MS`, avec au moins `PAGE_BACK_FLICK_MIN_DISTANCE_PX` de déplacement. */
export const PAGE_BACK_FLICK_SPEED = 0.4;
export const PAGE_BACK_FLICK_WINDOW_MS = 100;
export const PAGE_BACK_FLICK_MIN_DISTANCE_PX = 16;
/** Durée minimale du retour en place ou de l'engagement : sinon proportionnelle à la distance restante. */
export const PAGE_BACK_SETTLE_MIN_MS = 180;

/** Déplacement affiché pour un tirage de `offset` px : la page suit le doigt vers la droite, jamais vers la gauche ni au-delà de la largeur. */
export const pageBackTranslation = (offset: number, width: number): number => Math.min(Math.max(offset, 0), width);

/** Décide du sort d'un tirage au relâchement (`now` : instant du relâchement). Un toucher sans déplacement ne navigue jamais. */
export function pageBackShouldEngage(offset: number, width: number, samples: readonly LcPageSample[], now: number): boolean {
  if (offset <= 0) return false;
  if (offset >= width * PAGE_BACK_ENGAGE_RATIO) return true;
  if (offset < PAGE_BACK_FLICK_MIN_DISTANCE_PX) return false;
  const recent = samples.filter((sample) => now - sample.time <= PAGE_BACK_FLICK_WINDOW_MS);
  const first = recent[0];
  const last = recent.at(-1);
  if (!first || !last || last.time === first.time) return false;
  return (last.offset - first.offset) / (last.time - first.time) > PAGE_BACK_FLICK_SPEED;
}

/** Durée (ms) pour parcourir la part `remaining` (0 à 1) de la course, `fullMs` étant celle de la course entière ; jamais sous `PAGE_BACK_SETTLE_MIN_MS`. */
export const pageBackSettleMs = (remaining: number, fullMs: number): number => Math.max(PAGE_BACK_SETTLE_MIN_MS, fullMs * remaining);
