import { type LcThemeDefinition, baseValues, contrastRatio, validateTheme } from '@lionelcointot/ui-tokens/theme';
import { densityOf, initiallyUnlinked, relink, resetToken, setDensity, setToken, splitDimension, toPickerHex, valueOf } from './theme-model';

const empty: LcThemeDefinition = { name: 'essai', extends: 'default', overrides: {} };
const none = new Set<string>();

describe('theme-model', () => {
  it('setToken recalcule les couleurs liées à partir de leur source', () => {
    const theme = setToken(empty, 'color.primary', '#0b5f5a', none);
    expect(theme.overrides['color.primary']).toBe('#0b5f5a');
    // Valeur calculée identique à la base (blanc) : aucune surcharge inutile.
    expect(theme.overrides['color.on-primary']).toBeUndefined();
    expect(valueOf(theme, 'color.on-primary')).toBe('#ffffff');
    expect(setToken(empty, 'color.primary', '#fde68a', none).overrides['color.on-primary']).toBe('#000000');
    expect(theme.overrides['color.focus-ring']).toBe('#0b5f5a');
    expect(contrastRatio(theme.overrides['color.on-primary-container'], theme.overrides['color.primary-container'])).toBeGreaterThanOrEqual(4.5);
    expect(validateTheme(theme).valid).toBe(true);
  });

  it('une cible déliée garde sa valeur', () => {
    const base = setToken(empty, 'color.on-primary', '#000000', none);
    const theme = setToken(base, 'color.primary', '#fde68a', new Set(['color.on-primary']));
    expect(theme.overrides['color.on-primary']).toBe('#000000');
    expect(theme.overrides['color.primary-container']).toBeDefined();
  });

  it('une valeur identique à la base retire la surcharge', () => {
    const theme = setToken(empty, 'radius.md', baseValues('default')['radius.md'], none);
    expect(theme.overrides).toEqual({});
  });

  it('resetToken ramène la source et ses cibles liées à la base ; relink recalcule ou retire', () => {
    const edited = setToken(empty, 'color.primary', '#fde68a', none);
    expect(resetToken(edited, 'color.primary', none).overrides).toEqual({});
    expect(resetToken(edited, 'color.primary', new Set(['color.on-primary'])).overrides['color.on-primary']).toBe('#000000');
    const unlinked = { ...edited, overrides: { ...edited.overrides, 'color.on-primary': '#123456' } };
    expect(relink(unlinked, 'color.on-primary').overrides['color.on-primary']).toBe('#000000');
    expect(relink({ ...empty, overrides: { 'color.on-primary': '#123456' } }, 'color.on-primary').overrides).toEqual({});
  });

  it('initiallyUnlinked délie les cibles dont la valeur diffère de la dérivation', () => {
    const imported: LcThemeDefinition = { ...empty, overrides: { 'color.primary': '#0b5f5a', 'color.on-primary': '#ffffff', 'color.primary-container': '#d3ece9' } };
    expect([...initiallyUnlinked(imported)]).toEqual(['color.primary-container']);
  });

  it('densité : échelle d’espacement multipliée, détectée, et retour à la base', () => {
    const compact = setDensity(empty, 'compact');
    expect(compact.overrides['space.4']).toBe('12px');
    expect(densityOf(compact)).toBe('compact');
    expect(densityOf(setDensity(empty, 'comfortable'))).toBe('comfortable');
    expect(setDensity(compact, 'normal').overrides).toEqual({});
    expect(densityOf({ ...empty, overrides: { 'space.4': '17px' } })).toBeNull();
    expect(validateTheme(compact).valid).toBe(true);
  });

  it('utilitaires de valeur', () => {
    expect(valueOf(empty, 'color.primary')).toBe(baseValues('default')['color.primary']);
    expect(toPickerHex('#FFF')).toBe('#ffffff');
    expect(toPickerHex('rgba(0, 0, 0, 0.5)')).toBeNull();
    expect(splitDimension('0.5rem')).toEqual({ amount: 0.5, unit: 'rem' });
    expect(splitDimension('0')).toEqual({ amount: 0, unit: 'px' });
    expect(splitDimension('1vw')).toBeNull();
  });
});
