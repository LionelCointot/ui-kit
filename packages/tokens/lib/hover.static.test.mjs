// CA-V2 (docs/specs/2026-11-mouvement-ios.md) : tout `:hover` du kit est sous `@media (hover: hover)`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { PACKAGE_ROOT } from './tokens.mjs';

const dir = path.resolve(PACKAGE_ROOT, '..', 'angular');
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (['node_modules', 'dist'].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.css') ? [path.join(d, e.name)] : []));
const hoverQuery = (rule) => { for (let n = rule.parent; n; n = n.parent) if (n.type === 'atrule' && n.name === 'media' && /hover:\s*hover/.test(n.params)) return true; return false; };

test('CA-V2 : aucune règle :hover hors @media (hover: hover), au moins 46 occurrences dans 23 fichiers', () => {
  const files = walk(dir);
  const bad = []; let count = 0; const withHover = new Set();
  for (const file of files) {
    postcss.parse(readFileSync(file, 'utf8'), { from: file }).walkRules((rule) => {
      if (!rule.selector.includes(':hover')) return;
      count += rule.selector.split(":hover").length - 1; withHover.add(file);
      if (!hoverQuery(rule)) bad.push(`${path.relative(dir, file)}:${rule.source.start.line} ${rule.selector}`);
    });
  }
  const probe = postcss.parse('@media (hover: hover) { a { b { c:d } } } e:hover{}');
  assert.ok(files.length >= 23 && withHover.size >= 23, `fichiers : ${files.length} lus, ${withHover.size} avec :hover`);
  assert.ok(count >= 46, `occurrences de :hover : ${count} (< 46, mesuré au départ ; la spec dit 49, commentaires compris)`);
  assert.ok(hoverQuery(probe.first.first.first) && !hoverQuery(probe.last), 'détecteur défaillant');
  assert.deepEqual(bad, []);
});
