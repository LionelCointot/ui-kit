// Relief par défaut (docs/specs/2026-12-relief.md §5.2) : valeurs résolues des thèmes de base (CA-1, CA-2, CA-3) et contraste de la variante pleine (CA-4).
// Les valeurs attendues sont celles du tableau du §5.2, écrites en dur : jamais lues depuis les thèmes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvedTokens } from '../lib/tokens.mjs';
import { baseValues, contrastRatio, validateTheme } from './index.js';

const THEMES = ['default', 'dark'];
const tokens = Object.fromEntries(await Promise.all(THEMES.map(async (theme) => [theme, await resolvedTokens(theme)])));
// Écriture indifférente : espaces, « 0.30 » ou « .3 ».
const norm = (css) => String(css).replace(/\d*\.\d+/g, (n) => String(parseFloat(n)).replace(/^0\./, '.')).replace(/\s+/g, ' ').replace(/ ?, ?/g, ',');
const get = (theme, name) => tokens[theme].get(name);

const EXPECTED = {
  default: {
    'sys.shadow.1': '0 1px 1px rgba(11,11,11,.03), 0 16px 32px -22px rgba(11,11,11,.30)',
    'sys.shadow.2': '0 2px 6px rgba(11,11,11,.07), 0 34px 70px -26px rgba(11,11,11,.40)',
    'sys.color.line': 'rgba(11,11,11,.075)',
  },
  dark: {
    'sys.shadow.1': '0 1px 2px rgba(0,0,0,.40), 0 14px 30px -20px rgba(0,0,0,.85)',
    'sys.shadow.2': '0 2px 6px rgba(0,0,0,.50), 0 40px 80px -28px rgba(0,0,0,.95)',
    'sys.color.line': 'rgba(255,255,255,.08)',
  },
};

for (const theme of THEMES) {
  test(`CA-1 : ombres 1 et 2 et filet sys.color.line au profil du §5.2, card.line-color le lit (${theme})`, () => {
    for (const [name, wanted] of Object.entries(EXPECTED[theme])) assert.equal(norm(get(theme, name)), norm(wanted), `${theme} ${name}`);
    assert.equal(get(theme, 'card.line-color'), get(theme, 'sys.color.line'), `${theme} card.line-color`);
  });

  test(`CA-2 : shell.content-background résout surface-sunken, plus sombre que surface-raised (${theme})`, () => {
    const sunken = get(theme, 'sys.color.surface-sunken');
    assert.equal(get(theme, 'shell.content-background'), sunken, `${theme} shell.content-background`);
    // Contre le noir : plus le rapport est faible, plus la couleur est sombre.
    assert.ok(contrastRatio(sunken, '#000000') < contrastRatio(get(theme, 'sys.color.surface-raised'), '#000000'), `${theme} : surface-sunken doit être plus sombre que surface-raised`);
  });

  test(`CA-3 : radius.xl = 16px (ref et sys), card.radius le lit, radius.lg reste 12px (${theme})`, () => {
    assert.deepEqual(['ref.radius.xl', 'sys.radius.xl', 'card.radius', 'sys.radius.lg'].map((name) => get(theme, name)), ['16px', '16px', '16px', '12px']);
  });

  test(`CA-4 : on-<couleur> sur <couleur> ≥ 4,5:1 pour les 7 themeColor (${theme})`, () => {
    for (const color of ['primary', 'secondary', 'success', 'warning', 'error', 'highlight', 'neutral']) {
      const result = contrastRatio(get(theme, `sys.color.on-${color}`), get(theme, `sys.color.${color}`));
      assert.ok(result >= 4.5, `${theme} ${color} : ${result.toFixed(2)}:1`);
    }
  });
}

test('T1 : le profil d\'ombre à deux couches du kit passe le validateur de thème', () => {
  for (const base of THEMES) {
    const values = baseValues(base);
    for (const path of ['shadow.1', 'shadow.2']) assert.equal(validateTheme({ name: 'relief', extends: 'default', overrides: { [path]: values[path] } }).valid, true, `${base} ${path}`);
  }
});
