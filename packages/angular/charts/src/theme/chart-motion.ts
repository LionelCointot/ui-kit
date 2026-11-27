import type { LcChartTheme } from '../types';

/**
 * Rôle de courbe `sys` (§5.2) → nom d'easing ECharts/zrender (ECharts ne lit pas les `cubic-bezier` CSS).
 * Chaque nom est le plus proche mesuré (erreur quadratique moyenne) ; `pop-strong` (dépassement de 30 %) et `stack` sont seulement approchés.
 */
export const LC_CHART_EASING = {
  standard: 'cubicOut',
  entrance: 'exponentialOut',
  fill: 'quinticOut',
  soft: 'cubicOut',
  out: 'cubicOut',
  pop: 'backOut',
  'pop-strong': 'backOut',
  title: 'quinticOut',
  draw: 'quadraticInOut',
  inout: 'cubicInOut',
  exit: 'sinusoidalIn',
  stack: 'quarticOut',
} as const satisfies Readonly<Record<string, string>>;

/** Animation de mise à jour des graphiques à axes : durée, courbe et décalage par rang, lus des tokens du thème. */
export function updateMotion(theme: LcChartTheme): object {
  const { updateMs, staggerMs } = theme.motion;
  return {
    animationDuration: updateMs,
    animationDurationUpdate: updateMs,
    animationEasing: LC_CHART_EASING['draw'],
    animationEasingUpdate: LC_CHART_EASING['draw'],
    animationDelayUpdate: (rank: number): number => rank * staggerMs,
  };
}
