import type { LcChartPattern, LcChartRole, LcChartSeries, LcChartTheme } from '../types';

/** Icône (`lc-icon`) de chaque rôle : légende et info-bulle portent le rôle autrement que par la couleur. */
export const LC_CHART_ROLE_ICONS: Readonly<Record<LcChartRole, string>> = {
  success: 'circle-check',
  error: 'circle-x',
  warning: 'triangle-alert',
  highlight: 'activity',
  info: 'info',
  neutral: 'minus',
};

/** Forme de point par défaut d'une série à rôle (courbes), quand `symbol` n'est pas imposé. */
const ROLE_SYMBOLS: Readonly<Record<LcChartRole, NonNullable<LcChartSeries['symbol']>>> = {
  success: 'circle', error: 'square', warning: 'triangle', highlight: 'diamond', info: 'circle', neutral: 'circle',
};

const FALLBACK_COLOR = 'gray';
const HATCH_SPACING = 4;
const DOT_SPACING = 5;
const WARNING_OUTLINE_WIDTH = 1.5;

export const roleColor = (role: LcChartRole, theme: LcChartTheme): string => theme.roles?.[role] ?? theme.ink.muted ?? FALLBACK_COLOR;

export const roleSymbol = (role: LcChartRole): NonNullable<LcChartSeries['symbol']> => ROLE_SYMBOLS[role];

/**
 * Décalque propre au rôle, appliqué en permanence (le rôle prime sur `patterns: 'never'`) : `error` hachures à 45°,
 * `highlight` hachures à 135°, `neutral` pointillé ; `success`, `warning` et `info` restent pleins.
 */
export function roleDecal(role: LcChartRole, theme: LcChartTheme): object | undefined {
  switch (role) {
    case 'error':
      return patternDecal('hatch', theme);
    case 'highlight':
      return patternDecal('hatch-reverse', theme);
    case 'neutral':
      return patternDecal('dots', theme);
    default:
      return undefined;
  }
}

/** Décalque d'un motif choisi par série (`LcChartSeries.pattern`) : hachures à 45° ou 135°, pointillé ; `solid` n'en a pas. */
export function patternDecal(pattern: LcChartPattern, theme: LcChartTheme): object | undefined {
  switch (pattern) {
    case 'hatch':
      return { symbol: 'rect', symbolSize: 1, dashArrayX: [1, 0], dashArrayY: [2, HATCH_SPACING], rotation: Math.PI / 4, color: theme.surface };
    case 'hatch-reverse':
      return { symbol: 'rect', symbolSize: 1, dashArrayX: [1, 0], dashArrayY: [2, HATCH_SPACING], rotation: -Math.PI / 4, color: theme.surface };
    case 'dots':
      return { symbol: 'circle', symbolSize: 1, dashArrayX: [1, DOT_SPACING], dashArrayY: [1, DOT_SPACING], color: theme.surface };
    default:
      return undefined;
  }
}

/**
 * Contour d'une marque pleine : `warning` seulement. Le jaune clair n'atteint pas 3:1 contre la surface ; le contour
 * `ink.primary` et la légende portent le contraste, jamais l'aplat seul.
 */
export function roleOutline(role: LcChartRole | undefined, theme: LcChartTheme): { color: string; width: number } | undefined {
  return role === 'warning' ? { color: theme.ink.primary, width: WARNING_OUTLINE_WIDTH } : undefined;
}
