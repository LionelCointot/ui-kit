import { afterEach, describe, expect, it, vi } from 'vitest';
import { lcAnimate } from './animate';

const KEYFRAMES: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
const OPTIONS = { duration: 'enter', easing: 'entrance', delay: 40 } as const;

describe('lcAnimate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it('joue les keyframes avec la durée et la courbe des rôles', () => {
    const animation = {} as Animation;
    const animate = vi.fn(() => animation);
    (Element.prototype as { animate?: unknown }).animate = animate;
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => ({ '--lc-sys-duration-enter': '450ms', '--lc-sys-easing-entrance': 'ease-out' })[name] ?? '' }));
    expect(lcAnimate(document.createElement('div'), KEYFRAMES, OPTIONS)).toBe(animation);
    expect(animate).toHaveBeenCalledWith(KEYFRAMES, { duration: 450, easing: 'ease-out', delay: 40, fill: 'backwards' });
  });

  it('accepte un token composant et une valeur de fill', () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => ({ '--lc-page-exit-duration': '190ms', '--lc-sheet-spring-easing': 'ease-in' })[name] ?? '' }));
    lcAnimate(document.createElement('div'), KEYFRAMES, { duration: '--lc-page-exit-duration', easing: '--lc-sheet-spring-easing', fill: 'both' });
    expect(animate).toHaveBeenCalledWith(KEYFRAMES, { duration: 190, easing: 'ease-in', delay: 0, fill: 'both' });
  });

  it('mouvement réduit : rien ne joue, l\'animation rendue est finie et attendable', async () => {
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const animation = lcAnimate(document.createElement('div'), KEYFRAMES, OPTIONS);
    expect(animate).not.toHaveBeenCalled();
    expect(animation.playState).toBe('finished');
    await expect(animation.finished).resolves.toBe(animation);
    expect(() => animation.cancel()).not.toThrow();
  });
});
