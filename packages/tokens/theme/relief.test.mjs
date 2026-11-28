// docs/specs/2026-12-relief.md, T1 : profil d'ombre à deux couches, filet `line`, `radius.xl`.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { baseValues, validateTheme } from './index.js';

const theme = (overrides) => ({ name: 'relief', extends: 'default', overrides });

describe('relief', () => {
  test('le profil d\'ombre à deux couches du kit passe le validateur', () => {
    for (const base of ['default', 'dark']) {
      const values = baseValues(base);
      for (const path of ['shadow.1', 'shadow.2']) assert.equal(validateTheme(theme({ [path]: values[path] })).valid, true, `${base} ${path}`);
    }
  });

  test('valeurs du §5.2', () => {
    const light = baseValues('default');
    const dark = baseValues('dark');
    assert.equal(light['shadow.1'], '0 1px 1px rgba(11, 11, 11, 0.03), 0 16px 32px -22px rgba(11, 11, 11, 0.3)');
    assert.equal(dark['shadow.2'], '0 2px 6px rgba(0, 0, 0, 0.5), 0 40px 80px -28px rgba(0, 0, 0, 0.95)');
    assert.equal(light['color.line'], 'rgba(11, 11, 11, 0.075)');
    assert.equal(dark['color.line'], 'rgba(255, 255, 255, 0.08)');
    assert.equal(light['radius.xl'], '16px');
    assert.equal(dark['radius.xl'], '16px');
  });
});
