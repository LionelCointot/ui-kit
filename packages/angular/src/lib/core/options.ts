import { InjectionToken } from '@angular/core';
import { LcDefaults } from './types';

export interface LcLocaleOptions {
  /** Défaut 'fr-FR'. */
  readonly locale: string;
  /** Défaut 'EUR'. */
  readonly currency: string;
}

export interface LcThemeNames {
  /** Valeur de data-theme en clair (défaut 'default'). */
  readonly light: string;
  /** Valeur de data-theme en sombre (défaut 'dark'). */
  readonly dark: string;
}

export const LC_DEFAULTS = new InjectionToken<LcDefaults>('LC_DEFAULTS', {
  providedIn: 'root',
  factory: () => ({ size: 'medium', fillMode: 'solid', rounded: 'medium', themeColor: 'primary' }),
});

export const LC_LOCALE = new InjectionToken<LcLocaleOptions>('LC_LOCALE', {
  providedIn: 'root',
  factory: () => ({ locale: 'fr-FR', currency: 'EUR' }),
});

export const LC_THEME_NAMES = new InjectionToken<LcThemeNames>('LC_THEME_NAMES', {
  providedIn: 'root',
  factory: () => ({ light: 'default', dark: 'dark' }),
});
