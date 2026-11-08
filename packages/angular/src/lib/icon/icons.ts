import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { LC_DEFAULT_ICONS } from './default-icons';

/** Jeux d'icônes enregistrés par l'application (chaînes SVG constantes du code). */
export const LC_ICONS = new InjectionToken<readonly Readonly<Record<string, string>>[]>('LC_ICONS');

/**
 * Ajoute ou remplace des icônes (noms en kebab-case, valeurs = SVG constants du code, jamais du contenu saisi).
 * À appeler dans la configuration de l'application ou d'une route ; plusieurs appels s'additionnent,
 * le dernier enregistré l'emporte pour un même nom.
 */
export function provideLcIcons(icons: Readonly<Record<string, string>>): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: LC_ICONS, useValue: icons, multi: true }]);
}

/** Résout un nom d'icône : jeux enregistrés (le dernier d'abord), puis jeu par défaut. */
export function resolveIcon(name: string, sets: readonly Readonly<Record<string, string>>[]): string | undefined {
  for (let index = sets.length - 1; index >= 0; index--) {
    if (Object.hasOwn(sets[index], name)) {
      return sets[index][name];
    }
  }
  return Object.hasOwn(LC_DEFAULT_ICONS, name) ? LC_DEFAULT_ICONS[name] : undefined;
}
