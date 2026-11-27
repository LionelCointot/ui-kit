/**
 * Rôles de durée : `--lc-sys-duration-<rôle>`. Doit rester égal aux `sys.duration.*` des tokens (vérifié par `motion.types.spec.ts`).
 *
 * @internal Réservé aux points d'entrée du kit : le contrat public est le type `LcMotionDuration`.
 */
export const LC_MOTION_DURATIONS = ['fast', 'exit', 'normal', 'slow', 'enter', 'move', 'long', 'view', 'title', 'draw', 'fill'] as const;

/**
 * Rôles de courbe : `--lc-sys-easing-<rôle>`. Égal aux `sys.easing.*` hors `emphasized` (vérifié par `motion.types.spec.ts`).
 *
 * @internal Réservé aux points d'entrée du kit : le contrat public est le type `LcMotionEasing`.
 */
export const LC_MOTION_EASINGS = ['standard', 'entrance', 'fill', 'soft', 'out', 'pop', 'pop-strong', 'title', 'draw', 'inout', 'exit', 'stack'] as const;

/** Rôle de durée (`'enter'` lit `--lc-sys-duration-enter`). */
export type LcMotionDuration = (typeof LC_MOTION_DURATIONS)[number];

/** Rôle de courbe (`'entrance'` lit `--lc-sys-easing-entrance`). */
export type LcMotionEasing = (typeof LC_MOTION_EASINGS)[number];

/**
 * Token de mouvement d'un composant, donné par son nom de propriété CSS (`'--lc-sheet-spring-easing'`, `'--lc-page-exit-duration'`) :
 * `lcAnimate` le lit tel quel, ce qui garde le réglage par thème du composant. Une faute de frappe n'est pas détectée : jeton absent = durée 0 / courbe `linear`.
 */
export type LcMotionToken = `--lc-${string}`;
