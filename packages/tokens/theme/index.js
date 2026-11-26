// Cœur de thème indépendant du framework : schéma, validation stricte, résolution, rendu CSS, contraste, DTCG.
// Aucun import Node : le module s'exécute dans le navigateur comme sous Node (CLI lc-tokens).
import { baseValuesByName, fontStacks, groups, isBaseName, motionSchema, schema } from './model.js';

export { THEME_NAME_PATTERN, validateTheme } from './validate.js';
export { overrideVars, renderThemeCss, resolveTheme } from './resolve.js';
export { checkContrast } from './check-contrast.js';
export { fromDtcg, toDtcg } from './dtcg.js';
export { deriveContainer, deriveOnColor } from './derive.js';
export { contrastRatio, parseColor } from './contrast.js';
export { cssVarOf } from './paths.js';

/** Tokens `sys` éditables, dans l'ordre de la source. */
export const themeSchema = schema;
/** Tokens de mouvement qu'un thème peut surcharger sans qu'ils soient dans le builder : rôles `sys` et tokens composant. */
export { motionSchema };
/** Groupes d'édition, dans l'ordre d'affichage. */
export const themeGroups = groups;
/** Piles de polices proposées (valeurs exactes acceptées par validateTheme, en plus de noms simples). */
export const themeFontStacks = fontStacks;

/**
 * Valeurs résolues d'un thème de base : chemin → valeur concrète (tous les tokens `sys`).
 * @param {'default' | 'dark'} base
 */
export function baseValues(base) {
  if (!isBaseName(base)) throw new RangeError(`Thème de base inconnu : « ${String(base)} » (attendu : default ou dark).`);
  return baseValuesByName[base];
}
