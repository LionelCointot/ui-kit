import { buildSparklineOption } from '../builders/sparkline.builder';
import { LC_CHART_EASING, updateMotion } from './chart-motion';
import { readChartTheme } from './chart-theme.service';
import { buildSegmentedBarOption } from '../builders/segmented-bar.builder';
import type { LcChartTheme } from '../types';

const flags = { reducedMotion: false, patterns: false };
const style = (tokens: Record<string, string>) => ({ getPropertyValue: (name: string) => tokens[name] ?? '' });
const TOKENS = { '--lc-chart-sparkline-duration': '1s', '--lc-chart-update-duration': '480ms', '--lc-chart-update-stagger': '20ms', '--lc-sys-motion-stagger-cap': '8' };

describe('mouvement des graphiques : plafond de cascade et jetons', () => {
  it('animationDelayUpdate est plafonné à stagger-cap × stagger', () => {
    const { animationDelayUpdate } = updateMotion(readChartTheme(style(TOKENS), flags)) as { animationDelayUpdate: (rank: number) => number };
    expect([0, 3, 8, 9, 1000].map(animationDelayUpdate)).toEqual([0, 60, 160, 160, 160]);
  });

  it('sans jeton de plafond : pas de plafond', () => {
    const theme = readChartTheme(style({ ...TOKENS, '--lc-sys-motion-stagger-cap': '' }), flags);
    expect((updateMotion(theme) as { animationDelayUpdate: (rank: number) => number }).animationDelayUpdate(1000)).toBe(20000);
  });

  it('avertit en développement d\'un jeton de mouvement absent, et seulement alors', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    readChartTheme(style(TOKENS), flags);
    expect(warn).not.toHaveBeenCalled();
    readChartTheme(style({ ...TOKENS, '--lc-chart-update-stagger': '' }), flags);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('--lc-chart-update-stagger');
    warn.mockRestore();
  });

  it('la barre segmentée garde durée et courbe de mise à jour, sans décalage par rang', () => {
    const theme: LcChartTheme = readChartTheme(style(TOKENS), flags);
    const option = buildSegmentedBarOption({ prepared: { parts: [], total: 0 }, theme, format: undefined, valueFormat: 'integer', shareLabel: 'Part', summary: '', variant: 'tall' } as never) as Record<string, unknown>;
    expect(option['animationDelayUpdate']).toBeUndefined();
    expect(option['animationDurationUpdate']).toBe(480);
  });
});

describe('easing de la série de ligne', () => {
  it('la série porte la courbe draw (le défaut `linear` des séries de ligne ignorerait l\'option globale)', () => {
    const theme = readChartTheme(style(TOKENS), flags);
    const option = buildSparklineOption({ values: [1, 2, 3], summary: '', theme, showEndPoint: false }) as { series: { animationEasing: string }[] };
    expect(option.series[0].animationEasing).toBe(LC_CHART_EASING['draw']);
  });
});
