import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcTruncateDirective } from './truncate.directive';

@Component({
  imports: [LcTruncateDirective],
  template: `<span lcTruncate>{{ text() }}</span>`,
})
class HostComponent {
  readonly text = signal('Résidence des Tilleuls, bâtiment B, escalier 3');
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  trigger(): void {
    this.callback();
  }
}

describe('LcTruncateDirective', () => {
  let box: { scroll: number; client: number };
  let reduced: boolean;

  beforeEach(() => {
    box = { scroll: 300, client: 100 };
    reduced = false;
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduced && query === '(prefers-reduced-motion: reduce)' }));
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(() => box.scroll);
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => box.client);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[lcTruncate]')!;
    return { fixture, el };
  }
  const enter = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('mouseenter'));
  const leave = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('mouseleave'));

  it('CA-K3-1 : sans débordement, ni title ni classe de défilement au survol', async () => {
    box.scroll = 100;
    for (reduced of [false, true]) {
      const { el } = await setup();
      enter(el);
      expect(el.classList.contains('lc-truncate--scrolling')).toBe(false);
      expect(el.hasAttribute('title')).toBe(false);
      expect(el.style.getPropertyValue('--lc-truncate-overflow')).toBe('');
    }
  });

  it('CA-K3-2 : avec débordement, pose la variable et la classe au survol, les retire à la sortie', async () => {
    const { el } = await setup();
    expect(el.classList.contains('lc-truncate')).toBe(true);
    enter(el);
    expect(el.classList.contains('lc-truncate--scrolling')).toBe(true);
    expect(el.style.getPropertyValue('--lc-truncate-overflow')).toBe('200px');
    expect(el.hasAttribute('title')).toBe(false);
    leave(el);
    expect(el.classList.contains('lc-truncate--scrolling')).toBe(false);
    expect(el.style.getPropertyValue('--lc-truncate-overflow')).toBe('');
  });

  it('la durée suit la vitesse du jeton --lc-truncate-speed', async () => {
    const { el } = await setup();
    el.style.setProperty('--lc-truncate-speed', '100');
    enter(el);
    // 200 px à 100 px/s = 2 s d'aller, l'aller occupe 40 % de l'animation
    expect(parseFloat(el.style.getPropertyValue('--lc-truncate-duration'))).toBeCloseTo(5);
  });

  it('CA-K3-3 : mouvement réduit, pas de défilement ; title = texte entier seulement s\'il déborde', async () => {
    reduced = true;
    const { el } = await setup();
    enter(el);
    expect(el.classList.contains('lc-truncate--scrolling')).toBe(false);
    expect(el.title).toBe('Résidence des Tilleuls, bâtiment B, escalier 3');
    box.scroll = 100;
    enter(el);
    expect(el.hasAttribute('title')).toBe(false);
  });

  it('CA-K3-3 : le réglage est relu à chaque survol', async () => {
    const { el } = await setup();
    enter(el);
    expect(el.classList.contains('lc-truncate--scrolling')).toBe(true);
    leave(el);
    reduced = true;
    enter(el);
    expect(el.classList.contains('lc-truncate--scrolling')).toBe(false);
    expect(el.hasAttribute('title')).toBe(true);
    leave(el);
    reduced = false;
    enter(el);
    expect(el.classList.contains('lc-truncate--scrolling')).toBe(true);
    expect(el.hasAttribute('title')).toBe(false);
  });

  it('ne remplace pas un title posé par l\'utilisateur', async () => {
    const { el } = await setup();
    el.title = 'Mon titre';
    reduced = true;
    enter(el);
    expect(el.title).toBe('Mon titre');
  });

  it('refait la mesure au redimensionnement, pendant le défilement', async () => {
    const { el } = await setup();
    enter(el);
    box.client = 250;
    FakeResizeObserver.instances[0].trigger();
    expect(el.style.getPropertyValue('--lc-truncate-overflow')).toBe('50px');
    box.client = 400;
    FakeResizeObserver.instances[0].trigger();
    expect(el.classList.contains('lc-truncate--scrolling')).toBe(false);
  });

  it('refait la mesure quand le texte change pendant le défilement', async () => {
    const { fixture, el } = await setup();
    enter(el);
    box.scroll = 100;
    fixture.componentInstance.text.set('Court');
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    expect(el.classList.contains('lc-truncate--scrolling')).toBe(false);
  });

  it('libère les observateurs à la destruction', async () => {
    const { fixture } = await setup();
    fixture.destroy();
    expect(FakeResizeObserver.instances[0].disconnect).toHaveBeenCalled();
  });
});
