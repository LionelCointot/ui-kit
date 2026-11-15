// Génère packages/angular/src/lib/icon/default-icons.ts depuis lucide-static (licence ISC).
// Aucune dépendance d'exécution vers Lucide : les SVG deviennent des constantes TypeScript.
// Usage : node tools/generate-icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LUCIDE = path.join(ROOT, 'node_modules', 'lucide-static');
const OUTPUT = path.join(ROOT, 'packages', 'angular', 'src', 'lib', 'icon', 'default-icons.ts');

/** Jeu par défaut (catalogue §5.3.1) + icônes utilisées par les composants eux-mêmes (tri, tendances). */
const ICONS = [
  'check', 'x', 'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right', 'plus', 'minus', 'pencil', 'copy',
  'trash-2', 'save', 'folder-open', 'download', 'upload', 'search', 'info', 'circle-check', 'circle-alert',
  'triangle-alert', 'circle-x', 'menu', 'ellipsis-vertical', 'settings', 'sun', 'moon', 'monitor', 'calendar',
  'table', 'chart-line', 'eye', 'eye-off', 'external-link', 'rotate-ccw', 'house', 'landmark', 'calculator',
  // Ajouts internes : indicateurs de tri du tableau et tendances des cartes indicateurs.
  'arrow-up', 'arrow-down', 'arrow-up-down', 'arrow-right', 'trending-up', 'trending-down',
  // Ajouts : profils et authentification (avatar, connexion, mot de passe).
  'user', 'users', 'user-plus', 'user-pen', 'log-in', 'log-out', 'lock', 'lock-open', 'key-round', 'shield-check',
  // Ajout : comparaison (module « Acheter ou louer »).
  'scale',
  // Ajouts : contrôle de version, activité et rafraîchissement (composants génériques de suivi).
  'git-branch', 'git-commit-horizontal', 'activity', 'refresh-cw',
  // Ajouts : lancement, arrêt et états d'attente (pilotage d'une tâche).
  'play', 'square', 'circle-dashed', 'clock',
  // Ajouts : suivi de demandes (notifications, échanges, navigation, pièces jointes, réglages).
  'bell', 'bell-off', 'inbox', 'message-square', 'send', 'history', 'building-2', 'layout-dashboard',
  'arrow-right-left', 'hourglass', 'timer', 'mail', 'image', 'image-plus', 'circle-help', 'sliders-horizontal',
  'list', 'list-checks', 'file-text', 'wrench',
];

/** Extrait le contenu du SVG (formes) et le réenveloppe sans classe ni dimensions (la taille vient du CSS). */
function normalize(svg, name) {
  const inner = /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(svg)?.[1];
  if (!inner) throw new Error(`SVG illisible : ${name}`);
  const shapes = inner.replace(/\s*\n\s*/g, '').replace(/\s+\/>/g, '/>').trim();
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${shapes}</svg>`;
}

const { version } = JSON.parse(await readFile(path.join(LUCIDE, 'package.json'), 'utf8'));
const license = (await readFile(path.join(LUCIDE, 'LICENSE'), 'utf8')).split('\n---')[0].trim();
const entries = [];
for (const name of ICONS) {
  const svg = await readFile(path.join(LUCIDE, 'icons', `${name}.svg`), 'utf8');
  entries.push(`  '${name}': '${normalize(svg, name)}',`);
}

const header = [
  '/*',
  ' * Fichier généré par tools/generate-icons.mjs : ne pas modifier à la main.',
  ` * Icônes Lucide (https://lucide.dev), lucide-static v${version}.`,
  ' *',
  ...license.split('\n').map((line) => ` * ${line}`.trimEnd()),
  ' *',
  ' * Certaines icônes dérivent de Feather (MIT, Copyright (c) 2013-present Cole Bemis).',
  ' */',
];
const body = [
  '',
  '/** Jeu d\'icônes par défaut : constantes SVG du code (jamais de contenu fourni par l\'utilisateur). */',
  'export const LC_DEFAULT_ICONS: Readonly<Record<string, string>> = {',
  ...entries,
  '};',
  '',
];
await writeFile(OUTPUT, [...header, ...body].join('\n'));
console.log(`${ICONS.length} icônes écrites dans ${path.relative(ROOT, OUTPUT)}`);
