import { TestBed } from '@angular/core/testing';
import { LcThemeService } from '@lionelcointot/ui-angular';
import { LC_CHARTS_OPTIONS } from '../provide-lc-charts';
import { LcChartThemeService, readChartTheme } from './chart-theme.service';

const TOKENS: Record<string, string> = {
  '--lc-sys-chart-categorical-1': '#2a78d6',
  '--lc-sys-chart-surface': '#fcfcfb',
  '--lc-sys-chart-ink-primary': '#0b0b0b',
  '--lc-sys-font-family-base': 'Inter, sans-serif',
  '--lc-sys-font-size-sm': '0.875rem',
};

describe('readChartTheme', () => {
  it('lit les tokens et convertit la taille de police en pixels', () => {
    const theme = readChartTheme({ getPropertyValue: (name: string) => TOKENS[name] ?? '' }, { reducedMotion: true, patterns: false });
    expect(theme.categorical[0]).toBe('#2a78d6');
    expect(theme.categorical.length).toBe(8);
    expect(theme.sequential.length).toBe(7);
    expect(theme.sequentialWarm.length).toBe(7);
    expect(theme.surface).toBe('#fcfcfb');
    expect(theme.fontSize).toBe(14);
    expect(theme.fontFamily).toBe('Inter, sans-serif');
    expect(theme.reducedMotion).toBe(true);
  });
});

describe('LcChartThemeService', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  });

  it('relit les tokens quand data-theme change', async () => {
    document.documentElement.style.setProperty('--lc-sys-chart-categorical-1', '#2a78d6');
    const service = TestBed.inject(LcChartThemeService);
    expect(service.theme().categorical[0]).toBe('#2a78d6');
    document.documentElement.style.setProperty('--lc-sys-chart-categorical-1', '#3987e5');
    document.documentElement.setAttribute('data-theme', 'dark');
    await new Promise((resolve) => setTimeout(resolve));
    expect(service.theme().categorical[0]).toBe('#3987e5');
  });

  it('active les motifs avec patterns: always', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LC_CHARTS_OPTIONS, useValue: { renderer: 'svg', patterns: 'always' } }] });
    expect(TestBed.inject(LcChartThemeService).theme().patterns).toBe(true);
  });
});

describe('LcChartThemeService et LcThemeService.revision', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  });

  it('relit les tokens quand la révision du thème change', () => {
    document.documentElement.style.setProperty('--lc-sys-chart-categorical-1', '#2a78d6');
    const service = TestBed.inject(LcChartThemeService);
    expect(service.theme().categorical[0]).toBe('#2a78d6');
    // Variable posée sans attribut observé par le MutationObserver : seule la révision invalide le thème.
    document.documentElement.style.setProperty('--lc-sys-chart-categorical-1', '#3987e5');
    expect(service.theme().categorical[0]).toBe('#2a78d6');
    TestBed.inject(LcThemeService).setChoice('dark');
    expect(service.theme().categorical[0]).toBe('#3987e5');
  });
});
