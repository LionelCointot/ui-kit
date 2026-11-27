import { describe, expect, it } from 'vitest';
import { curveOf } from './curve';

describe('curveOf', () => {
  it('cubic-bezier : part de 0, finit à 1, reste dans l\'intervalle sans dépassement', () => {
    const out = curveOf('cubic-bezier(0.215, 0.61, 0.355, 1)');
    expect(out(0)).toBeCloseTo(0, 5);
    expect(out(1)).toBeCloseTo(1, 5);
    expect(out(0.5)).toBeGreaterThan(0.5); // « out » : démarre vite
    expect(out(0.25)).toBeLessThan(out(0.5));
  });

  it('cubic-bezier avec dépassement : dépasse 1 avant de revenir', () => {
    const pop = curveOf('cubic-bezier(0.34, 1.7, 0.64, 1)');
    expect(Math.max(...Array.from({ length: 21 }, (_, i) => pop(i / 20)))).toBeGreaterThan(1.05);
    expect(pop(1)).toBeCloseTo(1, 5);
  });

  it('shortcut : toute autre courbe, valeur vide ou invalide donne une progression linéaire', () => {
    for (const css of ['linear', 'linear(0, 0.5, 1)', 'steps(4)', '', 'cubic-bezier(0.2, 0, 0)', 'cubic-bezier(a, b, c, d)']) {
      const curve = curveOf(css);
      expect([curve(0), curve(0.3), curve(1)]).toEqual([0, 0.3, 1]);
    }
  });
});
