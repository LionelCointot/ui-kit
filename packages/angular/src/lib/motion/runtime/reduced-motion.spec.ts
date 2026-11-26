import { afterEach, describe, expect, it, vi } from 'vitest';
import { lcPrefersReducedMotion } from './reduced-motion';

describe('lcPrefersReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('suit la requête prefers-reduced-motion', () => {
    for (const matches of [true, false]) {
      const matchMedia = vi.fn(() => ({ matches }));
      vi.stubGlobal('matchMedia', matchMedia);
      expect(lcPrefersReducedMotion()).toBe(matches);
      expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    }
  });

  it('est faux sans matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(lcPrefersReducedMotion()).toBe(false);
  });
});
