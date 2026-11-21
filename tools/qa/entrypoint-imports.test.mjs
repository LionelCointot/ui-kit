// CA-P7 : les imports `@lionelcointot/ui-angular/<x>` d'un point d'entrée secondaire (hors stories et tests)
// sont limités aux exceptions listées dans CLAUDE.md (« À ne pas faire »). Lancer : node --test tools/qa/entrypoint-imports.test.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const angular = join(root, 'packages/angular');

const entryPoints = readdirSync(angular, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(angular, d.name, 'ng-package.json')))
  .map((d) => d.name);

/** Exceptions autorisées, lues dans la ligne « Ne pas importer un point d'entrée secondaire depuis un autre » de CLAUDE.md. */
function allowedPairs() {
  const line = readFileSync(join(root, 'CLAUDE.md'), 'utf8').split('\n').find((l) => l.includes("Ne pas importer un point d'entrée secondaire"));
  assert.ok(line, "ligne « Ne pas importer un point d'entrée secondaire » introuvable dans CLAUDE.md");
  const pairs = new Set();
  for (const [, from, targets] of line.matchAll(/`([\w-]+)`\s*→\s*((?:`[\w-]+`(?:,\s*)?)+)/g)) {
    for (const [, to] of targets.matchAll(/`([\w-]+)`/g)) pairs.add(`${from}→${to}`);
  }
  return pairs;
}

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((f) => f.isFile() && /\.ts$/.test(f.name) && !/\.(spec|stories)\.ts$|\.stories\./.test(f.name))
    .map((f) => join(f.parentPath, f.name));
}

/** Entrées secondaires importées par un fichier (commentaires retirés ; `export … from` et `import(…)` compris). */
function importedEntryPoints(file) {
  const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found = new Set();
  for (const m of code.matchAll(/(?:import|export)\s[^;]*?from\s*['"]@lionelcointot\/ui-angular\/([\w-]+)['"]/g)) found.add(m[1]);
  for (const m of code.matchAll(/import\(\s*['"]@lionelcointot\/ui-angular\/([\w-]+)['"]\s*\)/g)) found.add(m[1]);
  return found;
}

test('CA-P7 : imports entre points d\'entrée secondaires = exceptions de CLAUDE.md', () => {
  const allowed = allowedPairs();
  const used = new Set();
  for (const from of entryPoints) {
    for (const file of sourceFiles(join(angular, from))) {
      for (const to of importedEntryPoints(file)) if (to !== from) used.add(`${from}→${to}`);
    }
  }
  assert.deepEqual([...used].filter((p) => !allowed.has(p)).sort(), [], 'import entre points d\'entrée non listé dans CLAUDE.md');
  assert.ok(allowed.has('data→forms'), 'CLAUDE.md doit inscrire l\'exception `data` → `forms`');
  assert.ok(used.has('data→forms'), 'data importe forms (le filtre de période utilise lc-date-range-input)');
});
