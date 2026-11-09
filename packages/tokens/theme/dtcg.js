// Import et export au format DTCG des thèmes produit : { sys: { color: { primary: { $value, $type } } } }.
import { schema, schemaByPath } from './model.js';
import { validateTheme } from './validate.js';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function* leaves(node, trail) {
  if (isObject(node) && '$value' in node) {
    yield [trail.join('.'), node.$value];
    return;
  }
  if (!isObject(node)) return;
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith('$')) yield* leaves(child, [...trail, key]);
  }
}

/** Une valeur DTCG est lue comme texte ; tout ce qui n'est pas un texte ou un nombre sera refusé par validateTheme. */
function valueToText(value) {
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value.join(', ');
  return typeof value === 'string' ? value : '[valeur non textuelle]';
}

/**
 * Thème exporté : un fichier de surcharges compilable tel quel par `lc-tokens build`. Refuse un thème invalide.
 * @param {{ name: string, label?: string, extends: string, overrides: Readonly<Record<string, string>> }} definition
 */
export function toDtcg(definition) {
  const { valid, errors } = validateTheme(definition);
  if (!valid) throw new Error(`Export impossible, thème invalide : ${errors.map((error) => error.message).join(' ; ')}`);
  const sys = {};
  for (const { path: tokenPath, type } of schema) {
    if (!Object.hasOwn(definition.overrides, tokenPath)) continue;
    const segments = tokenPath.split('.');
    const leaf = segments.pop();
    const parent = segments.reduce((node, segment) => (node[segment] ??= {}), sys);
    parent[leaf] = { $value: definition.overrides[tokenPath], $type: type };
  }
  return { sys };
}

/**
 * Lit un fichier DTCG de thème produit. Les jetons hors `sys`, inconnus, ou dont la valeur est une référence
 * restent dans les surcharges (chemin complet pour les jetons hors `sys`) : validateTheme les refuse ensuite.
 * @param {unknown} json
 * @param {{ name: string, extends: 'default' | 'dark', label?: string }} options
 */
export function fromDtcg(json, options) {
  const entries = [];
  for (const [tokenPath, value] of leaves(json, [])) {
    const isSystem = tokenPath.startsWith('sys.');
    // Un jeton hors `sys` ne doit jamais être pris pour un jeton `sys` (ex. un groupe racine « color »).
    const key = isSystem ? tokenPath.slice(4) : schemaByPath.has(tokenPath) ? `~${tokenPath}` : tokenPath;
    entries.push([key, valueToText(value)]);
  }
  const definition = { name: options.name, extends: options.extends, overrides: Object.fromEntries(entries) };
  return options.label === undefined ? definition : { ...definition, label: options.label };
}
