// Acceptation de docs/specs/2026-12-mouvement-v2.md, tâche T3 : CA-7 (partie statique), contrat public de lcReveal / lcStagger (§5.1, §5.3), migration de data-table.
// Lancer : node --test tools/qa/motion-reveal.static.test.mjs
// Reporté à T7 : « `staggerDelay` et `lcCssMs` n'existent qu'une fois » (CA-7, partie runtime) : constaté ici en information, jamais bloquant pour T3.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const angular = join(root, 'packages/angular');
const read = (file) => readFileSync(file, 'utf8');
const strip = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const sources = (dir, extensions) => readdirSync(dir, { withFileTypes: true, recursive: true })
  .filter((f) => f.isFile() && extensions.some((e) => f.name.endsWith(e)) && !/\.(spec|stories)\.ts$|\.stories\.|\.d\.ts$/.test(f.name))
  .map((f) => join(f.parentPath, f.name))
  .filter((f) => !/\/(node_modules|dist)\//.test(f));

describe('ancien bloc [lcReveal] retiré, motion.css en place (CA-7, §5.1)', () => {
  const sheet = join(angular, 'styles/ui-angular.css');
  const motion = join(angular, 'styles/motion.css');

  test('ui-angular.css ne contient plus de règle [lcReveal] ni de jeton --lc-reveal-*', () => {
    const css = strip(read(sheet));
    assert.doesNotMatch(css, /\[lcReveal\]/i, 'le sélecteur [lcReveal] existe encore dans ui-angular.css');
    assert.doesNotMatch(css, /--lc-reveal-/, 'un jeton --lc-reveal-* est encore lu par ui-angular.css');
  });

  test('ui-angular.css importe motion.css', () => {
    assert.match(strip(read(sheet)), /@import\s+(url\()?['"]?\.?\/?motion\.css['"]?\)?/, '@import "motion.css" absent de ui-angular.css');
  });

  test('motion.css porte lc-reveal-in, .lc-reveal et .lc-leave, avec .lc-leave après .lc-reveal', () => {
    assert.ok(existsSync(motion), 'packages/angular/styles/motion.css absent');
    const css = strip(read(motion));
    assert.match(css, /@keyframes\s+lc-reveal-in\b/, '@keyframes lc-reveal-in absent');
    const reveal = css.search(/\.lc-reveal\b(?!-)/);
    const leave = css.search(/\.lc-leave\b/);
    assert.ok(reveal >= 0, 'règle .lc-reveal absente');
    assert.ok(leave >= 0, 'règle .lc-leave absente');
    assert.ok(leave > reveal, '.lc-leave doit venir après .lc-reveal dans la feuille (essai 1)');
  });

  test('motion.css : durées, courbes et distances viennent des tokens sys, aucune valeur en dur', () => {
    assert.ok(existsSync(motion), 'packages/angular/styles/motion.css absent');
    const css = strip(read(motion));
    assert.doesNotMatch(css, /cubic-bezier\(/, 'une courbe en dur apparaît dans motion.css');
    assert.match(css, /--lc-sys-duration-enter/, 'la durée d\'entrée doit lire --lc-sys-duration-enter');
    assert.match(css, /--lc-sys-easing-entrance/, 'la courbe d\'entrée doit lire --lc-sys-easing-entrance');
    assert.match(css, /--lc-sys-duration-exit/, 'la durée de sortie doit lire --lc-sys-duration-exit');
    assert.match(css, /--lc-sys-motion-stagger-cap/, 'le plafond de rang doit lire --lc-sys-motion-stagger-cap');
  });
});

describe('@keyframes, .animate( et getAnimations hors des emplacements autorisés (CA-7, CA-5 d\'architecture)', () => {
  const ALLOWED_DIRS = ['src/lib/motion/', 'styles/motion.css'];
  /** Liste blanche écrite : composants existants avant T3, avec la raison et la tâche qui les migre (une entrée en trop ne fait jamais échouer le test). Toute autre occurrence est un échec. */
  const KEYFRAMES = {
    'src/lib/skeleton/skeleton.component.css': ['lc-skeleton-pulse'], // boucle de chargement, hors périmètre des primitives
    'src/lib/spinner/spinner.component.css': ['lc-spinner-spin', 'lc-spinner-pulse'], // boucle de chargement
    'src/lib/button/button.component.css': ['lc-button-spin'], // bouton en chargement
    'navigation/src/stepper/stepper.component.css': ['lc-stepper-sync'], // refait par T4
    'feedback/src/progress-bar/progress-bar.component.css': ['lc-progress-slide'], // bande indéterminée, gardée
    'forms/src/message-composer/message-composer.component.css': ['lc-message-composer-spin', 'lc-message-composer-slide', 'lc-message-composer-shake'], // composant existant, migré en T4
    'forms/src/file-upload/file-upload.component.css': ['lc-file-upload-slide'], // bande indéterminée, gardée
    'data/src/data-table/column-filter.component.css': ['lc-column-filter-spin'], // indicateur de chargement
    'styles/ui-angular.css': ['lc-dialog-enter', 'lc-drawer-in-end', 'lc-drawer-in-start', 'lc-overlay-enter', 'lc-calendar-fade', 'lc-truncate-scroll'], // panneaux et truncate : migrés par T9, T12
  };
  const WAAPI = {
    'feedback/src/message-thread/message-thread.component.ts': 'FLIP du fil, repris par T7',
    'data/src/data-table/data-table.component.ts': 'FLIP du tableau, repris par T7',
  };

  test('aucun @keyframes hors lib/motion/, motion.css et la liste blanche', () => {
    const offenders = [];
    for (const file of sources(angular, ['.css'])) {
      const where = relative(angular, file);
      if (ALLOWED_DIRS.some((d) => where.includes(d))) continue;
      for (const m of strip(read(file)).matchAll(/@keyframes\s+([\w-]+)/g)) {
        if (!(KEYFRAMES[where] ?? []).includes(m[1])) offenders.push(`${where} : @keyframes ${m[1]}`);
      }
    }
    assert.deepEqual(offenders, []);
  });

  test('aucun .animate( ni getAnimations hors lib/motion/ et la liste blanche', () => {
    const offenders = [];
    for (const file of sources(angular, ['.ts'])) {
      const where = relative(angular, file);
      if (ALLOWED_DIRS.some((d) => where.includes(d)) || where in WAAPI) continue;
      const code = strip(read(file));
      if (/\.animate\(|getAnimations/.test(code)) offenders.push(where);
    }
    assert.deepEqual(offenders, []);
  });

  test('les keyframes de l\'entrée vivent dans motion.css, pas dans un composant', () => {
    const where = (n) => sources(angular, ['.css']).filter((f) => new RegExp(`@keyframes\\s+${n}\\b`).test(strip(read(f)))).map((f) => relative(angular, f));
    assert.deepEqual(where('lc-reveal-in'), ['styles/motion.css']);
  });
});

describe('contrat public de lcReveal et lcStagger (§5.3)', () => {
  const dir = join(angular, 'src/lib/motion/directives');
  const file = (name) => join(dir, name);

  test('les directives existent et sont exportées par public-api.ts', () => {
    assert.ok(existsSync(file('reveal.directive.ts')), 'lib/motion/directives/reveal.directive.ts absent');
    assert.ok(existsSync(file('stagger.directive.ts')), 'lib/motion/directives/stagger.directive.ts absent');
    const index = strip(read(join(angular, 'src/lib/motion/index.ts')));
    assert.match(index, /directives\/reveal\.directive/, 'index.ts doit réexporter reveal.directive');
    assert.match(index, /directives\/stagger\.directive/, 'index.ts doit réexporter stagger.directive');
  });

  test('sélecteurs, entrées et sortie déclarés par la spec', () => {
    const reveal = strip(read(file('reveal.directive.ts')));
    assert.match(reveal, /selector:\s*['"]\[lcReveal\]['"]/);
    assert.match(reveal, /lcRevealIndex/);
    assert.match(reveal, /animate\.leave['"]?\s*:\s*['"]lc-leave['"]/, 'host : animate.leave: \'lc-leave\'');
    assert.match(reveal, /lc-reveal-in/, 'la classe est retirée à animationend de lc-reveal-in');
    for (const variant of ['rise', 'drop', 'fade', 'scale', 'pop', 'left', 'right', 'tilt']) assert.match(reveal, new RegExp(`['"]${variant}['"]`), `variante ${variant} absente du type LcRevealVariant`);
    const stagger = strip(read(file('stagger.directive.ts')));
    assert.match(stagger, /selector:\s*['"]\[lcStagger\]['"]/);
    for (const pace of ['fine', 'normal', 'cards']) assert.match(stagger, new RegExp(`['"]${pace}['"]`), `rythme ${pace} absent du type LcStaggerPace`);
  });

  test('les quatre noms publics sont exportés', () => {
    const code = strip(read(file('reveal.directive.ts'))) + strip(read(file('stagger.directive.ts')));
    for (const name of ['LcRevealDirective', 'LcRevealVariant', 'LcStaggerDirective', 'LcStaggerPace']) assert.match(code, new RegExp(`export\\s+(class|type)\\s+${name}\\b`), `${name} non exporté`);
  });
});

describe('migration de data-table et des stories (§11, T3)', () => {
  test('plus aucun [attr.lcReveal] ni --lc-reveal-index dans les gabarits, composants et stories', () => {
    const offenders = [];
    for (const f of sources(join(angular), ['.html', '.ts'])) {
      if (/\[attr\.lcReveal\]|--lc-reveal-index/i.test(strip(read(f)))) offenders.push(relative(angular, f));
    }
    for (const f of [join(root, 'docs/storybook/foundations/foundation-pages.ts'), join(angular, 'forms/src/stories/motion.acceptance.qa.stories.ts')]) {
      if (existsSync(f) && /\[attr\.lcReveal\]|--lc-reveal-index/.test(read(f))) offenders.push(relative(root, f));
    }
    assert.deepEqual(offenders, []);
  });

  test('data-table importe LcRevealDirective (la cascade des cartes passe par la directive)', () => {
    const ts = strip(read(join(angular, 'data/src/data-table/data-table.component.ts')));
    assert.match(ts, /LcRevealDirective/, 'data-table.component.ts n\'importe pas LcRevealDirective');
  });
});

describe('information : doublons de runtime (reporté à T7)', () => {
  test('staggerDelay et lcCssMs : nombre de définitions (information)', () => {
    const count = (name) => sources(angular, ['.ts']).filter((f) => new RegExp(`(function|const)\\s+${name}\\b`).test(strip(read(f)))).length;
    console.log(`INFO CA-7 (T7) : staggerDelay défini ${count('staggerDelay')} fois, lcCssMs défini ${count('lcCssMs')} fois (attendu 1 chacun à la fin de T7)`);
  });
});
