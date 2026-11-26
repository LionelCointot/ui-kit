import { afterEach, describe, expect, it, vi } from 'vitest';
import { lcCssMs, lcReadMotion } from './motion-tokens';

const style = (value: string) => ({ getPropertyValue: () => value }) as unknown as CSSStyleDeclaration;

describe('lcCssMs', () => {
  it('lit des millisecondes et des secondes', () => {
    expect(lcCssMs(style('450ms'), '--x')).toBe(450);
    expect(lcCssMs(style(' 0.35s '), '--x')).toBe(350);
  });

  it('est NaN sans valeur', () => expect(lcCssMs(style(''), '--x')).toBeNaN());
});

describe('lcReadMotion', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = (values: Record<string, string>) => {
    const getComputedStyle = vi.fn(() => ({ getPropertyValue: (name: string) => values[name] ?? '' }));
    vi.stubGlobal('getComputedStyle', getComputedStyle);
    return getComputedStyle;
  };

  it('lit la durée et la courbe du rôle, avec un seul getComputedStyle', () => {
    const read = stub({ '--lc-sys-duration-enter': '450ms', '--lc-sys-easing-entrance': ' cubic-bezier(0.16, 1, 0.3, 1) ' });
    expect(lcReadMotion(document.createElement('div'), 'enter', 'entrance')).toEqual({ duration: 450, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('accepte un token composant à la place d\'un rôle, pour la durée comme pour la courbe', () => {
    stub({ '--lc-page-exit-duration': '0.19s', '--lc-sheet-spring-easing': 'cubic-bezier(0.34, 1.7, 0.64, 1)', '--lc-sys-duration-enter': '450ms' });
    expect(lcReadMotion(document.createElement('div'), '--lc-page-exit-duration', '--lc-sheet-spring-easing')).toEqual({ duration: 190, easing: 'cubic-bezier(0.34, 1.7, 0.64, 1)' });
  });

  it('jeton absent : durée 0 et courbe linear', () => {
    stub({});
    expect(lcReadMotion(document.createElement('div'), 'draw', 'pop')).toEqual({ duration: 0, easing: 'linear' });
    expect(lcReadMotion(document.createElement('div'), '--lc-x-duration', '--lc-x-easing')).toEqual({ duration: 0, easing: 'linear' });
  });
});
