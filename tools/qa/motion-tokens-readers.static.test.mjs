// docs/specs/2026-12-mouvement-v2.md, T16 (demandé par `architect` en T3) : aucun token de mouvement sans lecteur, et CA-6 (`@angular/animations` ni importé ni déclaré).
// Lancer : node --test tools/qa/motion-tokens-readers.static.test.mjs
// Un token est « lu » s'il apparaît (hors commentaires) dans un .css ou .ts du kit, sous son nom complet ou sous un gabarit (`--lc-sheet-${kind}-duration`),
// ou s'il est l'alias d'un token lu (`{sys.duration.title}` dans `reveal.tilt-duration`). Les tokens de `lib/motion/motion.types.ts` , `runtime/motion-tokens.ts` (gabarit générique `--lc-sys-duration-${rôle}`) et la table de `chart-motion.ts` ne comptent pas : ils listent des noms, ils n'en lisent aucun.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const angular = join(root, 'packages/angular');
const tokens = join(root, 'packages/tokens/src');
const json = (file) => JSON.parse(readFileSync(join(tokens, file), 'utf8'));
const strip = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Exceptions : token sans lecteur aujourd'hui, avec la raison. Une entrée qui a un lecteur fait échouer le test : on la retire alors de la liste. */
export const WITHOUT_READER = {
  '--lc-sys-easing-emphasized': 'rôle public historique (CA-1 : valeur inchangée), réservé aux thèmes des applications ; aucun composant du kit ne le lit',
  '--lc-topbar-enter-offset': 'd05 (entrée de la barre du haut de lc-app-shell au chargement, §5.4.1) : lecteur pas encore livré',
  '--lc-topbar-enter-duration': 'd05 : lecteur pas encore livré',
  '--lc-topbar-enter-stagger': 'd05 : lecteur pas encore livré',
  '--lc-toast-tabbar-gap': 'toast au-dessus de la barre d\'onglets (d60) : lecteur attendu de la tâche d\'intégration',
};

const sources = readdirSync(angular, { withFileTypes: true, recursive: true })
  .filter((f) => f.isFile() && /\.(css|ts)$/.test(f.name) && !/\.(spec|stories)\.ts$|\.stories\.|\.d\.ts$/.test(f.name))
  .map((f) => join(f.parentPath, f.name))
  .filter((f) => !/\/(node_modules|dist|testing)\//.test(f) && !/lib\/motion\/motion\.types\.ts$|runtime\/motion-tokens\.ts$|theme\/chart-motion\.ts$/.test(f));
const code = sources.map((f) => strip(readFileSync(f, 'utf8'))).join('\n');

const sysNames = ['duration', 'easing', 'motion'].flatMap((family) => Object.keys(json('sys/default.tokens.json').sys[family]).map((k) => `--lc-sys-${family}-${k}`));
const components = json('components/motion.tokens.json');
const componentNames = Object.entries(components).flatMap(([group, v]) => Object.keys(v).map((k) => `--lc-${group}-${k}`));
const aliasName = (ref) => `--lc-${ref.slice(1, -1).replace(/\./g, '-')}`;
const aliases = Object.entries(components).flatMap(([group, v]) => Object.entries(v)
  .filter(([, t]) => typeof t.$value === 'string' && /^\{[\w.-]+\}$/.test(t.$value))
  .map(([k, t]) => [`--lc-${group}-${k}`, aliasName(t.$value)]));

const templates = [...code.matchAll(/--lc-[\w-]*\$\{[^}]*\}[\w${}-]*/g)]
  .map((m) => new RegExp(`^${m[0].replace(/\$\{[^}]*\}/g, '[\\w-]+')}$`));
const escape = (name) => name.replace(/[-]/g, '\\$&');
const readDirectly = (name) => new RegExp(`${escape(name)}(?![\\w-])`).test(code) || templates.some((re) => re.test(name));

/** Fermeture par alias : un token lu rend lus les tokens dont il est l'alias. */
function readTokens() {
  const read = new Set([...sysNames, ...componentNames].filter(readDirectly));
  for (let grown = true; grown;) {
    grown = false;
    for (const [from, to] of aliases) if (read.has(from) && !read.has(to)) read.add(to), grown = true;
  }
  return read;
}

describe('aucun token de mouvement sans lecteur (T16)', () => {
  const read = readTokens();
  const all = [...new Set([...sysNames, ...componentNames])];

  test('le contrôle voit les tokens et les sources (garde contre un contrôle vide)', () => {
    assert.ok(all.length > 150, `${all.length} tokens seulement`);
    assert.ok(sources.length > 100, `${sources.length} sources seulement`);
    assert.ok(read.has('--lc-reveal-duration') && read.has('--lc-sys-duration-title') && read.has('--lc-sheet-enter-duration'), 'direct, alias et gabarit doivent être reconnus');
  });

  test('chaque token de mouvement a un lecteur dans le kit (ou une exception écrite)', () => {
    const orphans = all.filter((name) => !read.has(name) && !(name in WITHOUT_READER));
    assert.deepEqual(orphans, [], `sans lecteur : retirer le token (sys, components/motion.tokens.json, thèmes) ou le lire`);
  });

  test('liste d\'exceptions stricte : chaque entrée est un token qui existe et qui n\'a toujours pas de lecteur', () => {
    const stale = Object.keys(WITHOUT_READER).filter((name) => !all.includes(name) || read.has(name));
    assert.deepEqual(stale, [], 'exception périmée : la retirer de WITHOUT_READER');
  });
});

describe('CA-6 : @angular/animations ni importé ni déclaré', () => {
  test('aucun import dans le code du kit ni dans les outils', () => {
    const files = [...readdirSync(root, { withFileTypes: true, recursive: true })]
      .filter((f) => f.isFile() && /\.(ts|mjs|js)$/.test(f.name) && !/\.static\.test\.mjs$/.test(f.name))
      .map((f) => join(f.parentPath, f.name))
      .filter((f) => !/\/(node_modules|dist|graphify-out|\.claude|\.angular|storybook-static)\//.test(f));
    const offenders = files.filter((f) => /from\s+['"]@angular\/animations|import\(['"]@angular\/animations|provide(Noop)?Animations/.test(strip(readFileSync(f, 'utf8')))).map((f) => relative(root, f));
    assert.deepEqual(offenders, []);
  });

  test('ni package.json racine ni packages/angular/package.json ne le déclarent', () => {
    for (const file of ['package.json', 'packages/angular/package.json']) {
      const pkg = JSON.parse(readFileSync(join(root, file), 'utf8'));
      const declared = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].filter((k) => pkg[k]?.['@angular/animations']);
      assert.deepEqual(declared, [], file);
    }
  });
});
