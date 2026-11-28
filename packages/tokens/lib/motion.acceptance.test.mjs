// Acceptation de docs/specs/2026-11-mouvement.md : CA-1 (tokens de 5.2), côté tokens de CA-24 et délais de CA-13.
import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCss, resolve, tokenMap, toMs } from './motion-css.mjs';

let css;
before(() => { css = buildCss(); });

const decl = (file, name) => css[file].match(new RegExp(`^\\s*${name}: ([^;]+);`, 'm'))?.[1];

// Mouvement v2 (docs/specs/2026-12-mouvement-v2.md, T1, CA-1) : valeurs réécrites ; les rôles et tokens nouveaux sont dans motion.v2.acceptance.test.mjs.
// CA-1 : tokens ref (valeurs) et sys (repli sur ref), dans les deux thèmes
for (const theme of ['theme-default', 'theme-dark']) {
  test(`CA-1 : duration-long vaut 600 ms, motion-stagger (feuille) n'existe plus (${theme} : sys)`, () => {
    assert.equal(decl('lc-tokens', '--lc-ref-duration-long'), '600ms');
    assert.equal(decl(theme, '--lc-sys-duration-long'), 'var(--lc-ref-duration-long)');
    assert.equal(decl('lc-tokens', '--lc-ref-motion-stagger'), undefined);
    assert.equal(decl(theme, '--lc-sys-motion-stagger'), undefined);
  });

  test(`CA-1 : les durées revalorisées fast 150, normal 250 (${theme} : sys)`, () => {
    assert.equal(decl('lc-tokens', '--lc-ref-duration-fast'), '150ms');
    assert.equal(decl('lc-tokens', '--lc-ref-duration-normal'), '250ms');
    for (const role of ['fast', 'normal']) assert.equal(decl(theme, `--lc-sys-duration-${role}`), `var(--lc-ref-duration-${role})`);
  });

  test(`CA-1 : motion-offset (feuille) n'existe plus, space-2 inchangé (${theme} : sys)`, () => {
    assert.equal(decl(theme, '--lc-sys-space-2'), 'var(--lc-ref-space-2)');
    assert.equal(decl('lc-tokens', '--lc-ref-space-2'), '8px');
    assert.equal(decl(theme, '--lc-sys-motion-offset'), undefined);
  });

  test(`CA-1 : easing standard et emphasized inchangés (${theme} : sys)`, () => {
    assert.equal(decl('lc-tokens', '--lc-ref-easing-standard'), 'cubic-bezier(0.2, 0, 0, 1)');
    assert.equal(decl('lc-tokens', '--lc-ref-easing-emphasized'), 'cubic-bezier(0.3, 0, 0, 1)');
    assert.equal(decl(theme, '--lc-sys-easing-standard'), 'var(--lc-ref-easing-standard)');
    assert.equal(decl(theme, '--lc-sys-easing-emphasized'), 'var(--lc-ref-easing-emphasized)');
  });
}

// CA-1 : tokens de composant avec repli sur sys
// Mouvement v2 : les indicateurs (tabs, nav-item, segmented-control) ont deux bords et la liste glisse en 420 ms `draw` (valeurs dans
// motion.v2.acceptance.test.mjs, par groupe) ; `reveal.*` n'est plus listé par §5.2 (lcReveal lit les rôles sys) ; la durée d'appui du bouton est
// découplée de duration-fast ; le décalage de overlay n'a plus de rôle `motion-offset` (offset-sm, 8 px, garde sa valeur).
const COMPONENT_TOKENS = {
  '--lc-list-move-easing': 'easing-draw',
  '--lc-overlay-enter-duration': 'duration-normal',
  '--lc-overlay-exit-duration': 'duration-fast',
  '--lc-overlay-easing': 'easing-standard',
  '--lc-chip-enter-duration': 'duration-fast',
};
for (const [name, sys] of Object.entries(COMPONENT_TOKENS)) {
  test(`CA-1 : ${name} se replie sur sys-${sys}`, () => {
    assert.equal(decl('lc-tokens', name), `var(--lc-sys-${sys})`);
  });
}

test('CA-1 : --lc-list-move-duration vaut 420 ms, sans passer par les anciens rôles', () => {
  const map = tokenMap(css, 'default');
  assert.equal(toMs(resolve(map, '--lc-list-move-duration').value), 420);
});

// CA-24 : durée de déplacement 500 ms, courbe easing-standard ; plus de token easing-spring
for (const theme of ['theme-default', 'theme-dark']) {
  test(`CA-24 : duration-move 500ms (${theme} : sys) et aucun easing-spring`, () => {
    assert.equal(decl('lc-tokens', '--lc-ref-duration-move'), '500ms');
    assert.equal(decl(theme, '--lc-sys-duration-move'), 'var(--lc-ref-duration-move)');
    assert.equal(decl(theme, '--lc-sys-easing-spring'), undefined);
  });
}

test('CA-24 : --lc-ref-easing-spring n\'existe plus', () => {
  assert.equal(decl('lc-tokens', '--lc-ref-easing-spring'), undefined);
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
