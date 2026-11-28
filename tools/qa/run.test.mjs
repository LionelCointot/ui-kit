// Sélection du lanceur (tools/qa/run.mjs) : `--changed` d'après les chemins, extraction des ids KO pour `--failed`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { changedSuites, readLast, suites } from './run.mjs';

const get = (n) => suites.find((s) => s.nom === n);
test('--changed : snippets et controls seulement si .storybook ou une story change', () => {
  assert.ok(!changedSuites(['packages/angular/forms/src/slider/slider.component.css']).includes('snippets'));
  assert.ok(changedSuites(['packages/angular/forms/src/slider/slider.stories.ts']).includes('snippets'));
  assert.ok(changedSuites(['.storybook/preview.ts']).includes('controls'));
});
test('--changed : composer et thread selon leur dossier', () => {
  const c = changedSuites(['packages/angular/forms/src/message-composer/x.ts']);
  assert.ok(c.includes('composer') && !c.includes('thread'));
  assert.ok(changedSuites(['packages/angular/feedback/src/message-thread/x.ts']).includes('thread'));
});
test('--failed : ids lus dans les lignes KO', () => {
  assert.equal(get('fidelite').id('KO  CA-20 d37 buttons-theme-toggle--animation Rejouer : x'), 'd37');
  assert.equal(get('axe').id('KO  dark    forms-slider--states'), 'forms-slider--states');
  assert.equal(get('motion').id('KO  CA-5 normal 360px overlays-sheet--animation « Rejouer » n°1/4 propriétés : x'), 'overlays-sheet--animation');
  assert.equal(get('motion').id('KO  CA-6 normal 1280px solid : x'), null);
  assert.equal(get('motion-final').id('KO  CA-25 toast à 16 px'), 'toast');
});
test('motion : l\'id vient juste après le tag, jamais d\'une URL ni d\'une variable CSS', () => {
  const id = get('motion').id;
  assert.equal(id('KO  CA-16a erreurs page ou console normal 1280px forms-date-input--animation console: GET /iframe.html?id=x--animation var(--lc-a)'), 'forms-date-input--animation');
  assert.equal(id('KO  CA-5 reduced 360px a--b « Rejouer » : var(--lc-x)'), 'a--b');
  assert.equal(id('KO  CA-3 normal 360px « Rejouer » : ?id=x--animation'), null);
});
test('--failed : .qa-last.json absent, invalide ou null = illisible', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'qa-'));
  const write = (t) => { const f = path.join(dir, 'l.json'); writeFileSync(f, t); return f; };
  assert.equal(readLast(path.join(dir, 'absent.json')), null);
  assert.equal(readLast(write('{')), null);
  assert.equal(readLast(write('null')), null);
  assert.deepEqual(readLast(write('{"a":{"ok":true}}')), { a: { ok: true } });
});
test('--changed : un changement de configuration relance les suites navigateur', () => {
  assert.ok(changedSuites(['package-lock.json']).includes('motion'));
  assert.ok(changedSuites(['angular.json']).includes('snippets'));
});
