import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { springLinear } from './spring-easing.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('ressort : linear() de 56 points, monotone, jamais au-delà de 1, termine à 1', () => {
  const values = springLinear().slice('linear('.length, -1).split(', ').map(Number);
  assert.equal(values.length, 56);
  assert.equal(values[0], 0);
  assert.equal(values.at(-1), 1);
  assert.ok(values.every((value, i) => value <= 1 && (i === 0 || value >= values[i - 1])));
});

test('ressort : tokens ref, sys et composants (liste, onglets, nav latérale)', () => {
  const spring = springLinear();
  assert.equal(read('../src/ref/scale.tokens.json').ref.easing.spring.$value, spring);
  assert.equal(read('../src/ref/scale.tokens.json').ref.duration.move.$value, '500ms');
  for (const theme of ['default', 'dark']) {
    const { sys } = read(`../src/sys/${theme}.tokens.json`);
    assert.equal(sys.easing.spring.$value, '{ref.easing.spring}');
    assert.equal(sys.duration.move.$value, '{ref.duration.move}');
  }
  const motion = read('../src/components/motion.tokens.json');
  assert.equal(motion.list['move-duration'].$value, '{sys.duration.move}');
  assert.equal(motion.list['move-easing'].$value, '{sys.easing.spring}');
  for (const key of ['tabs', 'nav-item']) {
    assert.equal(motion[key]['indicator-duration'].$value, '{sys.duration.move}');
    assert.equal(motion[key]['indicator-easing'].$value, '{sys.easing.spring}');
  }
});
