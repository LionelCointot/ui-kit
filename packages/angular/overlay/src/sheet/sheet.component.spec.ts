import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LcSheetComponent } from './sheet.component';

@Component({
  imports: [LcSheetComponent],
  template: `
    <lc-sheet [(open)]="open" title="Filtres" [closeLabel]="label" [closeText]="text" (closed)="closed()">
      <p id="content">contenu</p>
      <button lcSheetFooter id="footer">Appliquer</button>
    </lc-sheet>
  `,
})
class HostComponent {
  readonly open = signal(false);
  label: string | undefined;
  text: string | undefined;
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

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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

  it('closeText : bouton texte en tête de l\'en-tête, avant le titre, nommé par son texte, autofocus, ferme ; sans closeText la croix reste', async () => {
    host.text = 'Annuler';
    host.label = 'Fermer sans appliquer';
    await openSheet();
    const header = dialog.querySelector('.lc-sheet__header')!;
    const close = header.querySelector<HTMLButtonElement>('.lc-sheet__close')!;
    expect(header.firstElementChild).toBe(close);
    expect(close.textContent!.trim()).toBe('Annuler');
    expect(close.querySelector('lc-icon')).toBeNull();
    expect(close.hasAttribute('aria-label')).toBe(false);
    expect(close.hasAttribute('autofocus')).toBe(true);
    close.click();
    expect(host.open()).toBe(false);
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

  describe('corps défilant', () => {
    class FakeResizeObserver {
      static instances: FakeResizeObserver[] = [];
      readonly observe = vi.fn();
      readonly disconnect = vi.fn();
      constructor(private readonly callback: () => void) { FakeResizeObserver.instances.push(this); }
      trigger(): void { this.callback(); }
    }
    const body = () => dialog.querySelector<HTMLElement>('.lc-sheet__body')!;
    const measure = (scrollHeight: number, clientHeight: number) => {
      Object.defineProperty(body(), 'scrollHeight', { value: scrollHeight, configurable: true });
      Object.defineProperty(body(), 'clientHeight', { value: clientHeight, configurable: true });
      FakeResizeObserver.instances.forEach((observer) => observer.trigger());
    };

    beforeEach(async () => {
      FakeResizeObserver.instances = [];
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      // Le composant du `beforeEach` parent existe déjà : on en recrée un avec l'observateur simulé.
      fixture = TestBed.createComponent(HostComponent);
      host = fixture.componentInstance;
      dialog = fixture.nativeElement.querySelector('dialog');
      await stable();
    });

    it('qui déborde : arrêt de tabulation et nom accessible (titre)', async () => {
      measure(500, 200);
      await stable();
      expect(body().getAttribute('tabindex')).toBe('0');
      expect(body().getAttribute('role')).toBe('region');
      expect(body().getAttribute('aria-labelledby')).toBe(dialog.querySelector('.lc-sheet__title')!.id);
    });

    it('qui ne déborde pas : aucun arrêt de tabulation en plus', async () => {
      measure(200, 200);
      await stable();
      expect(body().hasAttribute('tabindex')).toBe(false);
      expect(body().hasAttribute('aria-labelledby')).toBe(false);
      measure(500, 200);
      await stable();
      measure(200, 200);
      await stable();
      expect(body().hasAttribute('tabindex')).toBe(false);
    });

    it('observe aussi le contenu projeté : du contenu ajouté plus tard qui déborde rend le corps focusable', async () => {
      const content = body().querySelector('.lc-sheet__content')!;
      expect(content).not.toBeNull();
      expect(FakeResizeObserver.instances.some((observer) => observer.observe.mock.calls.some(([target]) => target === content))).toBe(true);
      measure(200, 200);
      await stable();
      expect(body().hasAttribute('tabindex')).toBe(false);
      measure(900, 200); // le contenu grandit : l'observateur du contenu relance la mesure
      await stable();
      expect(body().getAttribute('tabindex')).toBe('0');
    });

    it('se déconnecte à la destruction', async () => {
      fixture.destroy();
      expect(FakeResizeObserver.instances.every((observer) => observer.disconnect.mock.calls.length > 0)).toBe(true);
    });
  });

  describe('fond, carte et destruction', () => {
    const pointer = (type: string, target: Element) => {
      const event = Object.defineProperty(new Event(type, { bubbles: true }), 'isPrimary', { value: true });
      target.dispatchEvent(event);
    };
    const card = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(min-width: 48em)' }));

    it('carte : appui et clic sur le fond ferment', async () => {
      card();
      await openSheet();
      pointer('pointerdown', dialog);
      dialog.click();
      await stable();
      expect(host.open()).toBe(false);
    });

    it('carte : sélection commencée dans le corps et relâchée sur le fond ne ferme pas', async () => {
      card();
      await openSheet();
      pointer('pointerdown', dialog.querySelector('.lc-sheet__body')!);
      dialog.click();
      await stable();
      expect(host.open()).toBe(true);
    });

    it('téléphone : appui et clic sur le fond ne ferment pas', async () => {
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      await openSheet();
      pointer('pointerdown', dialog);
      dialog.click();
      await stable();
      expect(host.open()).toBe(true);
    });

    it('carte : le geste ne démarre pas', async () => {
      card();
      await openSheet();
      const zone = dialog.querySelector<HTMLElement>('.lc-sheet__drag')!;
      pointer('pointerdown', zone);
      expect(dialog.hasAttribute('data-dragging')).toBe(false);
    });

    it('détruite pendant sa sortie : closed n\'est pas émis', async () => {
      await openSheet();
      animate();
      host.open.set(false);
      await stable();
      fixture.destroy();
      finish();
      await new Promise((resolve) => setTimeout(resolve));
      expect(dialog.close).not.toHaveBeenCalled(); // la sortie finit sans toucher à un composant détruit
      expect(host.closed).not.toHaveBeenCalled();
    });
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
