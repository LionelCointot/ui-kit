import type { EChartsCoreOption } from 'echarts/core';
import { buildLineOption, type CartesianBuildArgs } from './line.builder';

export interface AreaBuildArgs extends CartesianBuildArgs {
  readonly stacked: boolean;
  readonly animate?: boolean;
}

/**
 * Option ECharts d'une aire : l'axe des valeurs part toujours de 0 (une aire encode une quantité par sa surface).
 * Empilée : bandes pleines séparées par un trait de 2 px couleur surface.
 */
export function buildAreaOption(args: AreaBuildArgs): EChartsCoreOption {
  return buildLineOption({ ...args, showPoints: 'never', area: { stacked: args.stacked } });
}
