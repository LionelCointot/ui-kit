// Acceptation de docs/specs/2026-12-mouvement-v2.md, tâche T1 : CA-1 (rôles sys et tokens composant de §5.2, valeurs, suppressions, repli sur sys).
// Les valeurs attendues viennent de la spec (§5.2), pas du code. Les tokens composant sont cherchés par valeur sous le préfixe
// `--lc-<groupe>-` (la spec ne nomme pas les suffixes) ; seuls button.press-*, spinner.duration, skeleton.duration et shell.nav-duration ont un nom imposé.
import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCss, declarations, resolve, sameValue, tokenMap, toBezier, toMs } from './motion-css.mjs';

let css;
before(() => { css = buildCss(); });

const THEMES = ['default', 'dark'];
const ref = (map, name) => resolve(map, name);
const viaRef = (chain) => chain.some((n) => n.startsWith('--lc-ref-'));

// --- Rôles sys (§5.2) ---------------------------------------------------------------------------------------------------------------------
const EASINGS = {
  standard: [0.2, 0, 0, 1], entrance: [0.16, 1, 0.3, 1], fill: [0.16, 1, 0.3, 1], out: [0.215, 0.61, 0.355, 1],
  pop: [0.34, 1.7, 0.64, 1], 'pop-strong': [0.34, 2, 0.64, 1], title: [0.22, 1, 0.36, 1], draw: [0.455, 0.03, 0.515, 0.955],
  inout: [0.645, 0.045, 0.355, 1], exit: [0.42, 0, 1, 1], stack: [0.32, 0.72, 0, 1],
};
const DURATIONS = { fast: 150, exit: 200, normal: 250, enter: 450, move: 500, long: 600, view: 700, title: 850, draw: 1100, fill: 950 };
const OTHERS = {
  'motion-offset-sm': '8px', 'motion-offset-md': '16px', 'motion-offset-lg': '26px', 'motion-offset-xl': '40px',
  'motion-stagger-fine': '12ms', 'motion-stagger-normal': '40ms', 'motion-stagger-cards': '60ms', 'motion-stagger-chars': '22ms',
  'motion-stagger-cap': '8', 'motion-scale-pop': '0.94', 'motion-scale-enter': '0.95', 'motion-rotate-tilt': '2.5deg', 'motion-rotate-char': '6deg',
};

for (const theme of THEMES) {
  test(`CA-1 : courbes sys-easing-* de §5.2 à 1e-3 près, référencées sur ref (${theme})`, () => {
    const map = tokenMap(css, theme);
    for (const [role, expected] of Object.entries(EASINGS)) {
      const { value, chain } = ref(map, `--lc-sys-easing-${role}`);
      const actual = toBezier(value);
      assert.ok(actual, `--lc-sys-easing-${role} absent ou pas une cubic-bezier (${value})`);
      assert.ok(actual.every((n, i) => Math.abs(n - expected[i]) <= 1e-3), `--lc-sys-easing-${role} : ${value}, attendu cubic-bezier(${expected.join(', ')})`);
      assert.ok(viaRef(chain), `--lc-sys-easing-${role} doit référencer un --lc-ref-*`);
    }
  });

  test(`CA-1 : durées sys-duration-* de §5.2 à 1 ms près, référencées sur ref (${theme})`, () => {
    const map = tokenMap(css, theme);
    for (const [role, expected] of Object.entries(DURATIONS)) {
      const { value, chain } = ref(map, `--lc-sys-duration-${role}`);
      assert.equal(toMs(value) === undefined ? undefined : Math.round(toMs(value)), expected, `--lc-sys-duration-${role} : ${value}, attendu ${expected}ms`);
      assert.ok(viaRef(chain), `--lc-sys-duration-${role} doit référencer un --lc-ref-*`);
    }
  });

  test(`CA-1 : distances, décalages, plafond, échelles et angles de §5.2 (${theme})`, () => {
    const map = tokenMap(css, theme);
    for (const [role, expected] of Object.entries(OTHERS)) {
      const { value, chain } = ref(map, `--lc-sys-${role}`);
      assert.ok(sameValue(value, expected), `--lc-sys-${role} : ${value}, attendu ${expected}`);
      assert.ok(viaRef(chain), `--lc-sys-${role} doit référencer un --lc-ref-*`);
    }
  });
}

// --- Noms supprimés (changements de contrat, §5.2) -------------------------------------------------------------------------------------------
test('CA-1 : --lc-sys-motion-offset, --lc-sys-motion-stagger et --lc-ref-motion-stagger (feuilles) n\'existent plus, ni en déclaration ni en var()', () => {
  for (const name of ['--lc-sys-motion-offset', '--lc-sys-motion-stagger', '--lc-ref-motion-stagger']) {
    const found = Object.entries(css).filter(([, text]) => new RegExp(`${name}(?![-\\w])`).test(text)).map(([file]) => file);
    assert.deepEqual(found, [], `${name} subsiste dans ${found.join(', ')}`);
  }
});

// --- Tokens composant (§5.2) -------------------------------------------------------------------------------------------------------------------
// Chaque valeur attendue : durée en ms ('450ms'), nombre, longueur, pourcentage ou courbe (par nom de rôle sys).
// Un nombre de pourcentage est accepté en pourcentage ou en fraction.
const E = (role) => `cubic-bezier(${EASINGS[role].join(', ')})`;
const GROUPS = {
  tabbar: ['700ms', '200ms', '90px'],
  tabs: ['380ms', E('title'), '400ms', E('inout'), '80ms'],
  'nav-item': ['380ms', E('title'), '400ms', E('inout'), '80ms'],
  'segmented-control': ['300ms', E('out'), '410ms', E('inout'), '75ms'],
  page: ['190ms', '16px', '700ms', '26px', '500ms', '30%', '0.12'],
  dialog: ['0.86', '500ms', '200ms', '0.94'],
  drawer: ['600ms', '320ms', '200ms'],
  sheet: ['550ms', '300ms', '500ms', '24px', '92dvh'],
  popover: ['450ms', '0.95', '-3.7px', '150ms'],
  menu: ['400ms', '0.92', '150ms', '-6px'],
  toast: ['500ms', '30px', '0.94', '250ms', '16px', 'cubic-bezier(0.55, 0.085, 0.68, 0.53)'],
  switch: ['465ms'],
  steps: ['800ms', '117ms'],
  'count-up': ['1200ms'],
  flash: ['950ms'],
  title: ['115%', '700ms', E('inout'), '320ms'],
  live: ['2000ms', '0.1', '0.45'],
  lift: ['-4px', '450ms', '500ms', E('out')],
  calendar: ['18px', '450ms', '30ms'],
  list: ['420ms', E('draw')],
  chart: ['1300ms', '700ms', '20ms'],
  topbar: ['10px', '500ms', '30ms'],
  reveal: ['550ms', E('out'), '850ms'],
  disclosure: ['300ms', '100ms', '-5px'],
};
const matches = (value, expected) => sameValue(value, expected) || (/^\d+%$/.test(expected) && sameValue(value, String(parseFloat(expected) / 100)));

for (const [group, expectedValues] of Object.entries(GROUPS)) {
  test(`CA-1 : tokens composant --lc-${group}-* (valeurs de §5.2)`, () => {
    const map = tokenMap(css, 'default');
    const resolved = [...map.keys()].filter((n) => n.startsWith(`--lc-${group}-`)).map((n) => [n, resolve(map, n).value]);
    const missing = expectedValues.filter((expected) => !resolved.some(([, value]) => matches(value, expected)));
    assert.deepEqual(missing, [], `valeurs sans token sous --lc-${group}-* : ${missing.join(' ; ')} (tokens trouvés : ${resolved.map(([n, v]) => `${n}=${v}`).join(', ') || 'aucun'})`);
  });
}

// Noms imposés par la spec
test('CA-1/CA-22 : --lc-button-press-duration vaut 100ms, découplé de duration-fast ; --lc-button-press-scale vaut 0.97', () => {
  const map = tokenMap(css, 'default');
  const press = resolve(map, '--lc-button-press-duration');
  assert.equal(toMs(press.value), 100);
  assert.ok(!press.chain.includes('--lc-sys-duration-fast'), 'doit être découplé de --lc-sys-duration-fast (150 ms)');
  assert.equal(resolve(map, '--lc-button-press-scale').value, '0.97');
});

test('CA-1 : --lc-spinner-duration vaut 700ms ; --lc-skeleton-duration existe (1500ms, valeur gardée) ', () => {
  const map = tokenMap(css, 'default');
  const spinner = resolve(map, '--lc-spinner-duration');
  assert.equal(toMs(spinner.value), 700);
  const skeleton = resolve(map, '--lc-skeleton-duration');
  assert.equal(toMs(skeleton.value), 1500);
});

test('CA-36 : --lc-tabbar-enter-easing = expo.out du site (sys entrance), barre de 66px, pastille de rayon 16px', () => {
  const map = tokenMap(css, 'default');
  const easing = resolve(map, '--lc-tabbar-enter-easing');
  assert.ok(matches(easing.value, E('entrance')), `--lc-tabbar-enter-easing = ${easing.value}`);
  assert.ok(easing.chain.includes('--lc-sys-easing-entrance'), 'doit référencer le rôle sys entrance');
  assert.equal(resolve(map, '--lc-tabbar-height').value, '66px');
  assert.equal(resolve(map, '--lc-tabbar-indicator-radius').value, '16px');
});

test('CA-1 : --lc-shell-nav-duration garde sa valeur actuelle (350ms) malgré la revalorisation de duration-long', () => {
  assert.equal(toMs(resolve(tokenMap(css, 'default'), '--lc-shell-nav-duration').value), 350);
});

// --- Repli composant -> sys ------------------------------------------------------------------------------------------------------------------------
// Un token composant (des groupes ci-dessus) dont la valeur est celle d'un rôle sys de courbe ou de durée doit s'y replier par var(), jamais la répéter en littéral.
test('CA-1 : repli sur sys : un token composant égal à une courbe ou une durée de rôle sys passe par var(--lc-sys-*)', () => {
  const map = tokenMap(css, 'default');
  const sysEasings = Object.keys(EASINGS).map((r) => [r, toBezier(resolve(map, `--lc-sys-easing-${r}`).value)]).filter(([, b]) => b);
  const sysDurations = Object.keys(DURATIONS).map((r) => [r, toMs(resolve(map, `--lc-sys-duration-${r}`).value)]);
  assert.equal(sysEasings.length, Object.keys(EASINGS).length, 'les 12 courbes sys doivent exister (sinon le contrôle de repli est vide)');
  const offenders = [];
  let checked = 0;
  for (const [name, raw] of declarations(css['lc-tokens'])) {
    if (!Object.keys(GROUPS).some((g) => name.startsWith(`--lc-${g}-`))) continue;
    const { value, chain } = resolve(map, name);
    const bezier = toBezier(value);
    const ms = /delay|stagger|offset/.test(name) ? undefined : toMs(value);
    const sys = bezier ? sysEasings.find(([, b]) => b.every((n, i) => Math.abs(n - bezier[i]) <= 1e-3)) : ms === undefined ? undefined : sysDurations.find(([, d]) => d === ms);
    if (!sys) continue;
    checked += 1;
    if (!chain.some((n) => n.startsWith('--lc-sys-'))) offenders.push(`${name}: ${raw} (= rôle sys ${sys[0]})`);
  }
  assert.ok(checked > 0, 'aucun token composant ne correspond à un rôle sys : contrôle vide');
  assert.deepEqual(offenders, []);
});
