// Contraste WCAG 2.2 : ratio entre deux couleurs opaques (hex ou rgb()). Sans dépendance, utilisable dans le navigateur.

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const RGB_COLOR = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/;

/**
 * Convertit « #rgb », « #rrggbb », « #rrggbbaa » ou « rgb(r, g, b) » en [r, g, b] (0-255).
 * Renvoie null si la couleur est translucide ou inconnue.
 * @param {string} value
 * @returns {[number, number, number] | null}
 */
export function parseColor(value) {
  const text = String(value).trim().toLowerCase();
  const hex = HEX_COLOR.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
    const alpha = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) : 255;
    return alpha === 255 ? [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) : null;
  }
  const rgb = RGB_COLOR.exec(text);
  if (rgb && (rgb[4] === undefined || Number(rgb[4]) === 1)) {
    const channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    return channels.every((channel) => channel <= 255) ? channels : null;
  }
  return null;
}

function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** @param {[number, number, number]} rgb */
export function relativeLuminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Ratio de contraste (1 à 21), ou null si une couleur n'est pas opaque.
 * @param {string} foreground
 * @param {string} background
 * @returns {number | null}
 */
export function contrastRatio(foreground, background) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return null;
  const [light, dark] = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
