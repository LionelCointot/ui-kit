// Sélection du lanceur (tools/qa/run.mjs) : `--changed` d'après les chemins, extraction des ids KO pour `--failed`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedSuites, suites } from './run.mjs';

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
