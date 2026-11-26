import { afterEach, describe, expect, it, vi } from 'vitest';
import * as kit from '@lionelcointot/ui-angular';

// Acceptation de docs/specs/2026-12-mouvement-v2.md, T2 : export public (§5.1), CA-19 (cas sans Element.animate, que jsdom reproduit : il n'a pas Element.animate),
// CA-4 (la préférence est relue à chaque appel). Le comportement réel (durées, courbes, mouvement réduit) est prouvé en navigateur :
// `node tools/qa/motion-runtime-browser.mjs`. Les exports sont lus par espace de noms : un export absent fait échouer le test, pas la compilation de toute la suite.
const exported = kit as unknown as Record<string, unknown>;
type Animate = (el: Element, keyframes: Keyframe[], options: { duration: string; easing: string }) => Animation;
const lcAnimate = () => exported['lcAnimate'] as Animate;
const KEYFRAMES: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

describe('T2 : API publique du runtime de mouvement', () => {
  it('@lionelcointot/ui-angular exporte lcAnimate et LcNavRegistry', () => {
    expect(typeof exported['lcAnimate']).toBe('function');
    expect(exported['LcNavRegistry']).toBeDefined();
  });

  it('les outils @internal restent exportés (les points d\'entrée secondaires en ont besoin)', () => {
    expect(typeof exported['lcPrefersReducedMotion']).toBe('function');
    expect(typeof exported['lcDetachAnimated']).toBe('function');
    expect(typeof exported['lcIndicatorRect']).toBe('function');
  });
});

describe('CA-19 : lcAnimate sans Element.animate', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('jsdom n\'a pas Element.animate : lcAnimate ne lève rien et renvoie une animation déjà finie', async () => {
    expect('animate' in Element.prototype).toBe(false);
    const el = document.createElement('div');
    const animation = lcAnimate()(el, KEYFRAMES, { duration: 'enter', easing: 'entrance' });
    expect(animation.playState).toBe('finished');
    await expect(animation.finished).resolves.toBeDefined();
  });

  it('CA-4 : la préférence est relue à chaque appel, sans erreur dans un sens comme dans l\'autre', () => {
    const el = document.createElement('div');
    for (const matches of [true, false, true]) {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches })));
      expect(lcAnimate()(el, KEYFRAMES, { duration: 'enter', easing: 'entrance' }).playState).toBe('finished');
    }
  });
});
