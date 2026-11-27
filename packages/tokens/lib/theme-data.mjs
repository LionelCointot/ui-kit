// Génère theme/data.generated.js : schéma des tokens `sys` éditables, valeurs résolues des thèmes de base
// et paires de contraste. Ce fichier alimente le module `@lionelcointot/ui-tokens/theme` (navigateur comme Node).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BASE_THEMES, PACKAGE_ROOT, resolvedTokens } from './tokens.mjs';

export const DATA_FILE = path.join(PACKAGE_ROOT, 'theme', 'data.generated.js');

/** Groupes d'édition, dans l'ordre d'affichage (spec § 5.2). Les libellés affichés viennent de LC_LABELS. */
export const THEME_GROUPS = [
  { id: 'brand', label: 'Couleurs de marque' },
  { id: 'status', label: 'États' },
  { id: 'surface', label: 'Surfaces et texte' },
  { id: 'charts', label: 'Graphiques' },
  { id: 'typography', label: 'Typographie' },
  { id: 'shape', label: 'Formes (arrondis)' },
  { id: 'spacing', label: 'Espacements' },
  { id: 'shadows', label: 'Ombres' },
];

/** Tokens `sys` hors du builder (socle des tokens § 5.2 ; mouvement : spec 2026-11-mouvement) : z-index, durées, courbes, cascade et décalage. */
const EXCLUDED_ROOTS = new Set(['z', 'duration', 'easing', 'motion']);
/** Rôles de mouvement : exclus du builder, mais un thème `.tokens.json` peut les surcharger (MOTION_SCHEMA, CA-1b). */
const MOTION_ROOTS = new Set([...EXCLUDED_ROOTS].filter((root) => root !== 'z'));
/** Tokens de components/motion.tokens.json qu'un thème ne règle pas : seuil de geste (ADR 0011 décision 6) et mise en page. */
const NOT_THEMEABLE = new Set([
  'sheet.card-width', 'sheet.card-max-height', 'sheet.radius', 'sheet.top-radius', 'sheet.max-height',
  'toast.tabbar-gap',
]);
const EDITABLE_TYPES = new Set(['color', 'dimension', 'fontFamily', 'number', 'shadow']);
const SIMPLE_PATHS = new Set(['color.primary', 'color.secondary', 'color.neutral', 'color.surface', 'color.background', 'radius.md', 'font.family.base']);
const BRAND_COLORS = /^color\.(on-)?(primary|secondary|neutral)(-container)?$/;
const STATUS_COLORS = /^color\.(on-)?(success|warning|error|info|highlight)(-container)?$/;
const GROUP_BY_ROOT = {
  state: 'status',
  color: 'surface',
  chart: 'charts',
  font: 'typography',
  radius: 'shape',
  border: 'shape',
  'focus-ring': 'shape',
  space: 'spacing',
  control: 'spacing',
  'icon-size': 'spacing',
  shadow: 'shadows',
};

function groupOf(tokenPath) {
  if (BRAND_COLORS.test(tokenPath)) return 'brand';
  if (STATUS_COLORS.test(tokenPath)) return 'status';
  const group = GROUP_BY_ROOT[tokenPath.split('.')[0]];
  if (!group) throw new Error(`Token « ${tokenPath} » sans groupe d'édition : compléter GROUP_BY_ROOT dans lib/theme-data.mjs.`);
  return group;
}

const isSimple = (tokenPath) => SIMPLE_PATHS.has(tokenPath) || (tokenPath.startsWith('space.') && tokenPath !== 'space.0');

function labelOf(tokenPath) {
  const text = tokenPath.replace(/[.-]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function* leaves(node, trail = []) {
  if (node && typeof node === 'object' && '$value' in node) {
    yield [trail.join('.'), node];
    return;
  }
  for (const [key, child] of Object.entries(node ?? {})) {
    if (!key.startsWith('$')) yield* leaves(child, [...trail, key]);
  }
}

export async function buildThemeData() {
  const defaultTree = JSON.parse(await readFile(path.join(PACKAGE_ROOT, 'src', 'sys', 'default.tokens.json'), 'utf8'));
  const schema = [];
  for (const [tokenPath, token] of leaves(defaultTree.sys)) {
    if (EXCLUDED_ROOTS.has(tokenPath.split('.')[0]) || !EDITABLE_TYPES.has(token.$type)) continue;
    const entry = { path: tokenPath, cssVar: `--lc-sys-${tokenPath.replaceAll('.', '-')}`, type: token.$type, group: groupOf(tokenPath), label: labelOf(tokenPath) };
    schema.push(isSimple(tokenPath) ? { ...entry, simple: true } : entry);
  }
  // Mouvement : rôles `sys` puis tokens composant de components/motion.tokens.json (chemin complet). Une distance ou un angle garde sa famille d'unité (`unit`), lue sur sa valeur de base.
  const motion = [];
  const resolved = await resolvedTokens('default');
  const addMotion = (tokenPath, cssVar, token, resolvedPath) => {
    const unit = token.$type === 'dimension' ? { unit: /(?:deg|turn)$/.test(String(resolved.get(resolvedPath))) ? 'angle' : 'length' } : {};
    motion.push({ path: tokenPath, cssVar, type: token.$type, ...unit });
  };
  for (const [tokenPath, token] of leaves(defaultTree.sys)) {
    if (MOTION_ROOTS.has(tokenPath.split('.')[0])) addMotion(tokenPath, `--lc-sys-${tokenPath.replaceAll('.', '-')}`, token, `sys.${tokenPath}`);
  }
  const components = JSON.parse(await readFile(path.join(PACKAGE_ROOT, 'src', 'components', 'motion.tokens.json'), 'utf8'));
  for (const [tokenPath, token] of leaves(components)) {
    if (!NOT_THEMEABLE.has(tokenPath)) addMotion(tokenPath, `--lc-${tokenPath.replaceAll('.', '-')}`, token, tokenPath);
  }
  const base = {};
  for (const theme of BASE_THEMES) {
    base[theme] = {};
    for (const [fullPath, value] of await resolvedTokens(theme)) {
      if (fullPath.startsWith('sys.')) base[theme][fullPath.slice(4)] = String(value);
    }
  }
  const { pairs } = JSON.parse(await readFile(path.join(PACKAGE_ROOT, 'src', 'checks', 'contrast-pairs.json'), 'utf8'));
  return { groups: THEME_GROUPS, schema, motion, base, pairs };
}

export function renderThemeData({ groups, schema, motion, base, pairs }) {
  // Une entrée par ligne : diffs lisibles quand un token change.
  const lines = (entries) => `[\n${entries.map((entry) => `  ${JSON.stringify(entry)}`).join(',\n')}\n]`;
  const constant = (name, value) => `export const ${name} = ${Array.isArray(value) ? lines(value) : JSON.stringify(value, null, 2)};\n`;
  return [
    '// Fichier généré par lib/theme-data.mjs (npm run build) à partir de src/sys, src/ref et src/checks : ne pas modifier à la main.\n',
    constant('THEME_GROUPS', groups),
    constant('THEME_SCHEMA', schema),
    constant('MOTION_SCHEMA', motion),
    constant('BASE_VALUES', base),
    constant('CONTRAST_PAIRS', pairs),
  ].join('\n');
}

export async function writeThemeData() {
  await writeFile(DATA_FILE, renderThemeData(await buildThemeData()));
}
