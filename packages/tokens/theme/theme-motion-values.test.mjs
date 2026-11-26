// Acceptation T1 (docs/specs/2026-12-mouvement-v2.md, CA-1b ; ADR 0011 décision 6) : validation des valeurs de mouvement d'un thème,
// par validateTheme directement et par l'import DTCG (Theme builder, lc-tokens check). Fichier séparé de theme.test.mjs (celui du développeur).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { fromDtcg, validateTheme } from './index.js';

const MAX_VALUE_LENGTH = 300; // plafond des autres types (values.js)
const check = (overrides) => validateTheme({ name: 'x', extends: 'default', overrides }, { identity: false });
const refused = (path, value) => {
  const { valid, errors } = check({ [path]: value });
  assert.equal(valid, false, `${path} = ${JSON.stringify(String(value).slice(0, 60))} est accepté`);
  assert.deepEqual(errors.map((e) => [e.path, e.code]), [[path, 'invalid-value']]);
};
const accepted = (path, value) => assert.deepEqual(check({ [path]: value }), { valid: true, errors: [] }, `${path} = ${value} est refusé`);

// Un token de chaque type de mouvement : durée / décalage, courbe, distance, échelle, angle (rôles sys), courbe de composant.
const BY_TYPE = {
  duration: 'duration.fast', decalage: 'motion.stagger-normal', cubicBezier: 'easing.standard', distance: 'motion.offset-sm', echelle: 'motion.scale-pop', angle: 'motion.rotate-tilt',
};

describe('valeur vide ou trop longue', () => {
  for (const [type, path] of Object.entries(BY_TYPE)) {
    test(`${type} (${path}) : une chaîne vide est refusée`, () => refused(path, ''));
  }

  // Valeurs bien formées par ailleurs, mais de plus de 300 caractères.
  const LONG = {
    duration: `${'1'.repeat(MAX_VALUE_LENGTH)}ms`,
    decalage: `${'1'.repeat(MAX_VALUE_LENGTH)}ms`,
    cubicBezier: `cubic-bezier(0.1,${' '.repeat(MAX_VALUE_LENGTH)}0, 0, 1)`,
    distance: `${'1'.repeat(MAX_VALUE_LENGTH)}px`,
    echelle: '1'.repeat(MAX_VALUE_LENGTH + 1),
    angle: `${'1'.repeat(MAX_VALUE_LENGTH)}deg`,
  };
  for (const [type, path] of Object.entries(BY_TYPE)) {
    test(`${type} (${path}) : une valeur de plus de ${MAX_VALUE_LENGTH} caractères est refusée`, () => {
      assert.ok(LONG[type].length > MAX_VALUE_LENGTH);
      refused(path, LONG[type]);
    });
  }

  test('un token composant (courbe) est soumis au même plafond', () => {
    refused('tabs.indicator-front-easing', LONG.cubicBezier);
  });
});

describe('courbe piégée de 100 000 caractères (retour arrière de l\'expression régulière)', () => {
  const TRAP = `cubic-bezier(${'1'.repeat(100000)}x`;
  const MAX_MS = 50;

  test(`validateTheme la refuse en moins de ${MAX_MS} ms`, () => {
    const start = performance.now();
    const result = check({ 'easing.standard': TRAP });
    const elapsed = performance.now() - start;
    assert.deepEqual(result.errors.map((e) => [e.path, e.code]), [['easing.standard', 'invalid-value']]);
    assert.ok(elapsed < MAX_MS, `refus en ${Math.round(elapsed)} ms (attendu moins de ${MAX_MS} ms)`);
  });

  test(`l'import DTCG (fromDtcg puis validateTheme) la refuse en moins de ${MAX_MS} ms`, () => {
    const start = performance.now();
    const definition = fromDtcg({ sys: { easing: { standard: { $value: TRAP, $type: 'cubicBezier' } } } }, { name: 'x', extends: 'default' });
    const result = validateTheme(definition, { identity: false });
    const elapsed = performance.now() - start;
    assert.deepEqual(result.errors.map((e) => [e.path, e.code]), [['easing.standard', 'invalid-value']]);
    assert.ok(elapsed < MAX_MS, `refus en ${Math.round(elapsed)} ms (attendu moins de ${MAX_MS} ms)`);
  });
});

describe('cubic-bezier : x1 et x2 dans [0, 1], y1 et y2 libres', () => {
  for (const path of ['easing.standard', 'tabs.indicator-front-easing']) {
    test(`${path} : x1 ou x2 hors de [0, 1] est refusé`, () => {
      for (const value of ['cubic-bezier(5, 0, 0, 1)', 'cubic-bezier(1.01, 0, 0.5, 1)', 'cubic-bezier(-0.1, 0, 0.5, 1)', 'cubic-bezier(0.2, 0, 5, 1)', 'cubic-bezier(0.2, 0, -0.01, 1)']) refused(path, value);
    });

    test(`${path} : les bornes 0 et 1 et des y hors de [0, 1] (dépassement) sont acceptés`, () => {
      for (const value of ['cubic-bezier(0, 0, 1, 1)', 'cubic-bezier(0.34, 1.7, 0.64, 1)', 'cubic-bezier(0.34, 2, 0.64, 1)', 'cubic-bezier(0.4, -0.5, 0.6, 1.5)']) accepted(path, value);
    });
  }
});

// Correctif reporté de T1 : un saut de ligne dans une courbe ne doit pas être accepté par validateTheme (aujourd'hui seul le rendu le refuse).
describe('cubic-bezier : aucun saut de ligne dans la valeur, refusé dès validateTheme', () => {
  const WITH_NEWLINE = [
    'cubic-bezier(0.2,\n0, 0, 1)', 'cubic-bezier(\n0.2, 0, 0, 1)', 'cubic-bezier(0.2, 0, 0, 1\n)', 'cubic-bezier(0.2,\r\n0, 0, 1)',
    'cubic-bezier(0.2, 0,\r0, 1)', 'cubic-bezier(0.2, 0, 0, 1)\n',
  ];
  for (const path of ['easing.standard', 'tabs.indicator-front-easing']) {
    test(`${path} : une valeur avec \\n ou \\r est refusée (invalid-value)`, () => {
      for (const value of WITH_NEWLINE) refused(path, value);
    });
  }

  test('l\'import DTCG (fromDtcg puis validateTheme) la refuse aussi', () => {
    const definition = fromDtcg({ sys: { easing: { standard: { $value: 'cubic-bezier(0.2,\n0, 0, 1)', $type: 'cubicBezier' } } } }, { name: 'x', extends: 'default' });
    const result = validateTheme(definition, { identity: false });
    assert.deepEqual(result.errors.map((e) => [e.path, e.code]), [['easing.standard', 'invalid-value']]);
  });

  test('la même courbe sur une seule ligne reste acceptée', () => accepted('easing.standard', 'cubic-bezier(0.2, 0, 0, 1)'));
});

describe('une valeur invalide par type de mouvement est refusée avec invalid-value', () => {
  test('échelle (motion.scale-pop, motion.scale-enter)', () => {
    for (const path of ['motion.scale-pop', 'motion.scale-enter']) for (const value of ['abc', '0.9px', '-0.5', '1e3', '0.9 0.9', 'calc(1)']) refused(path, value);
  });
  test('angle (motion.rotate-tilt, motion.rotate-char)', () => {
    for (const path of ['motion.rotate-tilt', 'motion.rotate-char']) for (const value of ['6', 'abc', '6 deg', 'rotate(6deg)', 'calc(6deg)', '6deg;']) refused(path, value);
  });
  test('décalage (motion.stagger-*)', () => {
    for (const path of ['motion.stagger-fine', 'motion.stagger-chars']) for (const value of ['40', 'abc', '40px', '-40ms', '40 ms', 'calc(40ms)']) refused(path, value);
  });
  test('distance (motion.offset-*)', () => {
    for (const path of ['motion.offset-sm', 'motion.offset-xl']) for (const value of ['16', 'abc', '16 px', 'calc(16px)', 'var(--x)', '16px 8px', 'url(x)']) refused(path, value);
  });
  test('les valeurs bien formées de chaque type sont acceptées', () => {
    accepted('motion.scale-pop', '0.94');
    accepted('motion.rotate-tilt', '2.5deg');
    accepted('motion.stagger-fine', '12ms');
    accepted('motion.offset-md', '16px');
    accepted('duration.fast', '0.15s');
  });
});
