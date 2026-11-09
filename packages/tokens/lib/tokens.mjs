// Construction des thèmes avec Style Dictionary 5 (format DTCG, ADR-0001) ; les contrôles sont dans check.mjs.
import StyleDictionary from 'style-dictionary';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export const isSystemToken = (token) => token.path[0] === 'sys';
export const isBaseToken = (token) => token.path[0] !== 'sys';

/**
 * Jetons d'un thème produit : tous les jetons sémantiques de la base choisie (surcharges du produit appliquées)
 * et tout autre jeton déclaré par le fichier du produit. Un thème dérivé de « dark » reste ainsi sombre même
 * pour les jetons qu'il ne surcharge pas (sinon ils retomberaient sur les valeurs de `:root`, claires).
 */
export const productThemeFilter = (themeFile) => (token) =>
  isSystemToken(token) || path.resolve(token.filePath) === path.resolve(themeFile);
