import { readChartTheme } from './chart-theme.service';

const flags = { reducedMotion: false, patterns: false };
const style = (values: Record<string, string>) => ({ getPropertyValue: (name: string) => values[name] ?? '' });

describe('readChartTheme : durées des tokens de mouvement', () => {
  it('lit des millisecondes et des secondes', () => {
    const theme = readChartTheme(style({ '--lc-chart-sparkline-duration': '1s', '--lc-chart-update-duration': '480ms', '--lc-chart-update-stagger': '0.02s' }), flags);
    expect(theme.motion).toEqual({ sparklineMs: 1000, updateMs: 480, staggerMs: 20 });
  });

  it('retombe sur 0 quand la feuille de tokens est absente', () => {
    expect(readChartTheme(style({}), flags).motion).toEqual({ sparklineMs: 0, updateMs: 0, staggerMs: 0 });
  });
});
