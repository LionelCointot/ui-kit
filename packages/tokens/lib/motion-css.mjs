// Outils communs aux tests de mouvement : lecture de la sortie construite (`npm run tokens:build`) et résolution des var().
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './tokens.mjs';

const FILES = ['lc-tokens', 'theme-default', 'theme-dark', 'base'];

export function buildCss() {
  execFileSync(process.execPath, [path.join(PACKAGE_ROOT, 'lib', 'build-all.mjs')], { stdio: 'pipe' });
  return Object.fromEntries(FILES.map((f) => [f, readFileSync(path.join(PACKAGE_ROOT, 'dist', 'css', `${f}.css`), 'utf8')]));
}

// Toutes les déclarations `--lc-…: valeur;` d'un fichier (un commentaire en fin de ligne est retiré).
export function declarations(text) {
  const map = new Map();
  for (const m of text.matchAll(/^\s*(--lc-[\w-]+): ([^;]+);/gm)) map.set(m[1], m[2].trim());
  return map;
}

// Table de jetons d'un thème : composants et ref (lc-tokens) puis rôles sys du thème.
export const tokenMap = (css, theme) => new Map([...declarations(css['lc-tokens']), ...declarations(css[`theme-${theme}`])]);

// Valeur finale d'un jeton et chaîne des jetons traversés (var(--a) -> var(--b) -> littéral).
export function resolve(map, name) {
  const chain = [];
  let value = map.get(name);
  while (value !== undefined) {
    const ref = value.match(/^var\((--lc-[\w-]+)\)$/)?.[1];
    if (!ref) break;
    chain.push(ref);
    value = map.get(ref);
  }
  return { value, chain };
}

export const toMs = (v) => {
  const m = /^(-?\d*\.?\d+)(ms|s)$/.exec(v ?? '');
  return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : undefined;
};

export const toBezier = (v) => {
  const m = /^cubic-bezier\(([^)]*)\)$/.exec(v ?? '');
  return m ? m[1].split(',').map(Number) : undefined;
};

const NUMBER_WITH_UNIT = /^(-?\d*\.?\d+)([a-z%]*)$/;

// Égalité de deux valeurs : durées à 1 ms près, courbes à 1e-3 près, nombres avec leur unité, sinon texte.
export function sameValue(actual, expected) {
  const [a, e] = [toMs(actual), toMs(expected)];
  if (a !== undefined && e !== undefined) return Math.abs(a - e) <= 1;
  const [ba, be] = [toBezier(actual), toBezier(expected)];
  if (ba && be) return ba.length === be.length && ba.every((n, i) => Math.abs(n - be[i]) <= 1e-3);
  const [na, ne] = [NUMBER_WITH_UNIT.exec(actual ?? ''), NUMBER_WITH_UNIT.exec(expected ?? '')];
  if (na && ne) return Number(na[1]) === Number(ne[1]) && na[2] === ne[2];
  return actual === expected;
}
