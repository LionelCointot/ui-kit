import { InjectionToken } from '@angular/core';
import { BarChart, LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';

// Import fin : uniquement les séries, composants et moteurs de rendu utilisés par le point d'entrée.
echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer, CanvasRenderer]);

export type { ECharts, EChartsCoreOption };

/** Sous-ensemble d'ECharts utilisé par les composants (remplaçable dans les tests). */
export interface LcEchartsEngine {
  init(element: HTMLElement, theme: undefined, options: { renderer: 'svg' | 'canvas' }): ECharts;
}

export const LC_ECHARTS_ENGINE = new InjectionToken<LcEchartsEngine>('LC_ECHARTS_ENGINE', {
  providedIn: 'root',
  factory: () => echarts as unknown as LcEchartsEngine,
});
