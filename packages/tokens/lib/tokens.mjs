// Construction des thèmes avec Style Dictionary 5 (format DTCG) et contrôles (ADR-0001).
import StyleDictionary from 'style-dictionary';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio } from './contrast.mjs';

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(PACKAGE_ROOT, 'src');
export const BASE_THEMES = ['default', 'dark'];

function sources(baseTheme, themeFile) {
  return [
    `${SRC}/ref/**/*.tokens.json`,
    `${SRC}/sys/${baseTheme}.tokens.json`,
    `${SRC}/components/**/*.tokens.json`,
    ...(themeFile ? [path.resolve(themeFile)] : []),
  ];
}

function createDictionary(baseTheme, themeFile, files = [], buildPath = 'dist/') {
  if (!BASE_THEMES.includes(baseTheme)) {
    throw new Error(`Thème de base inconnu : « ${baseTheme} » (attendu : ${BASE_THEMES.join(', ')}).`);
  }
  return new StyleDictionary({
    source: sources(baseTheme, themeFile),
    usesDtcg: true,
    log: { verbosity: 'silent', warnings: 'disabled', errors: { brokenReferences: 'throw' } },
    platforms: {
      css: { transforms: ['name/kebab'], prefix: 'lc', buildPath, files },
    },
  });
}

/** Écrit un fichier CSS de variables pour les jetons retenus par `filter`. */
export async function buildCss({ baseTheme, themeFile, selector, buildPath, destination, filter }) {
  const dictionary = createDictionary(baseTheme, themeFile, [
    { destination, format: 'css/variables', filter, options: { selector, outputReferences: true } },
  ], buildPath.endsWith('/') ? buildPath : `${buildPath}/`);
  await dictionary.buildAllPlatforms();
}

/** Jetons résolus à plat : « sys.color.primary » → valeur finale. */
export async function resolvedTokens(baseTheme, themeFile) {
  const dictionary = createDictionary(baseTheme, themeFile);
  const tree = await dictionary.exportPlatform('css');
  const flat = new Map();
  const walk = (node, trail) => {
    if (node && typeof node === 'object' && '$value' in node) {
      flat.set(trail.join('.'), node.$value);
      return;
    }
    for (const [key, child] of Object.entries(node ?? {})) {
      if (!key.startsWith('$')) walk(child, [...trail, key]);
    }
  };
  walk(tree, []);
  return flat;
}

/** Chemins des jetons déclarés dans un fichier DTCG (pour repérer les jetons inconnus d'un thème produit). */
export async function declaredPaths(file) {
  const json = JSON.parse(await readFile(file, 'utf8'));
  const paths = [];
  const walk = (node, trail) => {
    if (node && typeof node === 'object' && '$value' in node) {
      paths.push(trail.join('.'));
      return;
    }
    for (const [key, child] of Object.entries(node ?? {})) {
      if (!key.startsWith('$')) walk(child, [...trail, key]);
    }
  };
  walk(json, []);
  return paths;
}

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

/** Contrôles d'un thème : jetons inconnus (faute de frappe) et contraste des paires déclarées. */
export async function checkTheme(baseTheme, themeFile) {
  const errors = [];
  const base = await resolvedTokens(baseTheme);
  if (themeFile) {
    for (const tokenPath of await declaredPaths(themeFile)) {
      if (!base.has(tokenPath)) {
        const closest = [...base.keys()].sort((a, b) => distance(tokenPath, a) - distance(tokenPath, b))[0];
        errors.push(`Jeton inconnu « ${tokenPath} » (vouliez-vous dire « ${closest} » ?).`);
      }
    }
  }
  const tokens = await resolvedTokens(baseTheme, themeFile);
  const { pairs } = JSON.parse(await readFile(path.join(SRC, 'checks', 'contrast-pairs.json'), 'utf8'));
  const report = [];
  for (const [foregroundPath, backgroundPath, minimum] of pairs) {
    const ratio = contrastRatio(tokens.get(foregroundPath), tokens.get(backgroundPath));
    if (ratio === null) continue;
    const ok = ratio >= minimum;
    report.push({ foregroundPath, backgroundPath, ratio, minimum, ok });
    if (!ok) {
      errors.push(`Contraste insuffisant : ${foregroundPath} (${tokens.get(foregroundPath)}) sur ${backgroundPath} (${tokens.get(backgroundPath)}) = ${ratio.toFixed(2)}:1, minimum ${minimum}:1.`);
    }
  }
  return { errors, report };
}

export const isSystemToken = (token) => token.path[0] === 'sys';
export const isBaseToken = (token) => token.path[0] !== 'sys';
