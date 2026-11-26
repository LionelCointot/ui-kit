// Validation d'un thème : identité (nom, libellé, base) et surcharges (chemin connu, valeur selon le type).
import { baseValuesByName, isBaseName, knownFontStacks, motionByPath, schema, schemaByPath } from './model.js';
import { isValidMotionValue, isValidValue } from './values.js';

export const THEME_NAME_PATTERN = /^[a-z][a-z0-9-]{0,47}$/;
const RESERVED_NAMES = new Set(['default', 'dark']);
const MAX_LABEL_LENGTH = 60;
const CONTROL_CHARACTERS = /\p{Cc}/u;

/**
 * @typedef {{ path: string, code: string, message: string, suggestion?: string }} ThemeIssue
 */

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function closestPath(tokenPath) {
  return schema.map((entry) => entry.path).sort((a, b) => distance(tokenPath, a) - distance(tokenPath, b))[0];
}

/** @returns {ThemeIssue[]} */
function validateIdentity(definition) {
  const issues = [];
  if (typeof definition.name !== 'string' || !THEME_NAME_PATTERN.test(definition.name)) {
    issues.push({ path: 'name', code: 'invalid-name', message: 'Le nom doit commencer par une lettre minuscule, puis lettres minuscules, chiffres ou tirets (48 caractères au plus).' });
  } else if (RESERVED_NAMES.has(definition.name)) {
    issues.push({ path: 'name', code: 'reserved-name', message: `Le nom « ${definition.name} » est réservé.` });
  }
  const { label } = definition;
  if (label !== undefined && (typeof label !== 'string' || label.trim().length === 0 || label.length > MAX_LABEL_LENGTH || CONTROL_CHARACTERS.test(label))) {
    issues.push({ path: 'label', code: 'invalid-label', message: `Le libellé doit compter de 1 à ${MAX_LABEL_LENGTH} caractères, sans caractère de contrôle.` });
  }
  return issues;
}

/** @returns {ThemeIssue[]} */
function validateOverrides(definition) {
  const { overrides, extends: base } = definition;
  const issues = [];
  if (!isBaseName(base)) {
    issues.push({ path: 'extends', code: 'invalid-base', message: 'La base doit être « default » ou « dark ».' });
  }
  if (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides)) {
    issues.push({ path: 'overrides', code: 'invalid-overrides', message: 'Les surcharges doivent être un objet « chemin → valeur ».' });
    return issues;
  }
  for (const [tokenPath, value] of Object.entries(overrides)) {
    const motion = motionByPath.get(tokenPath);
    const entry = schemaByPath.get(tokenPath);
    if (motion) {
      if (!isValidMotionValue(motion.type, value, motion.unit)) issues.push({ path: tokenPath, code: 'invalid-value', message: `Valeur refusée pour « ${tokenPath} » (type ${motion.type}).` });
    } else if (!entry) {
      issues.push(unknownToken(tokenPath));
    } else if (!isValidValue(entry.type, value, knownFontStacks)) {
      issues.push({ path: tokenPath, code: 'invalid-value', message: `Valeur refusée pour « ${tokenPath} » (type ${entry.type}).` });
    }
  }
  return issues;
}

function unknownToken(tokenPath) {
  if (Object.hasOwn(baseValuesByName.default, tokenPath)) {
    return { path: tokenPath, code: 'not-editable', message: `Le token « ${tokenPath} » n'est pas modifiable par un thème.` };
  }
  const suggestion = closestPath(tokenPath);
  return { path: tokenPath, code: 'unknown-token', message: `Token inconnu « ${tokenPath} » (vouliez-vous dire « ${suggestion} » ?).`, suggestion };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Valide un thème. Une définition qui n'est pas un objet est refusée.
 * `identity: false` ignore le nom et le libellé (prévisualisation, résolution) : seules la base et les surcharges comptent.
 * @param {unknown} definition
 * @param {{ identity?: boolean }} [options]
 */
export function validateTheme(definition, { identity = true } = {}) {
  if (!isObject(definition)) {
    return { valid: false, errors: [{ path: '', code: 'invalid-theme', message: 'Le thème doit être un objet.' }] };
  }
  const errors = [...(identity ? validateIdentity(definition) : []), ...validateOverrides(definition)];
  return { valid: errors.length === 0, errors };
}
