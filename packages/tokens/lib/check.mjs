// Contrôles d'un thème produit pour le CLI et le build : mêmes validation et contraste que le module navigateur.
import { readFile } from 'node:fs/promises';
import { checkContrast, cssVarOf, fromDtcg, validateTheme } from '../theme/index.js';
import { resolvedTokens } from './tokens.mjs';

/** Jetons `sys` résolus par Style Dictionary, au format « variable CSS → valeur » attendu par checkContrast. */
function systemVars(tokens) {
  return Object.fromEntries([...tokens].filter(([tokenPath]) => tokenPath.startsWith('sys.')).map(([tokenPath, value]) => [cssVarOf(tokenPath.slice(4)), String(value)]));
}

/** Erreurs de validation d'un fichier DTCG de thème produit (même règles que `validateTheme` dans le navigateur). */
export async function validateThemeFile(baseTheme, themeFile) {
  const definition = fromDtcg(JSON.parse(await readFile(themeFile, 'utf8')), { name: 'check', extends: baseTheme });
  return validateTheme(definition, { identity: false }).errors;
}

/** Contrôles d'un thème : jetons inconnus ou valeurs refusées, puis contraste des paires. */
export async function checkTheme(baseTheme, themeFile) {
  const issues = themeFile ? await validateThemeFile(baseTheme, themeFile) : [];
  // Un thème refusé n'est pas compilé : ses valeurs pourraient faire échouer Style Dictionary.
  if (issues.length > 0) return { errors: issues.map((issue) => issue.message), report: [] };
  const resolved = systemVars(await resolvedTokens(baseTheme, themeFile));
  const report = checkContrast(resolved).map(({ fg, bg, fgValue, bgValue, ratio, required, pass }) => ({
    foregroundPath: `sys.${fg}`, backgroundPath: `sys.${bg}`, foregroundValue: fgValue, backgroundValue: bgValue, ratio, minimum: required, ok: pass,
  }));
  const errors = report.filter((line) => !line.ok).map((line) =>
    `Contraste insuffisant : ${line.foregroundPath} (${line.foregroundValue}) sur ${line.backgroundPath} (${line.backgroundValue}) = ${line.ratio.toFixed(2)}:1, minimum ${line.minimum}:1.`);
  return { errors, report };
}
