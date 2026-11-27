// Couche des jauges : délai nul hors entrée de page, ajouté à celui de lcFill / lcDraw.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('../../packages/angular/styles/motion.css', import.meta.url), 'utf8');

test('lcFill et lcDraw lisent --lc-layer-gauges, nul par défaut', () => {
  assert.match(css, /--lc-fill-transition:[^;]*var\(--lc-layer-gauges, 0ms\)/);
  assert.match(css, /\.lc-draw \{[^}]*transition:[^;]*var\(--lc-layer-gauges, 0ms\)/);
});

test('--lc-layer-gauges n\'est posée que dans .lc-page--entering, sous mouvement non réduit', () => {
  const sets = [...css.matchAll(/--lc-layer-gauges:/g)];
  assert.equal(sets.length, 1);
  const block = /@media \(prefers-reduced-motion: no-preference\) \{\s*\.lc-page--entering \{[^}]*--lc-layer-gauges: var\(--lc-page-layer-gauges\)/.test(css);
  assert.ok(block);
});
