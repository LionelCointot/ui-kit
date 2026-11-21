// Acceptation de docs/specs/2026-11-mouvement.md : CA-1 (tokens de 5.2), côté tokens de CA-24 et délais de CA-13.
import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './tokens.mjs';

const css = {};
before(() => {
  execFileSync(process.execPath, [path.join(PACKAGE_ROOT, 'lib', 'build-all.mjs')], { stdio: 'pipe' });
  for (const f of ['lc-tokens', 'theme-default', 'theme-dark', 'base']) css[f] = readFileSync(path.join(PACKAGE_ROOT, 'dist', 'css', `${f}.css`), 'utf8');
});

const decl = (file, name) => css[file].match(new RegExp(`^\\s*${name}: ([^;]+);`, 'm'))?.[1];

// CA-1 : nouveaux tokens ref (valeurs) et sys (repli sur ref), dans les deux thèmes
for (const theme of ['theme-default', 'theme-dark']) {
  test(`CA-1 : tokens duration-long et motion-stagger (${theme} : sys)`, () => {
    assert.equal(decl('lc-tokens', '--lc-ref-duration-long'), '350ms');
    assert.equal(decl(theme, '--lc-sys-duration-long'), 'var(--lc-ref-duration-long)');
    assert.equal(decl('lc-tokens', '--lc-ref-motion-stagger'), '80ms');
    assert.equal(decl(theme, '--lc-sys-motion-stagger'), 'var(--lc-ref-motion-stagger)');
  });

  test(`CA-1 : motion-offset vaut space-2 (${theme} : sys)`, () => {
    assert.equal(decl(theme, '--lc-sys-space-2'), 'var(--lc-ref-space-2)');
    assert.equal(decl('lc-tokens', '--lc-ref-space-2'), '8px');
    assert.equal(decl(theme, '--lc-sys-motion-offset'), 'var(--lc-sys-space-2)');
  });

  test(`CA-1 : easing standard et emphasized inchangés (${theme} : sys)`, () => {
    assert.equal(decl('lc-tokens', '--lc-ref-easing-standard'), 'cubic-bezier(0.2, 0, 0, 1)');
    assert.equal(decl('lc-tokens', '--lc-ref-easing-emphasized'), 'cubic-bezier(0.3, 0, 0, 1)');
    assert.equal(decl(theme, '--lc-sys-easing-standard'), 'var(--lc-ref-easing-standard)');
    assert.equal(decl(theme, '--lc-sys-easing-emphasized'), 'var(--lc-ref-easing-emphasized)');
  });
}

// CA-1 : tokens de composant avec repli sur sys
const COMPONENT_TOKENS = {
  // Décision 27 : les déplacements (indicateurs, lignes) passent au ressort de 500 ms.
  '--lc-tabs-indicator-duration': 'duration-move',
  '--lc-tabs-indicator-easing': 'easing-spring',
  '--lc-nav-item-indicator-duration': 'duration-move',
  '--lc-nav-item-indicator-easing': 'easing-spring',
  '--lc-list-move-duration': 'duration-move',
  '--lc-list-move-easing': 'easing-spring',
  '--lc-button-press-duration': 'duration-fast',
  '--lc-overlay-enter-duration': 'duration-normal',
  '--lc-overlay-exit-duration': 'duration-fast',
  '--lc-overlay-easing': 'easing-standard',
  '--lc-overlay-offset': 'motion-offset',
  '--lc-chip-enter-duration': 'duration-fast',
  '--lc-reveal-duration': 'duration-long',
  '--lc-reveal-easing': 'easing-standard',
  '--lc-reveal-offset': 'motion-offset',
  '--lc-reveal-stagger': 'motion-stagger',
};
for (const [name, sys] of Object.entries(COMPONENT_TOKENS)) {
  test(`CA-1 : ${name} se replie sur sys-${sys}`, () => {
    assert.equal(decl('lc-tokens', name), `var(--lc-sys-${sys})`);
  });
}

// CA-24 : ressort sans rebond (valeurs croissantes de 0 à 1, aucune > 1) et durée de déplacement 500 ms, dans les deux thèmes
for (const theme of ['theme-default', 'theme-dark']) {
  test(`CA-24 : duration-move 500ms et easing-spring (${theme} : sys)`, () => {
    assert.equal(decl('lc-tokens', '--lc-ref-duration-move'), '500ms');
    assert.equal(decl(theme, '--lc-sys-duration-move'), 'var(--lc-ref-duration-move)');
    assert.equal(decl(theme, '--lc-sys-easing-spring'), 'var(--lc-ref-easing-spring)');
  });
}

test('CA-24 : --lc-ref-easing-spring est un linear() croissant de 0 à 1, sans valeur > 1', () => {
  const body = decl('lc-tokens', '--lc-ref-easing-spring')?.match(/^linear\((.+)\)$/)?.[1];
  assert.ok(body, 'linear(…) attendu');
  const values = body.split(',').map((v) => Number(v.trim()));
  assert.ok(values.length >= 10 && values.every(Number.isFinite), 'valeurs numériques seulement');
  assert.equal(values[0], 0);
  assert.equal(values.at(-1), 1);
  assert.ok(values.every((v, i) => v <= 1 && (i === 0 || v >= values[i - 1])), 'monotone croissant, ≤ 1');
  // Décision 27 : amortissement critique x(t) = 1 − (1 + ωt)·e^(−ωt), ω = 8, t normalisé (calcul indépendant du code).
  values.forEach((v, i) => {
    const t = i / (values.length - 1);
    assert.ok(Math.abs(v - (1 - (1 + 8 * t) * Math.exp(-8 * t))) < 0.005, `point ${i} : ${v}`);
  });
});

test('CA-1 : --lc-button-press-scale vaut 0.97', () => {
  assert.equal(decl('lc-tokens', '--lc-button-press-scale'), '0.97');
});

// CA-13 (partie délais) : la réduction des animations annule aussi les délais
test('CA-13 : la règle prefers-reduced-motion de base.css met les délais à 0s !important', () => {
  const rule = css.base.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(rule, /transition-delay: 0s !important;/);
  assert.match(rule, /animation-delay: 0s !important;/);
});
