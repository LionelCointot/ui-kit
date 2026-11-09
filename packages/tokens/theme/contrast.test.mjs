import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, parseColor } from './contrast.js';

test('noir sur blanc = 21:1', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff') * 100) / 100, 21);
});

test('couleur identique = 1:1', () => {
  assert.equal(contrastRatio('#1c5cab', '#1c5cab'), 1);
});

test('formats acceptés et refusés', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255]);
  assert.deepEqual(parseColor('rgb(11, 11, 11)'), [11, 11, 11]);
  assert.equal(parseColor('rgba(11, 11, 11, 0.45)'), null);
});
