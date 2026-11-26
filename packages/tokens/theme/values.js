// Listes blanches strictes par type de valeur (spec § 7). Les valeurs d'un thème sont réinjectées dans une feuille
// de style : aucune concaténation de texte libre, seulement des motifs fermés, ancrés, sans `;`, `{`, `}`, `<`, `\` ni `url(`.

const MAX_VALUE_LENGTH = 300;
const MAX_SHADOW_LAYERS = 6;
const MAX_FONT_NAMES = 12;

const CHANNEL = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const ALPHA = '(?:0|1|0?\\.\\d{1,3}|1\\.0{1,3})';
const COLOR_SOURCE = `(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\\(\\s*${CHANNEL}\\s*,\\s*${CHANNEL}\\s*,\\s*${CHANNEL}\\s*(?:,\\s*${ALPHA}\\s*)?\\))`;
const LENGTH_SOURCE = '(?:-?\\d+(?:\\.\\d+)?px|0)';

const COLOR = new RegExp(`^${COLOR_SOURCE}$`);
const DIMENSION = /^(?:0|\d+(?:\.\d+)?(?:px|rem|em))$/;
const NUMBER = /^\d+(?:\.\d+)?$/;
const DURATION = /^\d+(?:\.\d+)?(?:ms|s)$/;
const SHADOW_LAYER = new RegExp(`^(?:inset\\s+)?${LENGTH_SOURCE}(?:\\s+${LENGTH_SOURCE}){1,3}\\s+${COLOR_SOURCE}$`);
const FONT_NAME = /^[A-Za-z][A-Za-z0-9 -]{0,63}$/;
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

/** Caractères et fonctions qui ne doivent jamais atteindre une feuille de style. */
const FORBIDDEN = /[;{}<>\\]|url\s*\(|\/\*|@import/i;

/** Découpe une liste de couches d'ombre sur les virgules hors parenthèses. */
function splitLayers(value) {
  const layers = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      layers.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  layers.push(value.slice(start).trim());
  return layers;
}

function isShadow(value) {
  if (value === 'none') return true;
  const layers = splitLayers(value);
  return layers.length <= MAX_SHADOW_LAYERS && layers.every((layer) => SHADOW_LAYER.test(layer));
}

function isFontFamily(value, knownStacks) {
  if (knownStacks.has(value)) return true;
  const names = value.split(',').map((name) => name.trim());
  return names.length <= MAX_FONT_NAMES && names.every((name) => FONT_NAME.test(name) && !CSS_WIDE_KEYWORDS.has(name.toLowerCase()));
}

/**
 * Une valeur est-elle acceptable pour ce type ? Faux pour tout ce qui n'est pas une chaîne.
 * @param {string} type
 * @param {unknown} value
 * @param {ReadonlySet<string>} knownFontStacks piles de polices fournies (valeurs exactes)
 */
export function isValidValue(type, value, knownFontStacks) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_VALUE_LENGTH) return false;
  if (type === 'fontFamily') return isFontFamily(value, knownFontStacks);
  if (FORBIDDEN.test(value)) return false;
  switch (type) {
    case 'color': return COLOR.test(value);
    case 'dimension': return DIMENSION.test(value);
    case 'number': return NUMBER.test(value);
    case 'duration': return DURATION.test(value);
    case 'shadow': return isShadow(value);
    default: return false;
  }
}

// Nombres sans ambiguïté de retour arrière : chaque motif consomme ses caractères d'une seule façon.
const SIGNED = '-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
const UNIT_FAMILIES = {
  length: new RegExp(`^(?:0|${SIGNED}(?:px|rem|em|%|dvh))$`),
  angle: new RegExp(`^${SIGNED}(?:deg|turn)$`),
};
const X = '(?:0(?:\\.\\d+)?|1(?:\\.0+)?|\\.\\d+)'; // abscisse d'un point de contrôle : de 0 à 1
const CUBIC_BEZIER = new RegExp(`^cubic-bezier\\(\\s*${X}\\s*,\\s*${SIGNED}\\s*,\\s*${X}\\s*,\\s*${SIGNED}\\s*\\)$`);

/**
 * Valeur d'un token de mouvement : mêmes garde-fous que isValidValue, plus des distances signées, des %, des angles
 * (`unit` : famille d'unité de la valeur de base du token) et la courbe `cubic-bezier()` (x dans [0, 1], y libres).
 */
export function isValidMotionValue(type, value, unit = 'length') {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_VALUE_LENGTH || FORBIDDEN.test(value)) return false;
  if (type === 'dimension') return UNIT_FAMILIES[unit].test(value);
  if (type === 'cubicBezier') return CUBIC_BEZIER.test(value);
  return isValidValue(type, value, new Set());
}

/** Dernier garde-fou avant écriture dans une feuille de style (les piles de la base contiennent des apostrophes). */
export function isSafeCssValue(value) {
  return typeof value === 'string' && !FORBIDDEN.test(value) && !/[\r\n"]/.test(value);
}
