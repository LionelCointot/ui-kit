import type { EChartsCoreOption } from 'echarts/core';
import type { LcChartTheme, LcChartValue } from '../types';
import { SERIES_STROKE, ariaOption } from './shared';

export interface SparklineBuildArgs {
  readonly values: readonly LcChartValue[];
  readonly summary: string;
  readonly theme: LcChartTheme;
  readonly showEndPoint: boolean;
}

/** Option ECharts d'une sparkline : une série, ni axe, ni légende, ni info-bulle (tendance seulement). */
export function buildSparklineOption(args: SparklineBuildArgs): EChartsCoreOption {
  const { theme, values } = args;
  const color = theme.categorical[0];
  const lastIndex = values.length - 1;
  return {
    animation: !theme.reducedMotion,
    animationDuration: 300,
    backgroundColor: 'transparent',
    aria: ariaOption(args.summary),
    grid: { left: 4, right: 4, top: 4, bottom: 4 },
    tooltip: { show: false },
    xAxis: { type: 'category', show: false, boundaryGap: false, data: values.map((_, index) => index) },
    yAxis: { type: 'value', show: false, scale: true },
    series: [{
      type: 'line',
      data: [...values],
      showSymbol: args.showEndPoint,
      symbol: args.showEndPoint ? (_value: unknown, params: { dataIndex: number }) => (params.dataIndex === lastIndex ? 'circle' : 'none') : 'none',
      symbolSize: 8,
      smooth: false,
      connectNulls: false,
      silent: true,
      lineStyle: { width: SERIES_STROKE, color },
      itemStyle: { color, borderColor: theme.surface, borderWidth: 2 },
    }],
  };
}
