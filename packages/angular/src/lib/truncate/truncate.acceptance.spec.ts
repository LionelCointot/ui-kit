import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcTruncateDirective } from './truncate.directive';

@Component({
  imports: [LcTruncateDirective],
  template: `<span lcTruncate id="t">Nom de copropriété très long</span>`,
})
class HostComponent {}

class FakeResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
}

const OVERFLOW = '--lc-truncate-overflow';

/** jsdom ne mesure rien : largeur du contenu et de la boîte simulées ; `reduced` pilote matchMedia. */
function mock(scroll: number, client: number, reduced: { value: boolean }) {
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(() => scroll);
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => client);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({ matches: reduced.value && query === '(prefers-reduced-motion: reduce)' })),
  });
}

describe('lcTruncate : acceptation K3', () => {
  beforeEach(() => vi.stubGlobal('ResizeObserver', FakeResizeObserver));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  async function setup(scroll: number, client: number, reduced = false) {
    const state = { value: reduced };
    mock(scroll, client, state);
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#t')!;
    const hover = () => el.dispatchEvent(new MouseEvent('mouseenter'));
    const leave = () => el.dispatchEvent(new MouseEvent('mouseleave'));
    const classes = () => Array.from(el.classList);
    return { el, hover, leave, classes, state, before: classes() };
  }

  it('CA-K3-1 : sans débordement, ni title, ni classe de défilement, ni variable au survol', async () => {
    const { el, hover, classes, before } = await setup(100, 100);
    hover();
    expect(el.hasAttribute('title')).toBe(false);
    expect(classes()).toEqual(before);
    expect(el.style.getPropertyValue(OVERFLOW)).toBe('');
  });

  it('CA-K3-1 : contenu plus étroit que la boîte : rien ne bouge', async () => {
    const { el, hover, classes, before } = await setup(50, 100);
    hover();
    expect(classes()).toEqual(before);
    expect(el.hasAttribute('title')).toBe(false);
  });

  it('CA-K3-2 : avec débordement, le survol pose la variable (px) et une classe, la sortie les retire', async () => {
    const { el, hover, leave, classes, before } = await setup(180, 100);
    hover();
    expect(parseFloat(el.style.getPropertyValue(OVERFLOW))).toBe(80);
    expect(classes().length).toBe(before.length + 1);
    leave();
    expect(classes()).toEqual(before);
  });

  it('CA-K3-2 : le débordement est remesuré à chaque survol', async () => {
    const { el, hover, leave } = await setup(180, 100);
    hover();
    leave();
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(() => 130);
    hover();
    expect(parseFloat(el.style.getPropertyValue(OVERFLOW))).toBe(30);
  });

  it('CA-K3-3 : mouvement réduit, aucune classe ; title = texte entier car déborde', async () => {
    const { el, hover, classes, before } = await setup(180, 100, true);
    hover();
    expect(classes()).toEqual(before);
    expect(el.getAttribute('title')).toBe('Nom de copropriété très long');
  });

  it('CA-K3-3 : mouvement réduit sans débordement : pas de title', async () => {
    const { el, hover } = await setup(100, 100, true);
    hover();
    expect(el.hasAttribute('title')).toBe(false);
  });

  it('CA-K3-3 : le réglage est relu à chaque survol', async () => {
    const { hover, leave, classes, before, state } = await setup(180, 100, true);
    hover();
    expect(classes()).toEqual(before);
    leave();
    state.value = false;
    hover();
    expect(classes().length).toBe(before.length + 1);
    leave();
    state.value = true;
    hover();
    expect(classes()).toEqual(before);
  });
});
