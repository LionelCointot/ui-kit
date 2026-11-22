// Contrastes des éléments du tableau de bord (K1, K5, K6) calculés sur les jetons résolus des thèmes de base.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvedTokens } from '../lib/tokens.mjs';
import { contrastRatio } from './index.js';

const THEMES = ['default', 'dark'];
const tokensOf = Object.fromEntries(await Promise.all(THEMES.map(async (theme) => [theme, await resolvedTokens(theme)])));
const value = (theme, tokenPath) => {
  const found = tokensOf[theme].get(tokenPath);
  assert.ok(typeof found === 'string' && found.startsWith('#'), `${theme} ${tokenPath} : valeur hexadécimale attendue, reçu ${found}`);
  return found;
};
const ratio = (theme, foreground, background) => contrastRatio(value(theme, foreground), value(theme, background));

for (const theme of THEMES) {
  // CA-K1.2 : texte / fond des six variantes de lc-status-badge (aucun badge ne dépend du seul remplissage coloré)
  test(`CA-K1.2 : lc-status-badge, contraste texte/fond ≥ 4,5:1 pour les six variantes (${theme})`, () => {
    const variants = {
      success: ['sys.color.on-success-container', 'sys.color.success-container'],
      error: ['sys.color.on-error-container', 'sys.color.error-container'],
      warning: ['sys.color.on-warning-container', 'sys.color.warning-container'],
      highlight: ['sys.color.on-highlight-container', 'sys.color.highlight-container'],
      info: ['sys.color.on-info-container', 'sys.color.info-container'],
      neutral: ['sys.color.on-surface', 'sys.color.surface-sunken'],
    };
    for (const [kind, [foreground, background]] of Object.entries(variants)) {
      const result = ratio(theme, foreground, background);
      assert.ok(result >= 4.5, `${theme} ${kind} : ${result.toFixed(2)}:1`);
    }
  });

  // CA-K6.2 : marques de rôle contre la surface de graphique
  test(`CA-K6.2 : marques de rôle des graphiques ≥ 3:1 contre chart.surface, hors warning (contour d'encre) (${theme})`, () => {
    for (const role of ['success', 'error', 'highlight', 'info', 'neutral']) {
      const result = ratio(theme, `sys.chart.role.${role}`, 'sys.chart.surface');
      assert.ok(result >= 3, `${theme} ${role} : ${result.toFixed(2)}:1`);
    }
    // warning : la marque est entourée d'un contour d'encre primaire (1,5 px) qui porte le contraste.
    const outline = ratio(theme, 'sys.chart.ink-primary', 'sys.chart.surface');
    assert.ok(outline >= 4.5, `${theme} contour warning / surface : ${outline.toFixed(2)}:1`);
    // Thème sombre : l'ambre atteint aussi 3:1 par lui-même (spec : 5,67:1) ; thème clair : 2,11:1, d'où le contour.
    if (theme === 'dark') {
      const mark = ratio(theme, 'sys.chart.role.warning', 'sys.chart.surface');
      assert.ok(mark >= 3, `dark warning / surface : ${mark.toFixed(2)}:1`);
    }
  });

  test(`K6 : les rôles de graphique reprennent les emplacements de la spec (success 6, error 8, highlight 7, warning 4, info 1) (${theme})`, () => {
    const slots = { success: 6, error: 8, highlight: 7, warning: 4, info: 1 };
    for (const [role, slot] of Object.entries(slots)) {
      assert.equal(value(theme, `sys.chart.role.${role}`), value(theme, `sys.chart.categorical.${slot}`), `${theme} ${role}`);
    }
    assert.equal(value(theme, 'sys.chart.role.neutral'), value(theme, 'sys.chart.ink-muted'), `${theme} neutral`);
  });

  test(`K6 : les marques de rôle sont deux à deux distinguables par la couleur (${theme})`, () => {
    const roles = ['success', 'error', 'warning', 'info', 'neutral', 'highlight'];
    const colors = roles.map((role) => value(theme, `sys.chart.role.${role}`));
    assert.equal(new Set(colors).size, roles.length);
  });
}
