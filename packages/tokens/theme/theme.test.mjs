import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  baseValues, checkContrast, deriveContainer, deriveOnColor, fromDtcg, overrideVars, renderThemeCss, resolveTheme,
  motionSchema, themeFontStacks, themeSchema, toDtcg, validateTheme, contrastRatio, cssVarOf,
} from './index.js';

const theme = (overrides = {}, extra = {}) => ({ name: 'mon-theme', extends: 'default', overrides, ...extra });
const errorsOf = (overrides, extra) => validateTheme(theme(overrides, extra)).errors;

const INJECTIONS = ['red;}body{display:none', 'url(https://example.test/x.png)', '{', '}', '<', '<script>', 'a\\b', '#fff;', '#ff', 'expression(1)', '', ' ', '#fff\n', '@import "x"', '/* x */'];

describe('validation des valeurs', () => {
  test('une valeur correcte par type est acceptée', () => {
    const overrides = {
      'color.primary': '#0b5f5a',
      'color.on-primary': '#FFF',
      'color.focus-ring': '#0b5f5acc',
      'color.border': 'rgb(10, 20, 30)',
      'color.backdrop': 'rgba(0, 0, 0, 0.45)',
      'radius.md': '12px',
      'space.2': '0.5rem',
      'radius.none': '0',
      'state.hover-opacity': '0.1',
      'font.family.base': 'Segoe UI, Arial, sans-serif',
      'font.family.mono': themeFontStacks[1].value,
      'shadow.1': '0 1px 2px rgba(11, 11, 11, 0.06), 0 1px 1px #0000000a',
      'shadow.2': 'none',
    };
    assert.deepEqual(errorsOf(overrides), []);
  });

  test('toute tentative d’injection est refusée, pour chaque type', () => {
    for (const injection of INJECTIONS) {
      for (const path of ['color.primary', 'radius.md', 'space.2', 'state.hover-opacity', 'font.family.base', 'shadow.1']) {
        const { valid, errors } = validateTheme(theme({ [path]: injection }));
        assert.equal(valid, false, `${path} = ${JSON.stringify(injection)} aurait dû être refusé`);
        assert.equal(errors[0].code, 'invalid-value');
        assert.equal(errors[0].path, path);
      }
    }
  });

  test('valeurs hors du type, hors bornes ou non textuelles', () => {
    const invalid = {
      'color.primary': 'red',
      'color.border': 'rgb(300, 0, 0)',
      'color.surface': 'hsl(0, 0%, 0%)',
      'radius.md': '12',
      'space.2': '1vw',
      'state.hover-opacity': '-1',
      'shadow.1': '0 1px 2px red',
      'font.family.base': 'inherit',
    };
    for (const [path, value] of Object.entries(invalid)) assert.equal(validateTheme(theme({ [path]: value })).valid, false, path);
    assert.equal(validateTheme(theme({ 'color.primary': 12 })).valid, false);
    assert.equal(validateTheme(theme({ 'color.primary': null })).valid, false);
    assert.equal(validateTheme(theme({ 'color.primary': ['#fff'] })).valid, false);
  });

  test('chemins inconnus (suggestion), non modifiables et clés dangereuses', () => {
    const [typo] = errorsOf({ 'color.primay': '#fff' });
    assert.equal(typo.code, 'unknown-token');
    assert.equal(typo.suggestion, 'color.primary');
    assert.match(typo.message, /color\.primary/);
    assert.equal(errorsOf({ 'z.dropdown': '5' })[0].code, 'not-editable');
    // Mouvement (CA-1b) : surchargeable par un thème, valeur contrôlée ; l'appui du bouton aussi, et le type est vérifié.
    assert.deepEqual(errorsOf({ 'duration.fast': '1s', 'button.press-duration': '80ms', 'popover.enter-offset': '-3.7px' }), []);
    assert.equal(errorsOf({ 'duration.fast': 'url(x)' })[0].code, 'invalid-value');
    assert.equal(errorsOf({ 'easing.pop': 'cubic-bezier(0.3, 1, 0.6)' })[0].code, 'invalid-value');
    assert.equal(errorsOf({ 'ref.color.blue.500': '#fff' })[0].code, 'unknown-token');
    const polluted = JSON.parse('{"__proto__": "#fff", "constructor": "#fff"}');
    assert.equal(validateTheme(theme(polluted)).errors.length, 2);
  });
});

describe('nom, schéma et thème de base', () => {
  test('nom, libellé et base', () => {
    for (const name of ['', 'Mon', '1abc', 'a_b', 'a b', 'a'.repeat(49), 'default', 'dark', 'x"]{}', 42, undefined]) {
      assert.equal(validateTheme(theme({}, { name })).valid, false, String(name));
    }
    for (const name of ['a', 'finance-dark', 'a'.repeat(48)]) assert.equal(validateTheme(theme({}, { name })).valid, true, name);
    assert.equal(validateTheme(theme({}, { label: 'Thème « perso »' })).valid, true);
    for (const label of ['', '   ', 'x'.repeat(61), 'a\u0000b', 12]) assert.equal(validateTheme(theme({}, { label })).valid, false, String(label));
    assert.equal(validateTheme({ ...theme(), extends: 'sepia' }).errors[0].code, 'invalid-base');
    assert.equal(validateTheme(null).valid, false);
    assert.equal(validateTheme('x').valid, false);
    assert.equal(validateTheme({ ...theme(), overrides: [] }).valid, false);
    assert.equal(validateTheme({ ...theme(), name: 'default' }, { identity: false }).valid, true);
  });

  test('le schéma couvre les tokens sys éditables et exclut z, duration et easing', () => {
    assert.ok(themeSchema.length > 90);
    assert.ok(themeSchema.every((entry) => !/^(z|duration|easing)\./.test(entry.path)));
    assert.ok(themeSchema.every((entry) => entry.cssVar === cssVarOf(entry.path)));
    assert.deepEqual(new Set(themeSchema.map((entry) => entry.type)), new Set(['color', 'dimension', 'fontFamily', 'number', 'shadow']));
    for (const path of ['color.primary', 'color.secondary', 'color.neutral', 'color.surface', 'color.background', 'radius.md', 'font.family.base', 'space.4']) {
      assert.equal(themeSchema.find((entry) => entry.path === path)?.simple, true, path);
    }
    assert.ok(Object.keys(baseValues('dark')).every((path) => path in baseValues('default')));
    assert.throws(() => baseValues('sepia'));
  });
});

describe('fusion et rendu CSS', () => {
  test('resolveTheme fusionne la base et les surcharges ; renderThemeCss les rend', () => {
    const dark = theme({ 'color.primary': '#5fcbc2' }, { extends: 'dark' });
    const resolved = resolveTheme(dark);
    assert.equal(resolved['--lc-sys-color-primary'], '#5fcbc2');
    assert.equal(resolved['--lc-sys-color-surface'], baseValues('dark')['color.surface']);
    assert.equal(Object.keys(resolved).length, Object.keys(baseValues('dark')).length);
    assert.deepEqual(overrideVars(dark), { '--lc-sys-color-primary': '#5fcbc2' });
    const css = renderThemeCss(dark);
    assert.match(css, /^\[data-theme="mon-theme"\] \{\n/);
    assert.match(css, /--lc-sys-color-primary: #5fcbc2;/);
    assert.equal(css.split('\n').filter((line) => line.startsWith('  --')).length, Object.keys(resolved).length);
  });

  test('renderThemeCss, resolveTheme, overrideVars et toDtcg refusent un thème invalide', () => {
    const bad = theme({ 'color.primary': 'red;}body{display:none' });
    for (const action of [renderThemeCss, resolveTheme, overrideVars, toDtcg]) assert.throws(() => action(bad), /invalide/);
    assert.throws(() => renderThemeCss(theme({}, { name: 'default' })), /réservé/);
    assert.doesNotThrow(() => resolveTheme(theme({}, { name: 'default' })));
  });

  test('un thème sans surcharge est accepté et identique à sa base', () => {
    const resolved = resolveTheme(theme());
    for (const [path, value] of Object.entries(baseValues('default'))) assert.equal(resolved[cssVarOf(path)], value);
  });
});

describe('contraste', () => {
  // CA-K2.1 : les deux paires du rôle highlight (texte sur plein, texte sur conteneur), seuil 4,5:1.
  const HIGHLIGHT_PAIRS = [
    ['color.on-highlight', 'color.highlight'],
    ['color.on-highlight-container', 'color.highlight-container'],
  ];

  test('contraste : ratios connus et paires des thèmes de base (dont highlight)', () => {
    assert.equal(Math.round(contrastRatio('#000000', '#ffffff') * 100) / 100, 21);
    for (const base of ['default', 'dark']) {
      const results = checkContrast(resolveTheme(theme({}, { extends: base })));
      assert.equal(results.length, 32, `${base} : 30 paires historiques + 2 paires highlight`);
      for (const [fg, bg] of HIGHLIGHT_PAIRS) {
        const pair = results.find((result) => result.fg === fg && result.bg === bg);
        assert.ok(pair, `${base} : paire ${fg} / ${bg} absente`);
        assert.equal(pair.required, 4.5);
        assert.ok(pair.pass && pair.ratio >= 4.5, `${base} : ${fg} / ${bg} = ${pair.ratio}`);
      }
      assert.ok(results.every((result) => result.pass), `${base} : ${results.filter((r) => !r.pass).map((r) => r.fg)}`);
    }
    const weak = checkContrast(resolveTheme(theme({ 'color.on-primary': '#ffffff', 'color.primary': '#aaaaaa' })));
    const pair = weak.find((result) => result.fg === 'color.on-primary' && result.bg === 'color.primary');
    assert.equal(pair.pass, false);
    assert.equal(pair.required, 4.5);
    assert.ok(Math.abs(pair.ratio - 2.32) < 0.01);
    assert.equal(pair.fgValue, '#ffffff');
  });

  test('contraste : une couleur translucide est ignorée', () => {
    const resolved = resolveTheme(theme({ 'color.primary': '#0b5f5acc' }));
    const base = checkContrast(resolveTheme(theme())).length;
    assert.equal(checkContrast(resolved).length, base - 4, "primary figure dans quatre paires, ignorées une fois translucide");
    assert.ok(!checkContrast(resolved).some((pair) => pair.fg === 'color.primary' || pair.bg === 'color.primary'));
  });
});

describe('export DTCG', () => {
  test('DTCG : export, aller-retour et refus des jetons non éditables', () => {
    const definition = theme({ 'color.primary': '#0b5f5a', 'radius.md': '12px', 'font.family.base': 'Segoe UI, Arial', 'shadow.1': '0 1px 2px #00000033', 'state.hover-opacity': '0.1' });
    const dtcg = toDtcg(definition);
    assert.deepEqual(dtcg.sys.color.primary, { $value: '#0b5f5a', $type: 'color' });
    assert.deepEqual(dtcg.sys.radius.md, { $value: '12px', $type: 'dimension' });
    assert.equal(dtcg.sys.state['hover-opacity'].$type, 'number');
    assert.equal(dtcg.sys.font.family.base.$type, 'fontFamily');
    assert.equal(dtcg.sys.shadow['1'].$type, 'shadow');
    const back = fromDtcg(JSON.parse(JSON.stringify(dtcg)), { name: 'mon-theme', extends: 'default' });
    assert.deepEqual(back, definition);

    const imported = fromDtcg({ $description: 'x', sys: { color: { primay: { $value: '#fff' }, primary: { $value: '{ref.color.blue.500}' } } }, ref: { color: { x: { $value: '#fff' } } }, color: { primary: { $value: '#fff' } } }, { name: 'x', extends: 'dark' });
    const paths = validateTheme(imported).errors.map((error) => error.path).sort();
    assert.deepEqual(paths, ['color.primary', 'color.primay', 'ref.color.x', '~color.primary']);
    assert.deepEqual(validateTheme(fromDtcg({}, { name: 'vide', extends: 'default' })), { valid: true, errors: [] });
    assert.deepEqual(fromDtcg({ sys: { state: { 'hover-opacity': { $value: 0.1 } } } }, { name: 'x', extends: 'default' }).overrides, { 'state.hover-opacity': '0.1' });
  });
});

describe('dérivations', () => {
  test('dérivations : texte lisible et variante container', () => {
    assert.equal(deriveOnColor('#ffffff'), '#000000');
    assert.equal(deriveOnColor('#0b5f5a'), '#ffffff');
    assert.equal(deriveOnColor('#fde68a'), '#000000');
    assert.throws(() => deriveOnColor('rgba(0, 0, 0, 0.5)'), RangeError);
    for (const color of ['#0b5f5a', '#1c5cab', '#ffc107', '#c62828', '#7e57c2']) {
      for (const scheme of ['light', 'dark']) {
        const { container, onContainer } = deriveContainer(color, scheme);
        assert.match(container, /^#[0-9a-f]{6}$/);
        assert.ok(contrastRatio(onContainer, container) >= 4.5, `${color} ${scheme}`);
      }
    }
    const light = deriveContainer('#1c5cab', 'light').container;
    const dark = deriveContainer('#1c5cab', 'dark').container;
    assert.ok(contrastRatio(light, '#ffffff') < contrastRatio(dark, '#ffffff'));
  });
});

describe('surcharges de mouvement (CA-1b)', () => {
  const overrides = { 'duration.fast': '120ms', 'button.press-duration': '80ms' };

  test('résolution : rôle sous --lc-sys-, token composant sous --lc-<composant>-', () => {
    assert.equal(resolveTheme(theme(overrides))['--lc-sys-duration-fast'], '120ms');
    assert.equal(resolveTheme(theme(overrides))['--lc-button-press-duration'], '80ms');
    assert.deepEqual(overrideVars(theme(overrides)), { '--lc-sys-duration-fast': '120ms', '--lc-button-press-duration': '80ms' });
  });

  test('une distance n\'accepte que des longueurs, un angle que des angles', () => {
    assert.equal(errorsOf({ 'motion.offset-sm': '10deg' })[0].code, 'invalid-value');
    assert.equal(errorsOf({ 'motion.rotate-tilt': '10px' })[0].code, 'invalid-value');
    assert.equal(errorsOf({ 'title.letter-rotate': '10px' })[0].code, 'invalid-value'); // composant : l'unité vient de la valeur de base
    assert.deepEqual(errorsOf({ 'motion.offset-sm': '10px', 'motion.rotate-tilt': '0.05turn', 'title.letter-offset': '120%' }), []);
  });

  test('seuils de geste et mise en page ne sont pas réglables par un thème', () => {
    for (const path of ['sheet.dismiss-ratio', 'sheet.top-radius', 'sheet.max-height', 'toast.tabbar-gap', 'dialog.sheet-radius']) {
      assert.ok(!motionSchema.some((entry) => entry.path === path), path);
    }
    assert.ok(motionSchema.some((entry) => entry.path === 'sheet.spring-duration'));
  });

  test('export DTCG puis import redonnent les mêmes surcharges', () => {
    const json = toDtcg(theme(overrides));
    assert.equal(json.sys.duration.fast.$value, '120ms');
    assert.equal(json.button['press-duration'].$value, '80ms');
    assert.deepEqual(fromDtcg(json, { name: 'mon-theme', extends: 'default' }).overrides, overrides);
  });
});
