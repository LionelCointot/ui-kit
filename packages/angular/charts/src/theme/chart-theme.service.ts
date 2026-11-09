import { DOCUMENT, DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';
import { LcThemeService } from '@lionelcointot/ui-angular';
import { LC_CHARTS_OPTIONS } from '../provide-lc-charts';
import type { LcChartTheme } from '../types';

/** Repli si la feuille de tokens n'est pas chargée (gris neutre) : un graphique reste lisible sans les thèmes. */
const MISSING_TOKEN_COLOR = 'gray';
const DEFAULT_FONT_SIZE = 14;

export interface ChartThemeFlags {
  readonly reducedMotion: boolean;
  readonly patterns: boolean;
}

/** Lit les tokens `--lc-sys-chart-*` sur `style` (fonction pure, testable). */
export function readChartTheme(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>, flags: ChartThemeFlags): LcChartTheme {
  const read = (name: string, fallback = MISSING_TOKEN_COLOR): string => style.getPropertyValue(name).trim() || fallback;
  const token = (name: string): string => read(`--lc-sys-chart-${name}`);
  const fontSize = toPixels(read('--lc-sys-font-size-sm', `${DEFAULT_FONT_SIZE}px`));
  return {
    categorical: [1, 2, 3, 4, 5, 6, 7, 8].map((index) => token(`categorical-${index}`)),
    sequential: [100, 200, 300, 400, 500, 600, 700].map((step) => token(`sequential-${step}`)),
    diverging: { negative: token('diverging-negative'), neutral: token('diverging-neutral'), positive: token('diverging-positive') },
    status: { good: token('status-good'), warning: token('status-warning'), serious: token('status-serious'), critical: token('status-critical') },
    surface: token('surface'),
    gridline: token('gridline'),
    axis: token('axis'),
    ink: { primary: token('ink-primary'), secondary: token('ink-secondary'), muted: token('ink-muted') },
    fontFamily: read('--lc-sys-font-family-base', 'sans-serif'),
    fontSize,
    reducedMotion: flags.reducedMotion,
    patterns: flags.patterns,
  };
}

/** « 0.875rem » → 14, « 14px » → 14 (1 rem = 16 px). */
function toPixels(value: string): number {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return DEFAULT_FONT_SIZE;
  return /rem\s*$/.test(value) ? number * 16 : number;
}

/**
 * Thème des graphiques : relit les tokens CSS (ECharts ne voit pas les variables CSS) à chaque changement
 * de thème (`LcThemeService` : `revision`, attribut `data-theme` et variables inline) et de préférence d'accessibilité (mouvement réduit,
 * contraste élevé, couleurs forcées, impression).
 */
@Injectable({ providedIn: 'root' })
export class LcChartThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly themes = inject(LcThemeService);
  private readonly options = inject(LC_CHARTS_OPTIONS);
  private readonly version = signal(0);

  readonly theme: Signal<LcChartTheme> = computed(() => {
    this.version();
    this.themes.resolvedScheme();
    this.themes.revision();
    const root = this.document.documentElement;
    return readChartTheme(this.document.defaultView?.getComputedStyle(root) ?? root.style, {
      reducedMotion: this.matches('(prefers-reduced-motion: reduce)'),
      patterns: this.patternsEnabled(),
    });
  });

  constructor() {
    const view = this.document.defaultView;
    const refresh = (): void => this.version.update((value) => value + 1);
    const cleanups: (() => void)[] = [];
    if (view && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(refresh);
      observer.observe(this.document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
      cleanups.push(() => observer.disconnect());
    }
    for (const query of ['(prefers-reduced-motion: reduce)', '(forced-colors: active)', '(prefers-contrast: more)', 'print']) {
      const media = view?.matchMedia?.(query);
      media?.addEventListener?.('change', refresh);
      if (media) cleanups.push(() => media.removeEventListener?.('change', refresh));
    }
    inject(DestroyRef).onDestroy(() => cleanups.forEach((cleanup) => cleanup()));
  }

  /** Relit les tokens (après un changement de feuille de styles hors thème). */
  refresh(): void {
    this.version.update((value) => value + 1);
  }

  private patternsEnabled(): boolean {
    if (this.options.patterns === 'always') return true;
    if (this.options.patterns === 'never') return false;
    return this.matches('(forced-colors: active)') || this.matches('(prefers-contrast: more)') || this.matches('print');
  }

  private matches(query: string): boolean {
    return this.document.defaultView?.matchMedia?.(query)?.matches ?? false;
  }
}
