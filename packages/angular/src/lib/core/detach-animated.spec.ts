import type { OverlayRef } from '@angular/cdk/overlay';
import { Subject } from 'rxjs';
import { lcDetachAnimated } from './detach-animated';

function fakeRef(animations?: { finished: Promise<unknown> }[]) {
  const element = document.createElement('div');
  if (animations) element.getAnimations = (() => animations) as unknown as typeof element.getAnimations;
  const attachments = new Subject<void>();
  let attached = true;
  const ref = {
    overlayElement: element,
    hasAttached: () => attached,
    attachments: () => attachments,
    detach: vi.fn(() => {
      attached = false;
    }),
  };
  return { ref: ref as unknown as OverlayRef, element, attachments, detach: ref.detach, dispose: () => (attached = false) };
}

describe('lcDetachAnimated', () => {
  it('détache aussitôt sans getAnimations (jsdom) ou sans animation', async () => {
    for (const animations of [undefined, []]) {
      const { ref, element, detach } = fakeRef(animations);
      const done = lcDetachAnimated(ref);
      expect(element.classList.contains('lc-overlay--closing')).toBe(true);
      await done;
      expect(detach).toHaveBeenCalledOnce();
      expect(element.classList.contains('lc-overlay--closing')).toBe(false);
    }
  });

  it("attend la fin de l'animation avant de détacher", async () => {
    let finish!: () => void;
    const { ref, detach } = fakeRef([{ finished: new Promise<void>((resolve) => (finish = resolve)) }]);
    const done = lcDetachAnimated(ref);
    await Promise.resolve();
    expect(detach).not.toHaveBeenCalled();
    finish();
    await done;
    expect(detach).toHaveBeenCalledOnce();
  });

  it('détache aussi quand une animation est annulée (promesse rejetée)', async () => {
    const { ref, detach } = fakeRef([{ finished: Promise.reject(new DOMException('annulée', 'AbortError')) }]);
    await lcDetachAnimated(ref);
    expect(detach).toHaveBeenCalledOnce();
  });

  it('un rattachement pendant le fondu annule le retrait et retire la classe', async () => {
    let finish!: () => void;
    const { ref, element, attachments, detach } = fakeRef([{ finished: new Promise<void>((resolve) => (finish = resolve)) }]);
    const done = lcDetachAnimated(ref);
    attachments.next();
    finish();
    await done;
    expect(detach).not.toHaveBeenCalled();
    expect(element.classList.contains('lc-overlay--closing')).toBe(false);
  });

  it("une classe retirée par l'appelant pendant le fondu annule le retrait", async () => {
    let finish!: () => void;
    const { ref, element, detach } = fakeRef([{ finished: new Promise<void>((resolve) => (finish = resolve)) }]);
    const done = lcDetachAnimated(ref);
    element.classList.remove('lc-overlay--closing');
    finish();
    await done;
    expect(detach).not.toHaveBeenCalled();
  });

  it('ne fait rien de plus si le panneau est détruit pendant le fondu', async () => {
    let finish!: () => void;
    const { ref, detach, dispose } = fakeRef([{ finished: new Promise<void>((resolve) => (finish = resolve)) }]);
    const done = lcDetachAnimated(ref);
    dispose();
    finish();
    await done;
    expect(detach).not.toHaveBeenCalled();
  });
});
