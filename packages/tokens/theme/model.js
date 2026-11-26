// Modèle en lecture seule construit à partir de data.generated.js (schéma, valeurs de base, piles de polices).
import { BASE_VALUES, CONTRAST_PAIRS, MOTION_SCHEMA, THEME_GROUPS, THEME_SCHEMA } from './data.generated.js';
import { EXTRA_FONT_STACKS } from './fonts.js';

export const BASE_NAMES = Object.freeze(Object.keys(BASE_VALUES));

export const schema = Object.freeze(THEME_SCHEMA.map((entry) => Object.freeze({ ...entry })));
export const groups = Object.freeze(THEME_GROUPS.map((group) => Object.freeze({ ...group })));
export const contrastPairs = Object.freeze(CONTRAST_PAIRS);
export const baseValuesByName = Object.freeze(Object.fromEntries(
  BASE_NAMES.map((name) => [name, Object.freeze({ ...BASE_VALUES[name] })]),
));

/** Entrées du schéma par chemin (Map : pas de collision avec `__proto__` ou `constructor`). */
export const schemaByPath = new Map(schema.map((entry) => [entry.path, entry]));

/** Tokens de mouvement qu'un thème peut surcharger sans qu'ils soient dans le builder : rôles `sys` (`duration.fast`) et composant (`button.press-duration`). */
export const motionByPath = new Map(MOTION_SCHEMA.map((entry) => [entry.path, Object.freeze({ ...entry })]));

export const fontStacks = Object.freeze([
  ...['base', 'mono'].map((key) => Object.freeze({
    id: key,
    label: key === 'base' ? 'Système' : 'Monospace système',
    value: BASE_VALUES.default[`font.family.${key}`],
  })),
  ...EXTRA_FONT_STACKS,
]);
export const knownFontStacks = new Set(fontStacks.map((stack) => stack.value));

export const isBaseName = (value) => typeof value === 'string' && BASE_NAMES.includes(value);
