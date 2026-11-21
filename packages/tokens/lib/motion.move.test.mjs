import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('déplacements : duration.move 500 ms ; liste, onglets et nav latérale sur duration.move et easing.standard', () => {
  assert.equal(read('../src/ref/scale.tokens.json').ref.duration.move.$value, '500ms');
  for (const theme of ['default', 'dark']) assert.equal(read(`../src/sys/${theme}.tokens.json`).sys.duration.move.$value, '{ref.duration.move}');
  const motion = read('../src/components/motion.tokens.json');
  assert.equal(motion.list['move-duration'].$value, '{sys.duration.move}');
  assert.equal(motion.list['move-easing'].$value, '{sys.easing.standard}');
  for (const key of ['tabs', 'nav-item']) {
    assert.equal(motion[key]['indicator-duration'].$value, '{sys.duration.move}');
    assert.equal(motion[key]['indicator-easing'].$value, '{sys.easing.standard}');
  }
});
