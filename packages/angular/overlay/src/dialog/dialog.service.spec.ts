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
