import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcDialogComponent } from './dialog.component';
import { LC_DIALOG_DATA, LcDialogRef } from './dialog-ref';
import { LcDialogService } from './dialog.service';

@Component({
  imports: [LcDialogComponent, LcButtonComponent],
  template: `
    <lc-dialog title="Renommer le scénario">
      <p>{{ data.name }}</p>
      <button lcButton lcDialogActions id="ok" (click)="ref.close('ok')">Valider</button>
    </lc-dialog>
  `,
})
class RenameDialogComponent {
  readonly data = inject(LC_DIALOG_DATA) as { name: string };
  readonly ref = inject<LcDialogRef<string>>(LcDialogRef);
}

function overlay(): HTMLElement {
  return document.querySelector('.cdk-overlay-container') as HTMLElement;
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
}

describe('LcDialogService', () => {
  afterEach(() => {
    overlay()?.replaceChildren();
  });

  it('ouvre un dialogue nommé par son titre, avec données et résultat', async () => {
    const service = TestBed.inject(LcDialogService);
    const ref = service.open<RenameDialogComponent, { name: string }, string>(RenameDialogComponent, { data: { name: 'Scénario A' } });
    await settle();
    const container = overlay().querySelector('[role="dialog"]')!;
    const title = overlay().querySelector('.lc-dialog__title')!;
    expect(container.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent).toContain('Renommer le scénario');
    expect(overlay().textContent).toContain('Scénario A');
    expect(overlay().querySelector('.lc-dialog-panel--medium')).not.toBeNull();
    expect(overlay().querySelector('.lc-dialog__header button')!.getAttribute('aria-label')).toBe('Fermer');
    overlay().querySelector<HTMLButtonElement>('#ok')!.click();
    await expect(ref.closed).resolves.toBe('ok');
  });

  it('déclare le dialogue modal (le focus est piégé)', async () => {
    const service = TestBed.inject(LcDialogService);
    service.open<RenameDialogComponent, { name: string }, string>(RenameDialogComponent, { data: { name: 'A' } });
    await settle();

    expect(overlay().querySelector('[role="dialog"]')!.getAttribute('aria-modal')).toBe('true');
  });

  describe('rôle ARIA du dialogue (I7)', () => {
    const openWith = async (config: Parameters<LcDialogService['open']>[1]) => {
      TestBed.inject(LcDialogService).open(RenameDialogComponent, { data: { name: 'A' }, ...config });
      await settle();
      return overlay().querySelector('.lc-dialog-panel [role]')!;
    };

    it('par défaut : role="dialog", sans aria-describedby', async () => {
      const container = await openWith({});
      expect(container.getAttribute('role')).toBe('dialog');
      expect(container.hasAttribute('aria-describedby')).toBe(false);
    });

    it('role: "alertdialog" donne role="alertdialog"', async () => {
      const container = await openWith({ role: 'alertdialog' });
      expect(container.getAttribute('role')).toBe('alertdialog');
      expect(overlay().querySelector('[role="dialog"]')).toBeNull();
    });

    it('role: "dialog" explicite reste un dialog', async () => {
      expect((await openWith({ role: 'dialog' })).getAttribute('role')).toBe('dialog');
    });

    it('ariaDescribedBy est relié par aria-describedby', async () => {
      const container = await openWith({ role: 'alertdialog', ariaDescribedBy: 'message-id' });
      expect(container.getAttribute('aria-describedby')).toBe('message-id');
    });

    it('confirm() est toujours un alertdialog', async () => {
      const service = TestBed.inject(LcDialogService);
      void service.confirm({ title: 'Supprimer ?', message: 'Action définitive.' });
      await settle();
      expect(overlay().querySelector('.lc-dialog-panel [role]')!.getAttribute('role')).toBe('alertdialog');
      expect(overlay().querySelector('[role="dialog"]')).toBeNull();
    });
  });

  it('confirm() résout true sur confirmation et false sur annulation', async () => {
    const service = TestBed.inject(LcDialogService);
    const confirmed = service.confirm({ title: 'Supprimer ?', message: 'Action définitive.', destructive: true });
    await settle();
    expect(overlay().querySelector('[role="alertdialog"]')).not.toBeNull();
    const buttons = overlay().querySelectorAll<HTMLButtonElement>('.lc-dialog__actions button');
    expect(buttons[0].textContent).toContain('Annuler');
    expect(buttons[1].classList).toContain('lc-button--error');
    buttons[1].click();
    await expect(confirmed).resolves.toBe(true);

    const cancelled = service.confirm({ title: 'Quitter ?', message: 'Les modifications seront perdues.' });
    await settle();
    overlay().querySelectorAll<HTMLButtonElement>('.lc-dialog__actions button')[0].click();
    await expect(cancelled).resolves.toBe(false);
  });
});
