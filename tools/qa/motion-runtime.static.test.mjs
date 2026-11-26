// Acceptation de docs/specs/2026-12-mouvement-v2.md, tâche T2 (§5.1 « Contrat public et interne », §9 « Architecture », CA-19) :
// emplacement et contrat public / @internal du runtime de mouvement, indépendance de `lib/motion/` vis-à-vis des points d'entrée secondaires et du routeur.
// Lancer : node --test tools/qa/motion-runtime.static.test.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const angular = join(root, 'packages/angular');
const lib = join(angular, 'src/lib');
const motion = join(lib, 'motion');
const runtime = join(motion, 'runtime');
const read = (file) => readFileSync(file, 'utf8');
const strip = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const entryPoints = readdirSync(angular, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(angular, d.name, 'ng-package.json')))
  .map((d) => d.name);

const motionSources = () => {
  assert.ok(existsSync(motion), 'packages/angular/src/lib/motion/ n\'existe pas');
  const files = readdirSync(motion, { withFileTypes: true, recursive: true })
    .filter((f) => f.isFile() && f.name.endsWith('.ts') && !/\.(spec|stories)\.ts$|\.stories\./.test(f.name))
    .map((f) => join(f.parentPath, f.name));
  assert.ok(files.length >= 5, 'lib/motion/ doit contenir au moins les fichiers du runtime (le test ne passe pas à vide)');
  return files;
};

/** Spécificateurs de tous les `import … from`, `export … from` et `import()` d'un fichier. */
const specifiers = (file) => {
  const code = strip(read(file));
  return [...code.matchAll(/(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]/g), ...code.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g), ...code.matchAll(/import\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
};

describe('lib/motion/ ne dépend ni d\'un point d\'entrée secondaire ni du routeur', () => {
  test('le runtime existe (le test ne passe pas à vide)', () => {
    assert.ok(motionSources().length >= 5, 'lib/motion/ doit contenir au moins les fichiers du runtime');
  });

  test('aucun import de @lionelcointot/ui-angular/<entrée>, d\'un dossier de point d\'entrée secondaire ni de @angular/router', () => {
    const offenders = [];
    for (const file of motionSources()) {
      for (const spec of specifiers(file)) {
        const where = relative(root, file);
        if (/^@lionelcointot\/ui-angular\//.test(spec)) offenders.push(`${where} : ${spec}`);
        if (/^@angular\/router(\/|$)/.test(spec)) offenders.push(`${where} : ${spec}`);
        if (spec.startsWith('.')) {
          const target = resolve(dirname(file), spec);
          const entry = entryPoints.find((e) => target === join(angular, e) || target.startsWith(join(angular, e) + '/'));
          if (entry) offenders.push(`${where} : ${spec} (point d'entrée ${entry})`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });
});

describe('déménagement et emplacement du runtime (§5.1)', () => {
  const MOVED = ['reduced-motion', 'detach-animated', 'indicator-rect'];
  const NEW = ['motion-tokens', 'animate', 'stagger'];

  test('les fichiers runtime existent dans lib/motion/runtime/', () => {
    for (const name of [...MOVED, ...NEW]) assert.ok(existsSync(join(runtime, `${name}.ts`)), `lib/motion/runtime/${name}.ts absent`);
    assert.ok(existsSync(join(motion, 'index.ts')), 'lib/motion/index.ts absent');
    assert.ok(existsSync(join(motion, 'motion.types.ts')), 'lib/motion/motion.types.ts absent');
  });

  test('les fichiers motion de core/ ont disparu (déplacés, pas dupliqués)', () => {
    for (const name of MOVED) assert.equal(existsSync(join(lib, 'core', `${name}.ts`)), false, `lib/core/${name}.ts existe encore`);
  });
});

describe('contrat public et @internal (§5.1)', () => {
  /** Déclarations exportées d'un fichier, avec le commentaire JSDoc qui les précède. */
  const exportsOf = (file) => {
    const code = read(file);
    return [...code.matchAll(/(\/\*\*[\s\S]*?\*\/\s*)?^export\s+(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(?:function|const|class|interface|type|enum)\s+(\w+)/gm)]
      .map((m) => ({ name: m[2], doc: m[1] ?? '' }));
  };

  test('les outils du runtime sont exportés avec @internal', () => {
    for (const name of ['motion-tokens', 'stagger', 'reduced-motion', 'detach-animated', 'indicator-rect']) {
      const file = join(runtime, `${name}.ts`);
      assert.ok(existsSync(file), `lib/motion/runtime/${name}.ts absent`);
      const declared = exportsOf(file);
      assert.ok(declared.length > 0, `${name}.ts n'exporte rien`);
      for (const { name: symbol, doc } of declared) assert.match(doc, /@internal/, `${name}.ts : \`${symbol}\` doit porter @internal`);
    }
  });

  test('lcAnimate est public : exporté par animate.ts sans @internal, puis par lib/motion/index.ts', () => {
    const file = join(runtime, 'animate.ts');
    assert.ok(existsSync(file), 'lib/motion/runtime/animate.ts absent');
    const lcAnimate = exportsOf(file).find((e) => e.name === 'lcAnimate');
    assert.ok(lcAnimate, 'animate.ts doit exporter lcAnimate');
    assert.doesNotMatch(lcAnimate.doc, /@internal/, 'lcAnimate est public');
    assert.match(strip(read(join(motion, 'index.ts'))), /from\s*['"]\.\/runtime\/animate['"]/, 'index.ts doit réexporter animate');
  });

  test('les types de rôles LcMotionDuration et LcMotionEasing sont exportés par motion.types.ts et par index.ts', () => {
    const names = exportsOf(join(motion, 'motion.types.ts')).map((e) => e.name);
    for (const type of ['LcMotionDuration', 'LcMotionEasing']) assert.ok(names.includes(type), `motion.types.ts doit exporter ${type}`);
    assert.match(strip(read(join(motion, 'index.ts'))), /from\s*['"]\.\/motion\.types['"]/, 'index.ts doit réexporter motion.types');
  });

  test('public-api.ts exporte lib/motion et le registre de navigation, qui exporte LcNavRegistry', () => {
    const api = strip(read(join(angular, 'src/public-api.ts')));
    assert.match(api, /export\s*\*\s*from\s*['"]\.\/lib\/motion['"]/, 'public-api.ts : export * from \'./lib/motion\'');
    assert.match(api, /export\s*\*\s*from\s*['"]\.\/lib\/navigation-registry['"]/, 'public-api.ts : export * from \'./lib/navigation-registry\'');
    const registry = join(lib, 'navigation-registry.ts');
    assert.ok(existsSync(registry), 'lib/navigation-registry.ts absent');
    assert.ok(exportsOf(registry).some((e) => e.name === 'LcNavRegistry'), 'navigation-registry.ts doit exporter LcNavRegistry');
  });

  test('les anciens chemins de core/ ne sont plus exportés par public-api.ts', () => {
    const api = strip(read(join(angular, 'src/public-api.ts')));
    for (const name of ['reduced-motion', 'detach-animated', 'indicator-rect']) assert.doesNotMatch(api, new RegExp(`lib/core/${name}`), `public-api.ts exporte encore lib/core/${name}`);
  });
});
