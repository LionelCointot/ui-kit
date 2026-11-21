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
  assert.ok(!/<dialog/.test(html), '<dialog> encore présent'); assert.match(html, /<lc-sheet/); assert.match(html, /closeLabel/);
});

test('CA-R2 / spec 5.2 : jetons de composant du mouvement iOS', () => {
  const tk = JSON.parse(readFileSync(path.resolve(PACKAGE_ROOT, 'src/components/motion.tokens.json'), 'utf8'));
  const refs = { 'collapse.duration': '{sys.duration.move}', 'slide.enter-duration': '{sys.duration.move}', 'slide.exit-duration': '{sys.duration.normal}', 'sheet.top-gap': '{sys.space.10}', 'sheet.radius': '{sys.radius.lg}', 'dialog.enter-scale': '0.96', 'shell.nav-duration': '{sys.duration.long}', 'sheet.dismiss-ratio': '0.25' };
  for (const [k, v] of Object.entries(refs)) assert.equal(k.split('.').reduce((o, p) => o?.[p], tk)?.$value, v, k);
  for (const k of ['sheet.card-width', 'sheet.card-max-height']) assert.ok(k.split('.').reduce((o, p) => o?.[p], tk)?.$value, k);
});

test('lc-sheet : la rupture « carte » du TypeScript est celle du @media du CSS', () => {
  const ts = read('overlay/src/sheet/sheet.component.ts').match(/const CARD = '\((min-width: [^)]+)\)'/)?.[1];
  const css = read('overlay/src/sheet/sheet.component.css').match(/@media \((min-width: [^)]+)\)/)?.[1];
  assert.ok(ts, 'CARD introuvable dans le TypeScript');
  assert.equal(css, ts);
});
