import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

// Mouvement v2 (docs/specs/2026-12-mouvement-v2.md, T1) : duration.move reste 500 ms ; la liste glisse en 420 ms `draw` ;
// les indicateurs de tabs et nav-item ont deux bords : avant en `title`, arrière en `inout` (plus de easing.standard).
test('déplacements : duration.move 500 ms ; liste en 420 ms sur easing.draw ; indicateurs de tabs et nav-item sur easing.title et easing.inout', () => {
  assert.equal(read('../src/ref/scale.tokens.json').ref.duration.move.$value, '500ms');
  for (const theme of ['default', 'dark']) assert.equal(read(`../src/sys/${theme}.tokens.json`).sys.duration.move.$value, '{ref.duration.move}');
  const motion = read('../src/components/motion.tokens.json');
  assert.match(motion.list['move-duration'].$value, /^(420ms|\{ref\.[\w.-]+\})$/, '420 ms n\'est pas un rôle sys : littéral ou référence ref (valeur résolue : motion.acceptance.test.mjs)');
  assert.equal(motion.list['move-easing'].$value, '{sys.easing.draw}');
  for (const key of ['tabs', 'nav-item']) {
    const easings = Object.entries(motion[key]).filter(([name]) => /easing/.test(name)).map(([, token]) => token.$value).sort();
    assert.deepEqual(easings, ['{sys.easing.inout}', '{sys.easing.title}'], `${key} : un token de courbe par bord, sur title (avant) et inout (arrière)`);
  }
});
