// CA-S0, CA-S8, CA-R2 (docs/specs/2026-11-mouvement-ios.md) : contrôles statiques de lc-sheet et des jetons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './tokens.mjs';

const ng = path.resolve(PACKAGE_ROOT, '..', 'angular');
const read = (f) => (existsSync(path.join(ng, f)) ? readFileSync(path.join(ng, f), 'utf8') : '');

test('CA-S0 : lc-sheet exporté par overlay, sans import interdit', () => {
  assert.match(read('overlay/src/public-api.ts'), /sheet\/sheet\.component/, 'lc-sheet non exporté (en attente du code)');
  const dir = path.join(ng, 'overlay/src/sheet');
  const src = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.ts') && !/\.(spec|stories)\.ts$/.test(f)).map((f) => readFileSync(path.join(dir, f), 'utf8')).join('\n') : '';
  assert.ok(src.includes('lc-sheet'), 'composant absent (en attente du code)');
  assert.deepEqual(src.match(/@lionelcointot\/ui-angular\/(forms|data|navigation|feedback|layout|charts|geo|theme-builder)/g) ?? [], []);
});

test('CA-S0 : stories Overlays/Sheet (Playground, Animation) et catalogue', () => {
  const dir = path.join(ng, 'overlay/src/stories');
  const f = readdirSync(dir).find((n) => /sheet.*\.stories\.ts$/.test(n) && !n.includes('.qa.'));
  const s = f ? readFileSync(path.join(dir, f), 'utf8') : '';
  assert.match(s, /title:\s*'Overlays\/Sheet'/); assert.match(s, /export const Playground/); assert.match(s, /export const Animation/);
  assert.match(readFileSync(path.join(ng, 'CATALOGUE.md'), 'utf8'), /lc-sheet/);
  assert.match(read('overlay/README.md') + s + read('overlay/src/sheet/README.md'), /top layer/i, 'limite de la top layer non écrite');
});

test('CA-S0 : lc-data-table n’a plus de <dialog> propre et utilise lc-sheet', () => {
  const html = read('data/src/data-table/data-table.component.html');
  assert.ok(!/<dialog/.test(html), '<dialog> encore présent'); assert.match(html, /<lc-sheet/); assert.match(html, /\[closeText\]="labels\.cancel"/);
});

test('CA-R2 / spec 5.2 : jetons de composant du mouvement iOS', () => {
  const tk = JSON.parse(readFileSync(path.resolve(PACKAGE_ROOT, 'src/components/motion.tokens.json'), 'utf8'));
  const refs = { 'slide.enter-duration': '{sys.duration.move}', 'slide.exit-duration': '{sys.duration.normal}', 'sheet.radius': '{sys.radius.lg}', 'dialog.enter-scale': '0.86', 'shell.nav-duration': '350ms' };
  for (const [k, v] of Object.entries(refs)) assert.equal(k.split('.').reduce((o, p) => o?.[p], tk)?.$value, v, k);
  for (const k of ['sheet.card-width', 'sheet.card-max-height']) assert.ok(k.split('.').reduce((o, p) => o?.[p], tk)?.$value, k);
});

test('lc-sheet : la rupture « carte » du TypeScript est celle du @media du CSS', () => {
  const ts = read('overlay/src/sheet/sheet.component.ts').match(/const CARD = '\((min-width: [^)]+)\)'/)?.[1];
  const css = read('overlay/src/sheet/sheet.component.css').match(/@media \((min-width: [^)]+)\)/)?.[1];
  assert.ok(ts, 'CARD introuvable dans le TypeScript');
  assert.equal(css, ts);
});

// T9b, CA-24 (docs/specs/2026-12-mouvement-v2.md §5.1, §12) : les seuils de geste sont des constantes nommées du code, pas des jetons.
const strip = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
test('T9b CA-24 : plus de jeton sheet.dismiss-ratio ; fermeture au tiers de la hauteur ou à 0,6 px/ms, en constantes nommées', () => {
  const tk = JSON.parse(readFileSync(path.resolve(PACKAGE_ROOT, 'src/components/motion.tokens.json'), 'utf8'));
  assert.equal(tk.sheet['dismiss-ratio'], undefined, 'le jeton sheet.dismiss-ratio doit disparaître (seuil de geste, spec §5.1)');
  const gesture = strip(read('overlay/src/sheet/sheet-gesture.ts'));
  assert.doesNotMatch(gesture + strip(read('overlay/src/sheet/sheet.component.ts')), /--lc-sheet-dismiss-ratio/, 'le composant lit encore le jeton supprimé');
  const constant = (name) => { const m = gesture.match(new RegExp(`const ${name}\\s*(?::[^=]+)?=\\s*([^;]+);`)); return m ? Function(`return (${m[1]})`)() : undefined; };
  assert.ok(Math.abs(constant('SHEET_DISMISS_RATIO') - 1 / 3) < 1e-9, 'SHEET_DISMISS_RATIO = 1 / 3 attendu');
  assert.equal(constant('SHEET_FLICK_SPEED'), 0.6, 'SHEET_FLICK_SPEED = 0,6 px/ms attendu');
});

test('T9b CA-24 : glissement, ressort et élastique joués par lcAnimate ; ni @keyframes, ni .animate(, ni transition sur transform, coins et hauteur lus dans les jetons', () => {
  const ts = strip(read('overlay/src/sheet/sheet.component.ts'));
  const css = strip(read('overlay/src/sheet/sheet.component.css'));
  assert.match(ts, /\blcAnimate\b/, 'sheet.component.ts doit jouer le glissement par lcAnimate (§5.1)');
  assert.doesNotMatch(ts, /\.animate\(|getAnimations/, 'Element.animate direct : passer par lcAnimate');
  assert.doesNotMatch(css, /@keyframes/);
  assert.doesNotMatch(css, /transition[^;{}]*\b(transform|translate)\b/, 'le glissement n\'est plus une transition CSS');
  assert.match(css, /var\(--lc-sheet-top-radius/, 'coins hauts : --lc-sheet-top-radius');
  assert.match(css, /var\(--lc-sheet-max-height/, 'hauteur maximale : --lc-sheet-max-height');
});
