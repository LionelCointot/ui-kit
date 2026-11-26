import { afterEach, describe, expect, it, vi } from 'vitest';
import { cssMs, lcReadMotion } from './motion-tokens';

const style = (value: string) => ({ getPropertyValue: () => value }) as unknown as CSSStyleDeclaration;

describe('cssMs', () => {
  it('lit des millisecondes et des secondes', () => {
    expect(cssMs(style('450ms'), '--x')).toBe(450);
    expect(cssMs(style(' 0.35s '), '--x')).toBe(350);
  });

  it('est NaN sans valeur', () => expect(cssMs(style(''), '--x')).toBeNaN());
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

  it('jeton absent : durée 0 et courbe linear', () => {
    stub({});
    expect(lcReadMotion(document.createElement('div'), 'draw', 'pop')).toEqual({ duration: 0, easing: 'linear' });
  });
});
