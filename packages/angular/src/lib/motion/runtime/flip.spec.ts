import { afterEach, describe, expect, it, vi } from 'vitest';
import { lcFlipPlay, lcFlipRead } from './flip';

const el = (): Element => document.createElement('div');

/** Environnement du navigateur : `animate` présent, mouvement non réduit, jetons de liste lisibles. */
function stubBrowser(reduced = false) {
  const animate = vi.fn(() => ({ cancel() {} }) as unknown as Animation);
  (Element.prototype as { animate?: unknown }).animate = animate;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => ({ '--lc-list-move-duration': '420ms', '--lc-list-move-easing': 'ease-in-out' })[name] ?? '' }));
  return animate;
}

describe('lcFlipRead', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it('lit le haut de chaque élément', () => {
    stubBrowser();
    const [a, b] = [el(), el()];
    vi.spyOn(a, 'getBoundingClientRect').mockReturnValue({ top: 10 } as DOMRect);
    vi.spyOn(b, 'getBoundingClientRect').mockReturnValue({ top: 46 } as DOMRect);
    expect([...lcFlipRead([a, b])]).toEqual([[a, 10], [b, 46]]);
  });

  it('ne lit rien sous mouvement réduit ni sans Element.animate', () => {
    const a = el();
    const read = vi.spyOn(a, 'getBoundingClientRect');
    expect(lcFlipRead([a]).size).toBe(0); // jsdom : pas d'animate
    stubBrowser(true);
    expect(lcFlipRead([a]).size).toBe(0);
    expect(read).not.toHaveBeenCalled();
  });
});

describe('lcFlipPlay', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it('anime de l\'ancienne à la nouvelle place, en transform, aux jetons list-move', () => {
    const animate = stubBrowser();
    const [a, b] = [el(), el()];
    const played = lcFlipPlay(new Map([[a, 0], [b, 36]]), new Map([[a, 36], [b, 0]]));
    expect(played).toHaveLength(2);
    expect(animate).toHaveBeenNthCalledWith(1, [{ transform: 'translateY(-36px)' }, { transform: 'none' }], { duration: 420, easing: 'ease-in-out', delay: 0, fill: 'backwards' });
    expect(animate).toHaveBeenNthCalledWith(2, [{ transform: 'translateY(36px)' }, { transform: 'none' }], expect.objectContaining({ duration: 420 }));
  });

  it('seuil de 0,5 px : sous le seuil, rien ; au seuil, une animation', () => {
    const animate = stubBrowser();
    const [still, moved] = [el(), el()];
    lcFlipPlay(new Map([[still, 10], [moved, 10]]), new Map([[still, 10.4], [moved, 10.5]]));
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.contexts[0]).toBe(moved);
  });

  it('un élément ajouté ou retiré n\'est pas animé (l\'entrée et la sortie ont les leurs)', () => {
    const animate = stubBrowser();
    const [kept, added, removed] = [el(), el(), el()];
    lcFlipPlay(new Map([[kept, 0], [removed, 36]]), new Map([[kept, 0], [added, 36]]));
    expect(animate).not.toHaveBeenCalled();
  });
});
