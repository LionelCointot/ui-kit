// CA-2 (docs/specs/2026-12-mouvement-v2.md, T1) : la table « valeur de §5.4 -> token » produite par le développeur est vraie.
//
// Format de `packages/tokens/lib/motion-values.json` (écrit par le développeur en T1) : un tableau de lignes
//   { "demo": "d09" | "—", "valeur": "900ms", "token": "--lc-sys-duration-draw" }
// - `valeur` : la valeur de §5.4 telle qu'écrite dans la spec, avec son unité (« 450ms », « 0.94 », « -3.7px », « 115% », « cubic-bezier(0.2, 1, 0.3, 1) ») ;
// - `token` : le nom CSS complet du jeton qui la porte ; sa valeur résolue (thème default) doit être égale (durées à 1 ms, courbes à 1e-3) ;
// - `demo` : la démo du catalogue citée par la spec, ou « — » quand elle n'en cite pas.
import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './tokens.mjs';
import { buildCss, resolve, sameValue, tokenMap } from './motion-css.mjs';

const TABLE = path.join(PACKAGE_ROOT, 'lib', 'motion-values.json');
const MIN_ROWS = 40; // §5.4.1 et §5.4.2 citent bien plus de valeurs ; un tableau court n'est pas la table.

let map;
before(() => { map = tokenMap(buildCss(), 'default'); });

test('CA-2 : motion-values.json existe et contient la table (au moins 40 lignes bien formées, sans doublon)', () => {
  assert.ok(existsSync(TABLE), 'packages/tokens/lib/motion-values.json est à produire par le développeur en T1');
  const rows = JSON.parse(readFileSync(TABLE, 'utf8'));
  assert.ok(Array.isArray(rows) && rows.length >= MIN_ROWS, `${rows.length} lignes, attendu au moins ${MIN_ROWS}`);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).sort(), ['demo', 'token', 'valeur'], `ligne mal formée : ${JSON.stringify(row)}`);
    assert.match(row.demo, /^(d\d{2}|—)$/, `demo : ${JSON.stringify(row)}`);
    assert.match(row.token, /^--lc-[\w-]+$/, `token : ${JSON.stringify(row)}`);
  }
  const keys = rows.map((r) => `${r.token}|${r.valeur}|${r.demo}`);
  assert.equal(new Set(keys).size, keys.length, 'lignes en double');
});

test('CA-2 : chaque ligne de la table existe dans la sortie construite avec sa valeur', () => {
  assert.ok(existsSync(TABLE), 'packages/tokens/lib/motion-values.json est à produire par le développeur en T1');
  const wrong = [];
  for (const { token, valeur, demo } of JSON.parse(readFileSync(TABLE, 'utf8'))) {
    const { value } = resolve(map, token);
    if (value === undefined) wrong.push(`${demo} ${valeur} : ${token} n'existe pas`);
    else if (!sameValue(value, valeur)) wrong.push(`${demo} ${valeur} : ${token} vaut ${value}`);
  }
  assert.deepEqual(wrong, []);
});
