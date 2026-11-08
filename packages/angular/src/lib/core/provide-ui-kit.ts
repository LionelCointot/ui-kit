import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { LC_LABELS, LC_LABELS_FR, LcLabels } from './labels';
import { LC_DEFAULTS, LC_LOCALE, LC_THEME_NAMES, LcThemeNames } from './options';
import { LcDefaults } from './types';

export interface LcUiKitOptions {
  readonly locale?: string;
  readonly currency?: string;
  readonly defaults?: Partial<LcDefaults>;
  readonly themes?: LcThemeNames;
  readonly labels?: Partial<LcLabels>;
}

/** Configuration globale du ui-kit (locale, devise, valeurs par défaut des composants, thèmes, libellés). */
export function provideLcUiKit(options: LcUiKitOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: LC_LOCALE, useValue: { locale: options.locale ?? 'fr-FR', currency: options.currency ?? 'EUR' } },
    {
      provide: LC_DEFAULTS,
      useValue: { size: 'medium', fillMode: 'solid', rounded: 'medium', themeColor: 'primary', ...options.defaults },
    },
    { provide: LC_THEME_NAMES, useValue: options.themes ?? { light: 'default', dark: 'dark' } },
    { provide: LC_LABELS, useValue: { ...LC_LABELS_FR, ...options.labels } },
  ]);
}
