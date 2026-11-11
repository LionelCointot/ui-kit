// Rôle de couleur `highlight` (K2, CA-K2.1 à CA-K2.4) : paires de contraste, héritage, export, absence de valeur en dur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGE_ROOT, resolvedTokens } from '../lib/tokens.mjs';
import { baseValues, checkContrast, contrastRatio, fromDtcg, resolveTheme, themeSchema, toDtcg, validateTheme } from './index.js';

const CLI = path.join(PACKAGE_ROOT, 'bin', 'lc-tokens.mjs');
const ANGULAR = path.resolve(PACKAGE_ROOT, '..', 'angular');
const HIGHLIGHT_PATHS = ['color.highlight', 'color.on-highlight', 'color.highlight-container', 'color.on-highlight-container'];

// Valeurs et ratios de la spec (docs/specs/2026-11-ui-kit-composants-manquants.md, K2), indépendants de l'implémentation.
const SPEC_VALUES = {
  default: { 'color.highlight': '#6250d6', 'color.on-highlight': '#ffffff', 'color.highlight-container': '#e9e6fa', 'color.on-highlight-container': '#4a3aa8' },
  dark: { 'color.highlight': '#9085e9', 'color.on-highlight': '#0b0b0b', 'color.highlight-container': '#26214f', 'color.on-highlight-container': '#d8d3fb' },
};
const SPEC_RATIOS = {
  default: { plain: 5.77, container: 6.97 },
  dark: { plain: 6.3, container: 10.36 },
};

const round2 = (value) => Math.round(value * 100) / 100;

function withThemeFile(dtcg, action) {
  const directory = mkdtempSync(path.join(tmpdir(), 'lc-highlight-'));
  try {
    const file = path.join(directory, 'theme.tokens.json');
    writeFileSync(file, JSON.stringify(dtcg));
    return action(file);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const runCli = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

for (const base of ['default', 'dark']) {
  test(`CA-K2.1 : les quatre jetons highlight du thème ${base} ont les valeurs de la spec`, async () => {
    for (const [tokenPath, value] of Object.entries(SPEC_VALUES[base])) assert.equal(baseValues(base)[tokenPath], value, tokenPath);
    const tokens = await resolvedTokens(base);
    for (const tokenPath of HIGHLIGHT_PATHS) assert.ok(tokens.has(`sys.${tokenPath}`), `sys.${tokenPath} dans le build des tokens`);
  });

  test(`CA-K2.1 : ratios mesurés de la spec (thème ${base}), seuil 4,5:1`, () => {
    const values = SPEC_VALUES[base];
    assert.equal(round2(contrastRatio(values['color.on-highlight'], values['color.highlight'])), SPEC_RATIOS[base].plain);
    assert.equal(round2(contrastRatio(values['color.on-highlight-container'], values['color.highlight-container'])), SPEC_RATIOS[base].container);
  });

  test(`CA-K2.1 : lc-tokens check valide les deux paires highlight sur ${base} (thème produit sans surcharge de highlight)`, () => {
    withThemeFile({ sys: { color: { primary: { $value: base === 'dark' ? '#5fcbc2' : '#0b5f5a' } } } }, (file) => {
      const { status, stdout, stderr } = runCli(['check', '--theme', file, '--extends', base]);
      assert.equal(status, 0, stderr);
      for (const [fg, bg] of [['on-highlight', 'highlight'], ['on-highlight-container', 'highlight-container']]) {
        assert.match(stdout, new RegExp(`OK\\s+[\\d.]+:1 \\(min 4\\.5\\) sys\\.color\\.${fg} / sys\\.color\\.${bg}\\b`), `paire ${fg}/${bg}`);
      }
      assert.doesNotMatch(stdout, /\bKO\b/);
    });
  });

  test(`CA-K2.1 : un thème produit qui ne surcharge aucun jeton highlight hérite des valeurs de base (${base})`, () => {
    const resolved = resolveTheme({ name: 'produit', extends: base, overrides: { 'color.primary': '#0b5f5a', 'color.on-primary': '#ffffff' } });
    for (const [tokenPath, value] of Object.entries(SPEC_VALUES[base])) assert.equal(resolved[`--lc-sys-${tokenPath.replace('.', '-')}`], value, tokenPath);
  });
}

test('CA-K2.1 : lc-tokens check refuse une paire highlight insuffisante (code 1, message de contraste)', () => {
  const dtcg = { sys: { color: { 'on-highlight': { $value: '#9085e9' } } } };
  withThemeFile(dtcg, (file) => {
    const { status, stderr, stdout } = runCli(['check', '--theme', file]);
    assert.equal(status, 1);
    assert.match(stderr, /Contraste insuffisant : sys\.color\.on-highlight \(#9085e9\) sur sys\.color\.highlight/);
    assert.match(stdout, /KO\s+[\d.]+:1 \(min 4\.5\) sys\.color\.on-highlight \/ sys\.color\.highlight/);
  });
});

test('CA-K2.1 : deux paires highlight exactement figurent dans le contrôle, au seuil 4,5', () => {
  for (const base of ['default', 'dark']) {
    const pairs = checkContrast(resolveTheme({ name: 'x', extends: base, overrides: {} })).filter((pair) => /highlight/.test(pair.fg + pair.bg));
    assert.deepEqual(pairs.map((pair) => [pair.fg, pair.bg, pair.required]).sort(), [
      ['color.on-highlight', 'color.highlight', 4.5],
      ['color.on-highlight-container', 'color.highlight-container', 4.5],
    ]);
  }
});

// CA-K2.3
test('CA-K2.3 : le schéma des thèmes éditables propose les quatre jetons highlight dans le groupe « status » (États)', () => {
  for (const tokenPath of HIGHLIGHT_PATHS) {
    const token = themeSchema.find((entry) => entry.path === tokenPath);
    assert.ok(token, tokenPath);
    assert.equal(token.group, 'status');
    assert.equal(token.type, 'color');
    assert.equal(token.cssVar, `--lc-sys-${tokenPath.replace('.', '-')}`);
  }
});

test('CA-K2.3 : l\'export DTCG d\'un thème contient les quatre jetons highlight et fait l\'aller-retour', () => {
  const overrides = { 'color.highlight': '#6b46c1', 'color.on-highlight': '#ffffff', 'color.highlight-container': '#ede9fe', 'color.on-highlight-container': '#4c1d95' };
  const definition = { name: 'produit', extends: 'default', overrides };
  const dtcg = toDtcg(definition);
  for (const [tokenPath, value] of Object.entries(overrides)) {
    const [, leaf] = tokenPath.split('.');
    assert.deepEqual(dtcg.sys.color[leaf], { $value: value, $type: 'color' }, tokenPath);
  }
  assert.deepEqual(Object.keys(dtcg.sys.color).sort(), ['highlight', 'highlight-container', 'on-highlight', 'on-highlight-container']);
  assert.deepEqual(fromDtcg(JSON.parse(JSON.stringify(dtcg)), { name: 'produit', extends: 'default' }), definition);
  assert.deepEqual(validateTheme(definition), { valid: true, errors: [] });
});

test('CA-K2.3 : une valeur highlight invalide est refusée comme tout autre jeton de couleur', () => {
  assert.equal(validateTheme({ name: 'x', extends: 'default', overrides: { 'color.highlight': 'red;}body{display:none' } }).valid, false);
});

// CA-K2.2 : « sans valeur en dur »
const CSS_SOURCES = {
  badge: 'feedback/src/badge/badge.component.css',
  button: 'src/lib/button/button.component.css',
  slider: 'forms/src/slider/slider.component.css',
};

/** Déclarations des règles dont le sélecteur mentionne `highlight`. */
function highlightDeclarations(css) {
  const rules = [...css.matchAll(/([^{}]*highlight[^{}]*)\{([^{}]*)\}/g)];
  return rules.flatMap(([, , body]) => body.split(';').map((line) => line.trim()).filter(Boolean));
}

for (const [component, file] of Object.entries(CSS_SOURCES)) {
  test(`CA-K2.2 : ${component} — les règles highlight n'utilisent que des tokens (aucune couleur en dur) et au moins un token highlight`, () => {
    const declarations = highlightDeclarations(readFileSync(path.join(ANGULAR, file), 'utf8'));
    assert.ok(declarations.length > 0, 'des règles highlight existent');
    const joined = declarations.join('\n');
    assert.doesNotMatch(joined, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/, 'aucune couleur littérale');
    assert.doesNotMatch(joined, /--lc-ref-/, 'aucun jeton de référence hors thèmes');
    assert.match(joined, /--lc-sys-color-(on-)?highlight(-container)?\b/);
  });
}

test('CA-K2.2 : les trois remplissages de lc-badge (solid, flat, outline) et de lc-button ont une règle highlight', () => {
  const badge = readFileSync(path.join(ANGULAR, CSS_SOURCES.badge), 'utf8');
  const button = readFileSync(path.join(ANGULAR, CSS_SOURCES.button), 'utf8');
  for (const fill of ['solid', 'flat', 'outline']) {
    assert.match(badge, new RegExp(`\\.lc-badge--${fill}\\.lc-badge--highlight`), `badge ${fill}`);
    assert.match(button, new RegExp(`\\.lc-button--${fill}\\.lc-button--highlight`), `button ${fill}`);
  }
});
