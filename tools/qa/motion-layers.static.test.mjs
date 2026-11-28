// T10b (docs/specs/2026-12-mouvement-v2.md, CA-40, partie statique) : couches de l'entrée de page et variante `card`.
// Lancer : node --test tools/qa/motion-layers.static.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const read = (file) => readFileSync(join(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const css = read('packages/angular/styles/motion.css');
const tokens = JSON.parse(readFileSync(join(root, 'packages/tokens/src/components/motion.tokens.json'), 'utf8'));

describe('couches de l\'entrée de page (CA-40)', () => {
  test('délais des tokens : KPI 100, cartes 120, lignes 400, jauges 500 (rôle move), points 800 ms', () => {
    const page = tokens.page;
    assert.deepEqual(['kpi', 'cards', 'rows', 'gauges', 'dots'].map((l) => page[`layer-${l}`].$value), ['100ms', '120ms', '400ms', '{sys.duration.move}', '800ms']);
    assert.ok(page['layer-window'].$value);
  });

  test('les variables --lc-layer-* ne sont définies que sous .lc-page--entering, hors mouvement réduit', () => {
    const defs = [...css.matchAll(/(?<![\w-])--lc-layer-(\w+)\s*:/g)];
    assert.equal(defs.length, 5);
    const media = css.match(/@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.lc-page--entering\s*\{([^}]*)\}/);
    assert.ok(media, 'bloc .lc-page--entering absent ou hors @media no-preference');
    for (const [, name] of defs) assert.match(media[1], new RegExp(`--lc-layer-${name}: var\\(--lc-page-layer-${name}\\)`));
  });

  test('lcFill et lcDraw lisent --lc-layer-gauges, nul par défaut', () => {
    assert.match(css, /--lc-fill-transition:[^;]*var\(--lc-layer-gauges, 0ms\)/);
    assert.match(css, /\.lc-draw \{[^}]*transition:[^;]*var\(--lc-layer-gauges, 0ms\)/);
  });

  test('l\'animation de .lc-reveal ajoute --lc-layer (non hérité) au délai', () => {
    assert.match(css, /@property --lc-layer\s*\{[^}]*inherits: false/);
    assert.match(css, /animation-delay: calc\(\s*var\(--lc-layer\)/);
  });

  test('les composants déclarent leur couche (lignes, cartes, indicateurs)', () => {
    for (const file of ['data/src/activity-feed/activity-item.component.css', 'data/src/tree-table/tree-table.component.css', 'data/src/description-list/description-list.component.css', 'data/src/data-table/data-table.component.css']) {
      assert.match(read(`packages/angular/${file}`), /--lc-layer: var\(--lc-layer-rows\)/, file);
    }
    assert.match(css, /\.lc-reveal--card\s*\{[^}]*--lc-layer: var\(--lc-layer-cards\)/);
    assert.match(css, /\.lc-reveal--tilt\s*\{[^}]*--lc-layer: var\(--lc-layer-kpi\)/);
  });
});

describe('variante card (CA-40)', () => {
  test('26 px (offset-lg), échelle et durée des tokens reveal.card-*, rythme cards', () => {
    const rule = css.match(/\.lc-reveal--card\s*\{([^}]*)\}/)[1];
    assert.match(rule, /--lc-reveal-y: var\(--lc-sys-motion-offset-lg\)/);
    assert.match(rule, /--lc-reveal-scale: var\(--lc-reveal-card-scale\)/);
    assert.match(rule, /--lc-reveal-time: var\(--lc-reveal-card-duration\)/);
    assert.match(rule, /--lc-reveal-pace: var\(--lc-sys-motion-stagger-cards\)/);
    const card = tokens.reveal;
    assert.deepEqual([card['card-duration'].$value, card['card-scale'].$value, card['card-easing'].$value], ['800ms', '0.985', '{sys.easing.entrance}']);
  });
});

describe('variante tilt : rythme propre', () => {
  test('--lc-reveal-pace lit reveal.tilt-pace (70 ms), pas le rythme des cartes ; lcStagger garde la priorité', () => {
    assert.match(css.match(/\.lc-reveal--tilt\s*\{([^}]*)\}/)[1], /--lc-reveal-pace: var\(--lc-reveal-tilt-pace\)/);
    assert.equal(tokens.reveal['tilt-pace'].$value, '70ms');
    assert.match(css, /var\(--lc-stagger-pace, var\(--lc-reveal-pace,/);
  });
});

describe('lc-page et lcPageTransitions sur le même élément (CA-40)', () => {
  test('la fenêtre d\'entrée n\'anime qu\'une variable : aucune propriété CSS visible en conflit', () => {
    const rule = css.match(/@keyframes lc-page-entering\s*\{([^}]*\{[^}]*\})\s*\}/)[1];
    assert.match(rule, /--lc-page-entering-tick/);
    assert.doesNotMatch(rule, /\b(opacity|translate|scale|rotate|transform)\b/);
  });

  test('lcPageTransitions anime par WAAPI (lcAnimate) sans écrire la propriété `animation` de la page', () => {
    const code = read('packages/angular/layout/src/page-transitions/page-transitions.directive.ts');
    assert.match(code, /lcAnimate\(/);
    assert.doesNotMatch(code, /setProperty\(\s*['"]animation|\.style\.animation|\[style\.animation\]/);
  });

  test('aucune feuille de composant ne pose `animation` sur l\'hôte de lc-page', () => {
    assert.doesNotMatch(read('packages/angular/layout/src/page/page.component.css').replace(/\.lc-page__line\s*\{[^}]*\}/g, '').replace(/@media[^{]*\{[^}]*\{[^}]*\}\s*\}/g, ''), /animation\s*:/);
  });
});
