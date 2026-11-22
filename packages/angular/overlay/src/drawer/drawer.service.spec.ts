import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcDialogComponent } from '../dialog/dialog.component';
import { LcDialogService } from '../dialog/dialog.service';
import { LcDrawerComponent } from './drawer.component';
import { LcDrawerInitialFocusDirective } from './drawer-initial-focus.directive';
import { LC_DRAWER_DATA, LcDrawerRef } from './drawer-ref';
import { LcDrawerService } from './drawer.service';

@Component({
  imports: [LcDrawerComponent, LcDrawerInitialFocusDirective],
  template: `
    <lc-drawer title="Détail de la tâche">
      <p id="data">{{ data.name }}</p>
      <input id="first" />
      <input id="wanted" lcDrawerInitialFocus />
      <button lcDrawerActions id="ok" (click)="ref.close('ok')">Valider</button>
    </lc-drawer>
  `,
})
class TaskDrawerComponent {
  readonly data = inject(LC_DRAWER_DATA) as { name: string };
  readonly ref = inject<LcDrawerRef<string>>(LcDrawerRef);
}

@Component({ imports: [LcDrawerComponent], template: `<lc-drawer title="Titre" hideClose>contenu</lc-drawer>` })
class HideCloseDrawerComponent {}

@Component({
  imports: [LcDrawerComponent],
  template: `<lc-drawer title="Titre"><input id="first" /><button id="open-dialog" (click)="openDialog()">Dialogue</button></lc-drawer>`,
})
class DrawerWithDialogComponent {
  private readonly dialogs = inject(LcDialogService);
  openDialog(): void {
    this.dialogs.open(DialogOverDrawerComponent);
  }
}

@Component({ imports: [LcDialogComponent], template: `<lc-dialog title="Confirmer"><input id="dlg-input" /></lc-dialog>` })
class DialogOverDrawerComponent {}

/** Sans `lc-drawer` : nom accessible par `ariaLabel`. */
@Component({ template: `<input id="bare" />` })
class BareComponent {}

@Component({ imports: [LcDrawerComponent], template: `<lc-drawer title="Hors service">contenu</lc-drawer>` })
class StandaloneHostComponent {}

const overlayEl = () => document.querySelector('.cdk-overlay-container') as HTMLElement;
const pane = () => overlayEl().querySelector('.lc-drawer-panel') as HTMLElement;
const panel = () => overlayEl().querySelector('[role="dialog"]') as HTMLElement;
const backdrop = () => overlayEl().querySelector<HTMLElement>('.lc-drawer-backdrop');
const closeButton = () => overlayEl().querySelector<HTMLButtonElement>('.lc-drawer__close');
const pressEscape = () =>
  (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
}

describe('LcDrawerService', () => {
  let service: LcDrawerService;
  let opener: HTMLButtonElement;

  // jsdom n'a pas de mise en page : le CDK ne trouve aucun élément « visible » donc aucun focusable. On les déclare visibles.
  const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!;
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 1 });
    service = TestBed.inject(LcDrawerService);
    opener = document.body.appendChild(document.createElement('button'));
    opener.focus();
  });
  afterEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidth);
    opener.remove();
    overlayEl()?.replaceChildren();
  });

  const open = async (config: Parameters<LcDrawerService['open']>[1] = { data: { name: 'Tâche A' } }) => {
    const ref = service.open<TaskDrawerComponent, unknown, string>(TaskDrawerComponent, config);
    await settle();
    return ref;
  };

  describe('CA-1 : côté, taille, structure', () => {
    it('à droite et en taille moyenne par défaut, avec en-tête (h2 + fermeture), corps et pied', async () => {
      await open();
      expect(pane().classList).toContain('lc-drawer-panel--end');
      expect(pane().classList).toContain('lc-drawer-panel--medium');
      expect(overlayEl().querySelector('.cdk-global-overlay-wrapper')).toHaveProperty('style.justifyContent', 'flex-end');
      expect(panel().querySelector('lc-drawer')!.classList).not.toContain('lc-drawer--start');
      expect(panel().querySelector('h2.lc-drawer__title')!.textContent).toBe('Détail de la tâche');
      expect(closeButton()!.getAttribute('aria-label')).toBe('Fermer');
      expect(panel().querySelector('.lc-drawer__content #data')!.textContent).toBe('Tâche A');
      expect(panel().querySelector('.lc-drawer__actions #ok')).not.toBeNull();
    });

    it('side="start" ouvre à gauche', async () => {
      await open({ side: 'start', data: { name: 'x' } });
      expect(pane().classList).toContain('lc-drawer-panel--start');
      expect(overlayEl().querySelector('.cdk-global-overlay-wrapper')).toHaveProperty('style.justifyContent', 'flex-start');
      expect(panel().querySelector('lc-drawer')!.classList).toContain('lc-drawer--start');
    });

    it.each(['small', 'medium', 'large'] as const)('size="%s" applique la classe de largeur', async (size) => {
      await open({ size, data: { name: 'x' } });
      expect(pane().classList).toContain(`lc-drawer-panel--${size}`);
    });

    it('hideClose masque le bouton de fermeture', async () => {
      service.open(HideCloseDrawerComponent);
      await settle();
      expect(closeButton()).toBeNull();
    });

    it('ombre sous l\'en-tête quand le corps a défilé', async () => {
      await open();
      const content = panel().querySelector<HTMLElement>('.lc-drawer__content')!;
      const header = panel().querySelector('.lc-drawer__header')!;
      expect(header.classList).not.toContain('lc-drawer__header--scrolled');
      content.scrollTop = 20;
      content.dispatchEvent(new Event('scroll'));
      await settle();
      expect(header.classList).toContain('lc-drawer__header--scrolled');
    });
  });

  describe('CA-2 : rôle, nom, focus', () => {
    it('role="dialog", aria-modal="true", nom = titre', async () => {
      await open();
      expect(panel().getAttribute('aria-modal')).toBe('true');
      expect(panel().getAttribute('aria-labelledby')).toBe(panel().querySelector('.lc-drawer__title')!.id);
      expect(panel().getAttribute('aria-label')).toBeNull();
    });

    it('ariaLabel remplace le titre comme nom accessible', async () => {
      await open({ ariaLabel: 'Tâche en cours', data: { name: 'x' } });
      expect(panel().getAttribute('aria-label')).toBe('Tâche en cours');
      expect(panel().getAttribute('aria-labelledby')).toBeNull();
    });

    it('focus initial sur [lcDrawerInitialFocus], sinon sur le premier contrôle', async () => {
      await open();
      expect(document.activeElement!.id).toBe('wanted');
      overlayEl().replaceChildren();
      service.open(DrawerWithDialogComponent);
      await settle();
      expect(document.activeElement!.className).toContain('lc-drawer__close');
    });

    it('focus piégé : atteindre la sentinelle de fin ramène au premier contrôle', async () => {
      await open();
      const anchors = pane().querySelectorAll<HTMLElement>('.cdk-focus-trap-anchor');
      expect(anchors).toHaveLength(2);
      anchors[1].focus();
      expect(pane().contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(anchors[1]);
    });

    it('le focus revient à l\'élément ouvrant à la fermeture', async () => {
      const ref = await open();
      expect(document.activeElement).not.toBe(opener);
      ref.close();
      await ref.closed;
      await settle();
      expect(document.activeElement).toBe(opener);
    });

    it('composant sans lc-drawer : nom par ariaLabel, ouverture sans erreur', async () => {
      service.open(BareComponent, { ariaLabel: 'Panneau brut' });
      await settle();
      expect(panel().getAttribute('aria-label')).toBe('Panneau brut');
      expect(document.activeElement!.id).toBe('bare');
    });

    it('un dialogue ouvert depuis le tiroir passe au-dessus et Échap le ferme seul', async () => {
      service.open(DrawerWithDialogComponent);
      await settle();
      overlayEl().querySelector<HTMLButtonElement>('#open-dialog')!.click();
      await settle();
      const panes = [...overlayEl().querySelectorAll('.cdk-overlay-pane')];
      expect(panes).toHaveLength(2);
      expect(panes[0].classList).toContain('lc-drawer-panel');
      expect(panes[1].classList).toContain('lc-dialog-panel');
      pressEscape();
      await settle();
      await settle();
      expect(overlayEl().querySelector('.lc-dialog-panel')).toBeNull();
      expect(overlayEl().querySelector('.lc-drawer-panel')).not.toBeNull();
    });
  });

  describe('CA-3 : fermeture et résultat', () => {
    it('Échap ferme et résout afterClosed() et closed avec undefined', async () => {
      const ref = await open();
      const after = new Promise((resolve) => ref.afterClosed().subscribe(resolve));
      pressEscape();
      await expect(after).resolves.toBeUndefined();
      await expect(ref.closed).resolves.toBeUndefined();
      await settle();
      expect(overlayEl().querySelector('.lc-drawer-panel')).toBeNull();
    });

    it('close() est asynchrone : le panneau porte la classe de sortie jusqu\'à la fin, un second close() garde le premier résultat', async () => {
      const ref = await open();
      ref.close('premier');
      ref.close('second');
      expect(pane().classList).toContain('lc-overlay--closing');
      expect(backdrop()!.classList).not.toContain('cdk-overlay-backdrop-showing');
      await expect(ref.closed).resolves.toBe('premier');
    });

    it('la sortie attend les animations du panneau (sans les descendants)', async () => {
      const ref = await open();
      let finish!: () => void;
      const animation = { effect: { getComputedTiming: () => ({ endTime: 200 }) }, finished: new Promise<void>((resolve) => (finish = resolve)) };
      const getAnimations = vi.fn(() => [animation]);
      pane().getAnimations = getAnimations as never;
      let closed = false;
      void ref.closed.then(() => (closed = true));
      ref.close('ok');
      await settle();
      expect(getAnimations).toHaveBeenCalledWith({ subtree: false });
      expect(closed).toBe(false);
      finish();
      await expect(ref.closed).resolves.toBe('ok');
    });

    it('un Échap avec modificateur est ignoré', async () => {
      await open();
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, ctrlKey: true, bubbles: true }));
      await settle();
      expect(panel()).not.toBeNull();
    });

    it('le voile ferme par défaut', async () => {
      const ref = await open();
      backdrop()!.click();
      await expect(ref.closed).resolves.toBeUndefined();
    });

    it('le bouton de fermeture ferme', async () => {
      const ref = await open();
      closeButton()!.click();
      await expect(ref.closed).resolves.toBeUndefined();
    });

    it('close(résultat) transmet le résultat à afterClosed() et closed', async () => {
      const ref = await open();
      const after = new Promise((resolve) => ref.afterClosed().subscribe(resolve));
      overlayEl().querySelector<HTMLButtonElement>('#ok')!.click();
      await expect(after).resolves.toBe('ok');
      await expect(ref.closed).resolves.toBe('ok');
    });

    it('closeOnBackdrop=false : le voile est sans effet, Échap et le bouton ferment', async () => {
      const ref = await open({ closeOnBackdrop: false, data: { name: 'x' } });
      backdrop()!.click();
      await settle();
      expect(panel()).not.toBeNull();
      pressEscape();
      await expect(ref.closed).resolves.toBeUndefined();
    });

    it('disableClose : Échap et voile sans effet, bouton de fermeture masqué', async () => {
      const ref = await open({ disableClose: true, data: { name: 'x' } });
      let closed = false;
      void ref.closed.then(() => (closed = true));
      pressEscape();
      backdrop()!.click();
      await settle();
      expect(closed).toBe(false);
      expect(panel()).not.toBeNull();
      expect(closeButton()).toBeNull();
      // La fermeture par programme reste possible.
      overlayEl().querySelector<HTMLButtonElement>('#ok')!.click();
      await expect(ref.closed).resolves.toBe('ok');
    });
  });

  describe('LC_DRAWER_DATA', () => {
    it('transmet les données au composant ouvert', async () => {
      await open({ data: { name: 'Scénario B' } });
      expect(overlayEl().querySelector('#data')!.textContent).toBe('Scénario B');
    });
  });
});

describe('lc-drawer hors LcDrawerService', () => {
  it('se rend sans erreur, sans bouton de fermeture, à droite, avec un titre h2 relié', async () => {
    const fixture = TestBed.createComponent(StandaloneHostComponent);
    await fixture.whenStable();
    const drawer = (fixture.nativeElement as HTMLElement).querySelector('lc-drawer')!;
    expect(drawer.querySelector('h2')!.textContent).toBe('Hors service');
    expect(drawer.querySelector('.lc-drawer__close')).toBeNull();
    expect(drawer.classList).not.toContain('lc-drawer--start');
    expect(drawer.textContent).toContain('contenu');
  });
});
