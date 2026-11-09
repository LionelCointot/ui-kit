// Dérivations de couleurs : texte lisible sur un fond, variante « container » d'une couleur de marque.
import { contrastRatio, parseColor } from './contrast.js';

const MIN_TEXT_RATIO = 4.5;
const LIGHT_CONTAINER_MIX = 0.85;
const DARK_CONTAINER_MIX = 0.7;
const STEPS = 20;
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

const toHex = (rgb) => `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
const mix = (from, to, amount) => from.map((channel, index) => channel + (to[index] - channel) * amount);

function opaqueColor(value) {
  const rgb = parseColor(value);
  if (!rgb) throw new RangeError(`Couleur opaque attendue : « ${value} ».`);
  return rgb;
}

/**
 * Texte noir ou blanc, selon celui qui contraste le mieux avec le fond.
 * @param {string} background couleur opaque
 * @returns {'#000000' | '#ffffff'}
 */
export function deriveOnColor(background) {
  opaqueColor(background);
  return contrastRatio('#ffffff', background) >= contrastRatio('#000000', background) ? '#ffffff' : '#000000';
}

/**
 * Variante « container » : la couleur éclaircie (thème clair) ou assombrie (thème sombre), et un « on-container »
 * tiré de la couleur d'origine, poussé vers le noir ou le blanc jusqu'à 4,5:1 sur le container.
 * @param {string} color couleur opaque
 * @param {'light' | 'dark'} scheme
 * @returns {{ container: string, onContainer: string }}
 */
export function deriveContainer(color, scheme) {
  const rgb = opaqueColor(color);
  const dark = scheme === 'dark';
  const container = toHex(mix(rgb, dark ? BLACK : WHITE, dark ? DARK_CONTAINER_MIX : LIGHT_CONTAINER_MIX));
  const target = dark ? WHITE : BLACK;
  let onContainer = toHex(target);
  for (let step = 0; step <= STEPS; step++) {
    const candidate = toHex(mix(rgb, target, step / STEPS));
    if (contrastRatio(candidate, container) >= MIN_TEXT_RATIO) {
      onContainer = candidate;
      break;
    }
  }
  return { container, onContainer };
}
