import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { LcChartsOptions } from './types';

export const LC_CHARTS_OPTIONS = new InjectionToken<Required<LcChartsOptions>>('LC_CHARTS_OPTIONS', {
  providedIn: 'root',
  factory: () => ({ renderer: 'svg', patterns: 'auto' }),
});

/** Configure les graphiques (moteur de rendu, motifs d'accessibilité). Facultatif : les défauts conviennent. */
export function provideLcCharts(options: LcChartsOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: LC_CHARTS_OPTIONS, useValue: { renderer: options.renderer ?? 'svg', patterns: options.patterns ?? 'auto' } },
  ]);
}
