// Acceptation de docs/specs/2026-12-mouvement-v2.md, tâche T7 : tokens de mouvement du fil de messages et du filtre de tableau (écart de T1 reporté à T7, §5.2 « tous les réglages dans motion.tokens.json »).
// Les noms CSS restent ceux d'avant (--lc-message-thread-enter-*) : seul l'emplacement des définitions change. `table.refill-delay` : délai de 200 ms avant la cascade qui suit un changement de filtre (démo d08, premier délai 200 ms) ;
// le nom est fixé par ce test (contrat T7), la spec ne le nomme pas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, test } from 'node:test';
import { buildCss, resolve, tokenMap, toMs } from './motion-css.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
let css;
before(() => { css = buildCss(); });

test('T7 : message-thread.tokens.json ne porte plus aucun token de mouvement (enter-*, stagger) ; motion.tokens.json les porte tous', () => {
  const own = Object.keys(read('../src/components/message-thread.tokens.json')['message-thread']);
  assert.deepEqual(own.filter((name) => /^(enter|stagger|move)/.test(name)), []);
  const motion = Object.keys(read('../src/components/motion.tokens.json')['message-thread']).sort();
  assert.deepEqual(motion, ['enter-duration', 'enter-easing', 'enter-fade-duration', 'enter-scale', 'enter-stagger']);
});

for (const theme of ['default', 'dark']) {
  test(`T7 : les variables --lc-message-thread-enter-* gardent leurs valeurs après le déplacement (${theme})`, () => {
    const map = tokenMap(css, theme);
    assert.equal(toMs(resolve(map, '--lc-message-thread-enter-duration').value), 550);
    assert.equal(resolve(map, '--lc-message-thread-enter-scale').value, '0.6');
    assert.match(resolve(map, '--lc-message-thread-enter-easing').value, /^linear\(0, 0\.009/);
    assert.equal(toMs(resolve(map, '--lc-message-thread-enter-stagger').value), 40);
  });

  test(`T7 : --lc-table-refill-delay vaut 200 ms, --lc-list-move-duration 420 ms (${theme})`, () => {
    const map = tokenMap(css, theme);
    assert.equal(toMs(resolve(map, '--lc-table-refill-delay').value), 200);
    assert.equal(toMs(resolve(map, '--lc-list-move-duration').value), 420);
  });
}
