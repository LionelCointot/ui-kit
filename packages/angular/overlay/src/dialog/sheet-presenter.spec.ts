import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcDrawerComponent } from '../drawer/drawer.component';
import { LcDrawerRef } from '../drawer/drawer-ref';
import { LcDrawerService } from '../drawer/drawer.service';
import { LcDialogComponent } from './dialog.component';
import { LcDialogRef } from './dialog-ref';
import { LcDialogService } from './dialog.service';

@Component({
  imports: [LcDialogComponent, LcButtonComponent],
  template: `<lc-dialog title="Renommer"><p>Corps</p><button lcButton lcDialogActions id="ok" (click)="ref.close('ok')">Valider</button></lc-dialog>`,
})
class RenameComponent {
  readonly ref = inject<LcDialogRef<string>>(LcDialogRef);
}

@Component({ imports: [LcDrawerComponent], template: `<lc-drawer title="Détail"><button id="drawer-ok" (click)="ref.close('fait')">Fait</button></lc-drawer>` })
class DetailComponent {
  readonly ref = inject<LcDrawerRef<string>>(LcDrawerRef);
}

const phone = (width: number) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: /min-width:\s*48em/.test(query) ? width >= 768 : false, addEventListener() {}, removeEventListener() {} }));

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
}

describe('présentation en lc-sheet sous 768 px (D-19)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('à 767 px un dialogue s\'ouvre dans un lc-sheet : titre de lc-dialog sur la feuille, en-tête de lc-dialog masqué, résultat rendu à la fermeture', async () => {
    phone(767);
    const ref = TestBed.inject(LcDialogService).open<RenameComponent, unknown, string>(RenameComponent);
    await settle();
    expect(document.querySelectorAll('lc-sheet')).toHaveLength(1);
    expect(document.querySelector('.lc-sheet__title')!.textContent).toBe('Renommer');
    expect(document.querySelector('lc-sheet lc-dialog.lc-dialog--in-sheet')).not.toBeNull();
    expect(document.querySelector('.cdk-overlay-container .lc-dialog-panel')).toBeNull();
    document.querySelector<HTMLButtonElement>('#ok')!.click();
    await expect(ref.closed).resolves.toBe('ok');
    await settle();
    expect(document.querySelector('lc-sheet')).toBeNull();
  });

  it('à 768 px aucun lc-sheet : la carte CDK', async () => {
    phone(768);
    TestBed.inject(LcDialogService).open(RenameComponent);
    await settle();
    expect(document.querySelector('lc-sheet')).toBeNull();
    expect(document.querySelector('.lc-dialog-panel')).not.toBeNull();
  });

  it('dismissible: false garde la carte (la feuille se ferme seule par Échap, la croix et le geste)', async () => {
    phone(360);
    TestBed.inject(LcDialogService).open(RenameComponent, { dismissible: false });
    await settle();
    expect(document.querySelector('lc-sheet')).toBeNull();
    expect(document.querySelector('.lc-dialog-panel')).not.toBeNull();
  });

  it('la confirmation garde role="alertdialog" sur le dialog de la feuille, avec son message', async () => {
    phone(360);
    const answer = TestBed.inject(LcDialogService).confirm({ title: 'Supprimer ?', message: 'Irréversible.' });
    await settle();
    expect(document.querySelector('lc-sheet dialog')!.getAttribute('role')).toBe('alertdialog');
    document.querySelector('lc-sheet dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    await expect(answer).resolves.toBe(false);
  });

  it('la croix ou Échap de la feuille résout closed avec undefined, une seule fois', async () => {
    phone(360);
    const ref = TestBed.inject(LcDialogService).open(RenameComponent);
    await settle();
    document.querySelector<HTMLButtonElement>('lc-sheet .lc-sheet__close')!.click();
    await expect(ref.closed).resolves.toBeUndefined();
  });

  it('un tiroir s\'ouvre aussi en feuille sous 768 px, avec sa référence de tiroir', async () => {
    phone(360);
    const ref = TestBed.inject(LcDrawerService).open<DetailComponent, unknown, string>(DetailComponent);
    await settle();
    expect(document.querySelectorAll('lc-sheet lc-drawer.lc-drawer--in-sheet')).toHaveLength(1);
    expect(document.querySelector('.lc-sheet__title')!.textContent).toBe('Détail');
    const after = new Promise((resolve) => ref.afterClosed().subscribe(resolve));
    document.querySelector<HTMLButtonElement>('#drawer-ok')!.click();
    await expect(after).resolves.toBe('fait');
  });
});
