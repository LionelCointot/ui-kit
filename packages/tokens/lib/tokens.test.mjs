import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PACKAGE_ROOT } from './tokens.mjs';

const CLI = path.join(PACKAGE_ROOT, 'bin', 'lc-tokens.mjs');

function buildTheme(theme, baseTheme) {
  const directory = mkdtempSync(path.join(tmpdir(), 'lc-tokens-'));
  try {
    const themeFile = path.join(directory, 'produit.tokens.json');
    const out = path.join(directory, 'produit.css');
    writeFileSync(themeFile, JSON.stringify(theme));
    execFileSync(process.execPath, [CLI, 'build', '--theme', themeFile, '--name', 'produit', '--extends', baseTheme, '--out', out], { stdio: 'pipe' });
    return readFileSync(out, 'utf8');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('build --extends dark fusionne la base sombre avec les surcharges du produit', () => {
  const css = buildTheme({ sys: { color: { primary: { $value: '#5fcbc2', $type: 'color' } } } }, 'dark');
  assert.match(css, /\[data-theme="produit"\]/);
  assert.match(css, /--lc-sys-color-primary: #5fcbc2;/);
  // Jeton non surchargé : la valeur sombre de la base (blue.700), pas la valeur claire de :root.
  assert.match(css, /--lc-sys-color-primary-container: var\(--lc-ref-color-blue-700\);/);
});
