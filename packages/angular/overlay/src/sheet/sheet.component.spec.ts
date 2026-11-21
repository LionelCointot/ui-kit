import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LcSheetComponent } from './sheet.component';

@Component({
  imports: [LcSheetComponent],
  template: `
    <lc-sheet [(open)]="open" title="Filtres" [closeLabel]="label" (closed)="closed()">
      <p id="content">contenu</p>
      <button lcSheetFooter id="footer">Appliquer</button>
    </lc-sheet>
  `,
})
class HostComponent {
  readonly open = signal(false);
  label: string | undefined;
  readonly closed = vi.fn();
}

describe('LcSheetComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let dialog: HTMLDialogElement;
  let finish: () => void;

  const stable = async () => {
    await fixture.whenStable();
    await fixture.whenStable();
  };
  /** Simule une animation finie en cours sur le dialogue ; `finish()` la termine. */
  const animate = () => {
    const finished = new Promise<void>((resolve) => (finish = resolve));
    dialog.getAnimations = (() => [{ finished }]) as unknown as typeof dialog.getAnimations;
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    dialog = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    await stable();
  });

  afterEach(() => vi.restoreAllMocks());

  const openSheet = async () => {
    host.open.set(true);
    await stable();
  };

  it('ouvre le dialogue modal, avec titre, croix nommée par closeLabel et pied projeté', async () => {
    host.label = 'Fermer sans appliquer';
    await openSheet();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.querySelector('.lc-sheet__title')!.textContent).toBe('Filtres');
    expect(dialog.getAttribute('aria-labelledby')).toBe(dialog.querySelector('.lc-sheet__title')!.id);
    expect(dialog.querySelector('.lc-sheet__close')!.getAttribute('aria-label')).toBe('Fermer sans appliquer');
    expect(dialog.querySelector('.lc-sheet__footer #footer')).not.toBeNull();
    expect(dialog.querySelector('.lc-sheet__handle')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('croix : open passe à false, data-closing, puis close() et closed une seule fois à la fin de la sortie', async () => {
    await openSheet();
    animate();
    dialog.querySelector<HTMLButtonElement>('.lc-sheet__close')!.click();
    await stable();
    expect(host.open()).toBe(false);
    expect(dialog.hasAttribute('data-closing')).toBe(true);
    expect(dialog.close).not.toHaveBeenCalled();
    expect(host.closed).not.toHaveBeenCalled();
    finish();
    await stable();
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(dialog.hasAttribute('data-closing')).toBe(false);
    expect(host.closed).toHaveBeenCalledOnce();
  });

  it('Échap (cancel) suit le même chemin : intercepté, sortie animée', async () => {
    await openSheet();
    animate();
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    await stable();
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog.hasAttribute('data-closing')).toBe(true);
    finish();
    await stable();
    expect(dialog.close).toHaveBeenCalledOnce();
  });

  it('un clic sur le fond ne ferme pas la feuille (téléphone)', async () => {
    await openSheet();
    dialog.click();
    await stable();
    expect(host.open()).toBe(true);
  });

  it('rouvrir pendant la sortie annule la fermeture : data-closing retiré, ni close() ni closed', async () => {
    await openSheet();
    animate();
    host.open.set(false);
    await stable();
    host.open.set(true);
    await stable();
    expect(dialog.hasAttribute('data-closing')).toBe(false);
    finish();
    await stable();
    expect(dialog.close).not.toHaveBeenCalled();
    expect(host.closed).not.toHaveBeenCalled();
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('une fermeture native (dialog.close() extérieur) aligne open et émet closed', async () => {
    await openSheet();
    dialog.dispatchEvent(new Event('close'));
    await stable();
    expect(host.open()).toBe(false);
    expect(host.closed).toHaveBeenCalledOnce();
  });

  describe('geste', () => {
    const pointer = (type: string, clientY: number, timeStamp: number) =>
      Object.defineProperties(new Event(type, { bubbles: true }), {
        pointerId: { value: 1 }, isPrimary: { value: true }, clientY: { value: clientY }, timeStamp: { value: timeStamp },
      });
    const zone = () => dialog.querySelector<HTMLElement>('.lc-sheet__drag')!;

    beforeEach(async () => {
      await openSheet();
      Object.defineProperty(dialog, 'offsetHeight', { value: 800 });
      zone().setPointerCapture = vi.fn();
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    it('suit le doigt sans élastique vers le haut, puis ferme au-delà du quart de la hauteur sans rien émettre d\'autre', async () => {
      zone().dispatchEvent(pointer('pointerdown', 100, 0));
      expect(dialog.hasAttribute('data-dragging')).toBe(true);
      zone().dispatchEvent(pointer('pointermove', 60, 10));
      expect(dialog.style.transform).toBe('translateY(0px)');
      zone().dispatchEvent(pointer('pointermove', 350, 400));
      expect(dialog.style.transform).toBe('translateY(250px)');
      animate();
      zone().dispatchEvent(pointer('pointerup', 350, 800));
      await stable();
      expect(dialog.hasAttribute('data-dragging')).toBe(false);
      expect(dialog.hasAttribute('data-closing')).toBe(true);
      expect(dialog.style.transform).toBe('');
      expect(host.open()).toBe(false);
    });

    it('relâché sous le seuil et lentement : retour à sa place, reste ouverte', async () => {
      zone().dispatchEvent(pointer('pointerdown', 100, 0));
      zone().dispatchEvent(pointer('pointermove', 150, 500));
      zone().dispatchEvent(pointer('pointerup', 150, 1000));
      await stable();
      expect(dialog.style.transform).toBe('');
      expect(dialog.hasAttribute('data-returning')).toBe(true);
      expect(host.open()).toBe(true);
    });

    it('un toucher sans déplacement ne ferme rien', async () => {
      zone().dispatchEvent(pointer('pointerdown', 100, 0));
      zone().dispatchEvent(pointer('pointerup', 100, 50));
      await stable();
      expect(host.open()).toBe(true);
    });

    it('pointercancel : retour à sa place, ouverte, rien d\'émis', async () => {
      zone().dispatchEvent(pointer('pointerdown', 100, 0));
      zone().dispatchEvent(pointer('pointermove', 500, 50));
      zone().dispatchEvent(new Event('pointercancel', { bubbles: true }));
      await stable();
      expect(dialog.style.transform).toBe('');
      expect(dialog.hasAttribute('data-dragging')).toBe(false);
      expect(host.open()).toBe(true);
      expect(host.closed).not.toHaveBeenCalled();
    });

    it('un appui sur la croix ne démarre pas le geste', () => {
      dialog.querySelector('.lc-sheet__close')!.dispatchEvent(pointer('pointerdown', 100, 0));
      expect(dialog.hasAttribute('data-dragging')).toBe(false);
    });
  });
});
