// CA-15 (docs/specs/2026-11-mouvement.md) : aucune durée, distance, courbe ni échelle en dur dans les fichiers de mouvement (état du code, pas un diff).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './tokens.mjs';

const root = path.resolve(PACKAGE_ROOT, '..', '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const FILES = [
  'packages/angular/navigation/src/tabs/tabs.component.css', 'packages/angular/navigation/src/tabs/tabs.component.ts',
  'packages/angular/navigation/src/nav-list/nav-list.component.css', 'packages/angular/navigation/src/nav-list/nav-list.component.ts',
  'packages/angular/navigation/src/nav-list/nav-item.component.css', 'packages/angular/navigation/src/nav-list/nav-item.component.ts',
  'packages/angular/data/src/data-table/data-table.component.css', 'packages/angular/data/src/data-table/data-table.component.ts',
  'packages/angular/styles/ui-angular.css', // CA-R2 : chemin réel (l'ancien n'existait pas)
  // CA-R2 : fichiers touchés par 2026-11-mouvement-ios.md
  'packages/angular/layout/src/disclosure/disclosure.component.css', 'packages/angular/navigation/src/nav-group/nav-group.component.css', 'packages/angular/layout/src/app-shell/app-shell.component.css',
  'packages/angular/overlay/src/dialog/dialog.component.css', 'packages/angular/overlay/src/drawer/drawer.component.css',
  ...git('ls-files', 'packages/angular/overlay/src/sheet').split('\n').filter((f) => /\.(css|ts)$/.test(f) && !/\.(spec|stories)\.ts$/.test(f)),
  ...git('ls-files', 'packages/angular/src/lib/button', 'packages/angular/navigation/src/menu', 'packages/angular/forms/src/combobox', 'packages/angular/forms/src/date-input').split('\n').filter((f) => /\.(css|ts)$/.test(f) && !/\.(spec|stories)\.ts$/.test(f)),
];
// Durées, courbes, échelles et toute distance en px, sauf 0px et 1px (bords, zones masquées) ; les requêtes de média (@media, matchMedia) fixent des ruptures, pas du mouvement.
const HARD = /\d+(\.\d+)?(ms|s)\b|cubic-bezier\(|scale\(0\.|(?<![\d.])(?!(?:0|1)px\b)\d*\.?\d+px\b/;
const MEDIA = /@media|\((?:min|max)-(?:width|height):/;

test('CA-R2 : les fichiers contrôlés existent (un chemin faux rendait le contrôle vide)', () => {
  const missing = FILES.filter((f) => !existsSync(path.join(root, f)) && !f.includes('/sheet/'));
  assert.deepEqual(missing, []);
  assert.ok(FILES.some((f) => f.includes('/sheet/')), 'lc-sheet : en attente du code (packages/angular/overlay/src/sheet/)');
});

test('CA-15 : aucune valeur de mouvement en dur dans les fichiers de mouvement', () => {
  const found = [];
  let scanned = 0;
  for (const file of FILES) {
    if (!existsSync(path.join(root, file))) continue;
    for (const line of readFileSync(path.join(root, file), 'utf8').split('\n')) {
      scanned += 1;
      const code = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '').replace(/var\(--lc-[^)]*\)/g, '');
      if (!MEDIA.test(code) && HARD.test(code)) found.push(`${file} : ${line.trim()}`);
    }
  }
  assert.ok(scanned > 100, `contrôle vide : ${scanned} lignes lues`);
  assert.ok(HARD.test('transition: opacity 200ms') && HARD.test('translateY(8px)') && HARD.test('cubic-bezier(0,0,1,1)') && HARD.test('scale(0.97)') && HARD.test('margin: 12px') && !HARD.test('width: 1px') && !HARD.test('min(0px, 1px)'), 'motif défaillant');
  assert.deepEqual(found, []);
});
