import type { OverlayRef } from '@angular/cdk/overlay';
import { lcDialogEnter, lcDrawerEnter } from './overlay-motion';

const TOKENS = { '--lc-dialog-enter-scale': '0.91', '--lc-dialog-enter-duration': '500ms', '--lc-dialog-enter-easing': 'ease-out', '--lc-overlay-enter-duration': '250ms',
  '--lc-drawer-enter-duration': '550ms', '--lc-drawer-enter-easing': 'ease-in', '--lc-drawer-backdrop-enter-duration': '300ms', '--lc-sys-easing-out': 'linear' };

function setup(direction = 'ltr') {
  const container = document.createElement('div');
  container.className = 'cdk-dialog-container';
  const pane = document.createElement('div');
  const backdrop = document.createElement('div');
  // Ancres du piège à focus du CDK, voisines du conteneur : elles ne doivent pas être animées.
  pane.append(document.createElement('div'), container, document.createElement('div'));
  document.body.append(pane, backdrop);
  document.documentElement.style.direction = direction;
  const animate = vi.fn(() => ({ finished: Promise.resolve() }) as unknown as Animation);
  container.animate = animate as never;
  backdrop.animate = animate as never;
  container.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 300 }) as DOMRect;
  return { container, backdrop, animate, ref: { overlayElement: pane, backdropElement: backdrop } as unknown as OverlayRef };
}

describe('overlay-motion', () => {
  beforeEach(() => Object.entries(TOKENS).forEach(([name, value]) => document.documentElement.style.setProperty(name, value)));
  afterEach(() => {
    Object.keys(TOKENS).forEach((name) => document.documentElement.style.removeProperty(name));
    document.documentElement.style.removeProperty('direction');
    document.body.replaceChildren();
  });

  it('dialogue : origine = centre du déclencheur dans le repère du conteneur, échelle et durée aux tokens', () => {
    const { ref, container, animate } = setup();
    const trigger = document.createElement('button');
    trigger.getBoundingClientRect = () => ({ left: 20, top: 10, width: 60, height: 40 }) as DOMRect;
    lcDialogEnter(ref, trigger);
    expect(container.style.transformOrigin).toBe('-50px -20px'); // (20 + 30) - 100, (10 + 20) - 50
    expect(animate).toHaveBeenCalledWith([{ opacity: 0, scale: 0.91 }, { opacity: 1, scale: 1 }], expect.objectContaining({ duration: 500, easing: 'ease-out' }));
  });

  it('dialogue sans déclencheur ou déclencheur sans boîte : origine laissée au centre', () => {
    const { ref, container } = setup();
    lcDialogEnter(ref, null);
    lcDialogEnter(ref, document.createElement('button'));
    expect(container.style.transformOrigin).toBe('');
  });

  it('voile du dialogue : 0 → 1 en --lc-overlay-enter-duration', () => {
    const { ref, backdrop, animate } = setup();
    lcDialogEnter(ref, null);
    expect(animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], expect.objectContaining({ duration: 250 }));
    expect(backdrop.isConnected).toBe(true);
  });

  it.each([['end', 'ltr', '100% 0'], ['start', 'ltr', '-100% 0'], ['end', 'rtl', '-100% 0'], ['start', 'rtl', '100% 0']] as const)(
    'tiroir côté %s en écriture %s : glisse de %s sur toute sa largeur, voile aux tokens du tiroir',
    (side, direction, from) => {
      const { ref, animate } = setup(direction);
      lcDrawerEnter(ref, side);
      expect(animate).toHaveBeenCalledWith([{ translate: from }, { translate: '0 0' }], expect.objectContaining({ duration: 550, easing: 'ease-in' }));
      expect(animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], expect.objectContaining({ duration: 300 }));
    },
  );
});
