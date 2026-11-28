// docs/specs/2026-12-relief.md, CA-8 (statique) : chaque jeton du §5.2 a un lecteur, aucune couleur ni taille en dur dans les feuilles de lc-card et lc-kpi-card.
// Les surcharges calculées (jetons de lc-kpi-card, card.line-color) sont prouvées en navigateur : tools/qa/relief-browser.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { resolvedTokens } from '../../packages/tokens/lib/tokens.mjs';

const root = resolve(import.meta.dirname, '../..');
const css = (file) => readFileSync(join(root, 'packages/angular', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const card = css('layout/src/card/card.component.css');
const kpi = css('data/src/kpi-card/kpi-card.component.css');
const shell = css('layout/src/app-shell/app-shell.component.css');
const tokenJson = ['card', 'shell'].map((n) => readFileSync(join(root, `packages/tokens/src/components/${n}.tokens.json`), 'utf8')).join('');

test('CA-8 : les jetons de composant du §5.2 existent dans les deux thèmes et sont lus par leur feuille', async () => {
  for (const theme of ['default', 'dark']) {
    const tokens = await resolvedTokens(theme);
    for (const name of ['sys.color.line', 'sys.radius.xl', 'card.line-color', 'shell.content-background']) assert.ok(tokens.has(name), `${theme} : ${name} absent`);
  }
  assert.match(card, /--lc-card-line-color/, 'lc-card ne lit pas --lc-card-line-color');
  assert.match(shell, /--lc-shell-content-background/, 'lc-app-shell ne lit pas --lc-shell-content-background');
});

test('CA-8 : sys.color.line et sys.radius.xl ont un lecteur (feuille ou alias de jeton de composant)', () => {
  const read = (name, alias) => [card, kpi, shell].some((c) => c.includes(`--lc-sys-${name}`)) || tokenJson.includes(`{sys.${alias}}`);
  assert.ok(read('color-line', 'color.line'), 'sys.color.line sans lecteur');
  assert.ok(read('radius-xl', 'radius.xl'), 'sys.radius.xl sans lecteur');
});

test('CA-8 : lc-kpi-card lit chacun de ses jetons de style, avec repli sur sys', () => {
  for (const name of ['shadow', 'border-color', 'radius', 'background', 'color', 'label-color', 'label-weight', 'value-weight', 'value-letter-spacing']) {
    assert.match(kpi, new RegExp(`var\\(--lc-kpi-card-${name}\\s*,`), `--lc-kpi-card-${name} non lu avec repli`);
  }
});

test('CA-8 : aucune couleur ni taille en dur dans lc-card et lc-kpi-card (le filet 1px et la cible 44px exceptés)', () => {
  for (const [name, sheet] of [['card', card], ['kpi-card', kpi]]) {
    const code = sheet.replace(/@(media|container)[^{]*/g, '');
    assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch|color-mix)\(/i, `${name} : couleur en dur`);
    assert.doesNotMatch(code, /(?<![\w.-])(?!1px\b|44px\b)\d*\.?\d+(px|rem|em)\b/, `${name} : taille en dur`);
  }
});
