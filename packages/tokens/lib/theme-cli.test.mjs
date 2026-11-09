// Parité entre le CLI lc-tokens et le module `@lionelcointot/ui-tokens/theme` (critères d'acceptation 2 et 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DATA_FILE, buildThemeData, renderThemeData } from './theme-data.mjs';
import { PACKAGE_ROOT, resolvedTokens } from './tokens.mjs';
import { renderThemeCss, toDtcg, validateTheme, fromDtcg, checkContrast, resolveTheme } from '../theme/index.js';

const CLI = path.join(PACKAGE_ROOT, 'bin', 'lc-tokens.mjs');

function withDirectory(action) {
  const directory = mkdtempSync(path.join(tmpdir(), 'lc-tokens-theme-'));
  try {
    return action(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function runCli(args) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** « --lc-sys-x: valeur; » → Map, commentaires retirés. */
function parseVariables(css) {
  const variables = new Map();
  for (const [, name, value] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--lc-sys-[\w-]+):\s*([^;]+);/g)) variables.set(name, value.trim());
  return variables;
}

/** Remplace les `var(--lc-ref-…)` par la valeur finale du token de référence. */
async function inlineReferences(variables, baseTheme) {
  const references = new Map();
  for (const [tokenPath, value] of await resolvedTokens(baseTheme)) {
    if (tokenPath.startsWith('ref.')) references.set(`--lc-${tokenPath.replaceAll('.', '-')}`, String(value));
  }
  return new Map([...variables].map(([name, value]) => [name, value.replace(/var\((--lc-ref-[\w-]+)\)/g, (_, ref) => references.get(ref))]));
}

test('les données générées du thème sont à jour (npm run build les régénère)', async () => {
  assert.equal(await readFile(DATA_FILE, 'utf8'), renderThemeData(await buildThemeData()));
});

for (const base of ['default', 'dark']) {
  test(`critère 2 : le DTCG exporté se compile avec lc-tokens build et donne les variables de renderThemeCss (base ${base})`, async () => {
    const definition = {
      name: 'exporte', extends: base,
      overrides: {
        ...(base === 'dark' ? { 'color.primary': '#5fcbc2', 'color.on-primary': '#0b0b0b' } : { 'color.primary': '#0b5f5a', 'color.on-primary': '#ffffff' }),
        'color.backdrop': 'rgba(0, 0, 0, 0.5)',
        'radius.md': '12px', 'space.4': '1.25rem', 'state.hover-opacity': '0.1',
        'font.family.base': 'Segoe UI, Arial, sans-serif', 'shadow.2': '0 2px 6px rgba(11, 11, 11, 0.08), 0 1px 2px #0b0b0b0f',
      },
    };
    const cliCss = withDirectory((directory) => {
      const file = path.join(directory, 'exporte.tokens.json');
      const out = path.join(directory, 'exporte.css');
      writeFileSync(file, JSON.stringify(toDtcg(definition)));
      const result = runCli(['build', '--theme', file, '--name', 'exporte', '--extends', base, '--out', out]);
      assert.equal(result.status, 0, result.stderr);
      return readFileSync(out, 'utf8');
    });
    assert.match(cliCss, /\[data-theme="exporte"\]/);
    const expected = parseVariables(renderThemeCss(definition));
    const actual = await inlineReferences(parseVariables(cliCss), base);
    assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort());
    for (const [name, value] of expected) assert.equal(actual.get(name), value, name);
  });
}

test('critère 3 et parité : un même thème donne les mêmes erreurs dans le CLI et le module', () => {
  const overrides = { 'color.primary': 'red;}body{display:none', 'color.primay': '#fff', 'z.dropdown': '5', 'radius.md': 'url(x)' };
  const dtcg = {
    sys: {
      color: { primary: { $value: overrides['color.primary'] }, primay: { $value: '#fff' } },
      z: { dropdown: { $value: '5' } },
      radius: { md: { $value: 'url(x)' } },
    },
  };
  const expected = validateTheme(fromDtcg(dtcg, { name: 'x', extends: 'default' }), { identity: false }).errors.map((error) => error.message);
  assert.equal(expected.length, 4);
  withDirectory((directory) => {
    const file = path.join(directory, 'invalide.tokens.json');
    writeFileSync(file, JSON.stringify(dtcg));
    for (const command of ['check', 'build']) {
      const result = runCli([command, '--theme', file, '--name', 'invalide', '--out', path.join(directory, 'x.css')]);
      assert.equal(result.status, 1);
      assert.deepEqual(result.stderr.trim().split('\n').map((line) => line.replace(/^Erreur : /, '')), expected);
      assert.deepEqual(readdirSync(directory), ['invalide.tokens.json'], 'aucun CSS écrit pour un thème refusé');
    }
  });
});

test('le CLI refuse les références DTCG et les jetons hors sys', () => {
  withDirectory((directory) => {
    const file = path.join(directory, 'ref.tokens.json');
    writeFileSync(file, JSON.stringify({ sys: { color: { primary: { $value: '{ref.color.blue.500}' } } } }));
    assert.equal(runCli(['check', '--theme', file]).status, 1);
  });
});

test('le CLI et le module calculent les mêmes ratios de contraste', async () => {
  const definition = { name: 'x', extends: 'default', overrides: { 'color.primary': '#0b5f5a', 'color.on-primary': '#ffffff' } };
  const fromModule = checkContrast(resolveTheme(definition)).map(({ fg, bg, ratio }) => `${fg}/${bg} ${ratio.toFixed(2)}`);
  withDirectory((directory) => {
    const file = path.join(directory, 'p.tokens.json');
    writeFileSync(file, JSON.stringify(toDtcg(definition)));
    const { stdout, status } = runCli(['check', '--theme', file]);
    assert.equal(status, 0);
    const fromCli = [...stdout.matchAll(/(?:OK|KO)\s+([\d.]+):1 \(min [\d.]+\) sys\.(\S+) \/ sys\.(\S+)/g)].map(([, ratio, fg, bg]) => `${fg}/${bg} ${ratio}`);
    assert.deepEqual(fromCli, fromModule);
  });
});

test('le CLI refuse un nom de thème réservé', () => {
  withDirectory((directory) => {
    const file = path.join(directory, 'p.tokens.json');
    writeFileSync(file, JSON.stringify({ sys: {} }));
    const result = runCli(['build', '--theme', file, '--name', 'dark', '--out', path.join(directory, 'x.css')]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /nom du thème/);
  });
});
