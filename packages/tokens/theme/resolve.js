// Résolution d'un thème (base + surcharges) et rendu CSS `[data-theme="<nom>"]`.
import { cssVarOf } from './paths.js';
import { baseValuesByName, schemaByPath } from './model.js';
import { isSafeCssValue } from './values.js';
import { validateTheme } from './validate.js';

function assertValid(definition, options) {
  const { valid, errors } = validateTheme(definition, options);
  if (!valid) {
    throw new Error(`Thème invalide : ${errors.map((error) => `${error.path || 'thème'} (${error.message})`).join(' ; ')}`);
  }
}

/**
 * Variables CSS des seules surcharges (prévisualisation en ligne sur <html>, thème de base posé par data-theme).
 * @param {{ extends: string, overrides: Readonly<Record<string, string>> }} definition
 * @returns {Record<string, string>}
 */
export function overrideVars(definition) {
  assertValid(definition, { identity: false });
  return Object.fromEntries(Object.entries(definition.overrides).map(([tokenPath, value]) => [schemaByPath.get(tokenPath).cssVar, value]));
}

/**
 * Valeurs finales de tous les tokens `sys` : variable CSS → valeur (base, puis surcharges).
 * @param {{ extends: string, overrides: Readonly<Record<string, string>> }} definition
 * @returns {Record<string, string>}
 */
export function resolveTheme(definition) {
  assertValid(definition, { identity: false });
  const merged = { ...baseValuesByName[definition.extends], ...definition.overrides };
  return Object.fromEntries(Object.entries(merged).map(([tokenPath, value]) => [cssVarOf(tokenPath), value]));
}

/**
 * Feuille de style du thème. Refuse un thème invalide (lève une exception).
 * @param {{ name: string, label?: string, extends: string, overrides: Readonly<Record<string, string>> }} definition
 */
export function renderThemeCss(definition) {
  assertValid(definition);
  const lines = Object.entries(resolveTheme(definition)).map(([cssVar, value]) => {
    if (!isSafeCssValue(value)) throw new Error(`Valeur refusée pour ${cssVar}.`);
    return `  ${cssVar}: ${value};`;
  });
  return `[data-theme="${definition.name}"] {\n${lines.join('\n')}\n}\n`;
}
