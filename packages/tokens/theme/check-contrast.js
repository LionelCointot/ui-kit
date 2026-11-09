// Contraste des paires texte/fond du thème (src/checks/contrast-pairs.json) : une implémentation pour le CLI et le navigateur.
import { contrastRatio } from './contrast.js';
import { contrastPairs } from './model.js';
import { cssVarOf } from './paths.js';

const withoutSysPrefix = (tokenPath) => tokenPath.replace(/^sys\./, '');

/**
 * Ratios des paires contrôlées. Une paire dont une couleur est translucide ou absente est ignorée (ratio non défini).
 * @param {Readonly<Record<string, string>>} resolved variable CSS → valeur (voir resolveTheme)
 * @returns {Array<{ fg: string, bg: string, fgValue: string, bgValue: string, ratio: number, required: number, pass: boolean }>}
 */
export function checkContrast(resolved) {
  const results = [];
  for (const [foreground, background, required] of contrastPairs) {
    const [fg, bg] = [withoutSysPrefix(foreground), withoutSysPrefix(background)];
    const [fgValue, bgValue] = [resolved[cssVarOf(fg)], resolved[cssVarOf(bg)]];
    const ratio = fgValue === undefined || bgValue === undefined ? null : contrastRatio(fgValue, bgValue);
    if (ratio !== null) results.push({ fg, bg, fgValue, bgValue, ratio, required, pass: ratio >= required });
  }
  return results;
}
