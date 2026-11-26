// CA-1b (docs/specs/2026-12-mouvement-v2.md, T1 ; ADR 0011 décision 6) : un thème produit peut surcharger les rôles et les tokens composant de mouvement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PACKAGE_ROOT } from './tokens.mjs';

const CLI = path.join(PACKAGE_ROOT, 'bin', 'lc-tokens.mjs');
const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

// Thème de test : un rôle de chaque famille (durée, courbe, décalage, échelle) et un token composant, valeurs volontairement différentes de la base.
const THEME = {
  sys: {
    duration: { fast: { $value: '120ms', $type: 'duration' } },
    easing: { standard: { $value: 'cubic-bezier(0.1, 0, 0, 1)', $type: 'cubicBezier' } },
    motion: {
      'stagger-normal': { $value: '55ms', $type: 'duration' },
      'scale-pop': { $value: '0.9', $type: 'number' },
    },
  },
  button: { 'press-duration': { $value: '80ms', $type: 'duration' } },
};
const EXPECTED = {
  '--lc-sys-duration-fast': '120ms',
  '--lc-sys-easing-standard': 'cubic-bezier(0.1, 0, 0, 1)',
  '--lc-sys-motion-stagger-normal': '55ms',
  '--lc-sys-motion-scale-pop': '0.9',
  '--lc-button-press-duration': '80ms',
};

for (const base of ['default', 'dark']) {
  test(`CA-1b : lc-tokens check accepte un thème qui surcharge rôles et token composant de mouvement, build les écrit (base ${base})`, () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'lc-tokens-motion-'));
    try {
      const file = path.join(directory, 'mouvement.tokens.json');
      const out = path.join(directory, 'mouvement.css');
      writeFileSync(file, JSON.stringify(THEME));

      const check = run(['check', '--theme', file, '--extends', base]);
      assert.equal(check.status, 0, `check refuse le thème : ${check.stderr.trim()}`);

      const build = run(['build', '--theme', file, '--name', 'mouvement', '--extends', base, '--out', out]);
      assert.equal(build.status, 0, `build refuse le thème : ${build.stderr.trim()}`);
      const css = readFileSync(out, 'utf8');
      assert.match(css, /\[data-theme="mouvement"\]/);
      for (const [name, value] of Object.entries(EXPECTED)) {
        assert.match(css, new RegExp(`^\\s*${name}: ${value.replace(/[()]/g, '\\$&')};`, 'm'), `${name} : ${value} absent du CSS du thème`);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
