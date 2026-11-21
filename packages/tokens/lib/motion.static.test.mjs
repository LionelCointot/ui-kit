// CA-15 (docs/specs/2026-11-mouvement.md) : aucune durée, distance, courbe ni échelle en dur dans les lignes ajoutées par la branche aux fichiers de mouvement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PACKAGE_ROOT } from './tokens.mjs';

const root = path.resolve(PACKAGE_ROOT, '..', '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const FILES = [
  'packages/angular/navigation/src/tabs/tabs.component.css', 'packages/angular/navigation/src/tabs/tabs.component.ts',
  'packages/angular/navigation/src/nav-list/nav-list.component.css', 'packages/angular/navigation/src/nav-list/nav-list.component.ts',
  'packages/angular/navigation/src/nav-list/nav-item.component.css', 'packages/angular/navigation/src/nav-list/nav-item.component.ts',
  'packages/angular/data/src/data-table/data-table.component.css', 'packages/angular/data/src/data-table/data-table.component.ts',
  'packages/angular/src/lib/reveal/reveal.directive.ts', 'packages/angular/src/styles/ui-angular.css',
  ...git('ls-files', 'packages/angular/src/lib/button', 'packages/angular/navigation/src/menu', 'packages/angular/forms/src/combobox', 'packages/angular/forms/src/date-input').split('\n').filter((f) => /\.(css|ts)$/.test(f) && !/\.(spec|stories)\.ts$/.test(f)),
];
const HARD = /\d+(\.\d+)?(ms|s|px)\b|cubic-bezier\(|scale\(0\./;

test('CA-15 : aucune valeur de mouvement en dur dans les lignes ajoutées', () => {
  const base = git('merge-base', 'main', 'HEAD').trim();
  const found = [];
  let scanned = 0;
  for (const file of FILES) {
    let file_ = '';
    try { file_ = git('diff', '-U0', base, 'HEAD', '--', file); } catch { continue; }
    for (const line of file_.split('\n')) {
      if (!line.startsWith('+') || line.startsWith('+++')) continue;
      scanned += 1;
      const code = line.slice(1).replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '').replace(/var\(--lc-[^)]*\)/g, '');
      if (HARD.test(code)) found.push(`${file} : ${line.slice(1).trim()}`);
    }
  }
  assert.ok(scanned > 100, `contrôle vide : ${scanned} lignes lues`);
  assert.ok(HARD.test('transition: opacity 200ms') && HARD.test('translateY(8px)') && HARD.test('cubic-bezier(0,0,1,1)') && HARD.test('scale(0.97)'), 'motif défaillant');
  assert.deepEqual(found, []);
});
