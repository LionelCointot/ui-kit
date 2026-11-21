import { Component, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcDialogComponent, LcDialogRef, LcDialogService, LcDrawerComponent, LcDrawerRef, LcDrawerService, LcSheetComponent } from '@lionelcointot/ui-angular/overlay';

/** Supports des critères CA-S*, CA-O* (spec 2026-11-mouvement-ios) ; pilotés par `tools/qa/ios-motion-browser.mjs`. Résultats dans `window.__qa`. */
const qa = () => ((window as unknown as { __qa?: Record<string, unknown[]> }).__qa ??= { closed: [], results: [] });

@Component({
  selector: 'lc-qa-ios-dialog',
  imports: [LcDialogComponent, LcButtonComponent],
  template: `<lc-dialog title="Dialogue QA"><p>Contenu</p><button lcButton id="qa-dialog-ok" type="button" (click)="ref.close('valeur-dialogue')">Valider</button></lc-dialog>`,
})
class QaDialogComponent { protected readonly ref = inject(LcDialogRef); }

@Component({
  selector: 'lc-qa-ios-drawer',
  imports: [LcDrawerComponent, LcButtonComponent],
  template: `<lc-drawer title="Tiroir QA"><p>Contenu</p><button lcButton id="qa-drawer-ok" type="button" (click)="ref.close('valeur-tiroir')">Valider</button></lc-drawer>`,
})
class QaDrawerComponent { protected readonly ref = inject(LcDrawerRef); }

@Component({
  selector: 'lc-qa-ios',
  imports: [LcButtonComponent, LcSheetComponent],
  template: `
    <button lcButton id="qa-open-sheet" type="button" (click)="open.set(true)">Ouvrir la feuille</button>
    <button lcButton id="qa-open-dialog" type="button" (click)="dialog()">Ouvrir le dialogue</button>
    <button lcButton id="qa-open-drawer" type="button" (click)="drawer()">Ouvrir le tiroir</button>
    <lc-sheet title="Feuille QA" [(open)]="open" (closed)="onClosed()">
      <p id="qa-sheet-body-first">Début du contenu</p>
      @for (n of lines; track n) { <p>Ligne {{ n }}</p> }
      <button lcSheetFooter lcButton type="button" id="qa-sheet-footer" (click)="open.set(false)">Fermer</button>
    </lc-sheet>`,
})
class QaIosComponent {
  protected readonly open = signal(false);
  protected readonly lines = Array.from({ length: 60 }, (_, i) => i + 1);
  private readonly dialogs = inject(LcDialogService);
  private readonly drawers = inject(LcDrawerService);
  protected onClosed(): void { qa()['closed'].push(Date.now()); }
  protected dialog(): void { void this.dialogs.open(QaDialogComponent, { size: 'small' }).closed.then((r) => qa()['results'].push(['dialog', r, Date.now()])); }
  protected drawer(): void { void this.drawers.open(QaDrawerComponent).closed.then((r) => qa()['results'].push(['drawer', r, Date.now()])); }
}

const meta: Meta = {
  title: 'QA/Overlays/iOS motion',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaIosComponent] })],
  render: () => ({ template: '<lc-qa-ios />' }),
};
export default meta;
export const Overlays: StoryObj = {};
