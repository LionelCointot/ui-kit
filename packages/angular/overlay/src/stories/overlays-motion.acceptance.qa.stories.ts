import { Component, inject } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcRevealDirective } from '@lionelcointot/ui-angular';
import { LcDialogComponent, LcDialogRef, LcDialogService, LcDrawerComponent, LcDrawerRef, LcDrawerService } from '@lionelcointot/ui-angular/overlay';

/**
 * Support des critères CA-23 (origine du dialogue, présentation en `lc-sheet` à 767 / 768 px) et de la cascade du tiroir
 * de la spec 2026-12-mouvement-v2 (tâche T9a) ; piloté par `node tools/qa/overlays-motion-browser.mjs`.
 * Contrat : les lignes du tiroir portent `lcReveal`, c'est `lc-drawer` qui pose le `lcStagger` parent.
 */
const qa = () => ((window as unknown as { __qa?: Record<string, unknown[]> }).__qa ??= { results: [] });

@Component({
  selector: 'lc-qa-ov-dialog',
  imports: [LcDialogComponent, LcButtonComponent],
  template: `<lc-dialog title="Dialogue QA"><p>Contenu</p><button lcButton id="qa-dialog-ok" type="button" (click)="ref.close('valeur-dialogue')">Valider</button></lc-dialog>`,
})
class QaDialogComponent { protected readonly ref = inject(LcDialogRef); }

@Component({
  selector: 'lc-qa-ov-drawer',
  imports: [LcDrawerComponent, LcButtonComponent, LcRevealDirective],
  template: `
    <lc-drawer title="Tiroir QA">
      @for (n of rows; track n) { <p class="qa-row" lcReveal>Ligne {{ n }}</p> }
      <button lcButton id="qa-drawer-ok" type="button" (click)="ref.close('valeur-tiroir')">Valider</button>
    </lc-drawer>`,
})
class QaDrawerComponent {
  protected readonly ref = inject(LcDrawerRef);
  protected readonly rows = [1, 2, 3, 4];
}

@Component({
  selector: 'lc-qa-ov',
  imports: [LcButtonComponent],
  template: `
    <button lcButton id="qa-open-dialog" type="button" style="position:fixed;left:16px;top:16px" (click)="dialog()">Ouvrir le dialogue</button>
    <button lcButton id="qa-open-dialog-b" type="button" style="position:fixed;right:16px;bottom:16px" (click)="dialog()">Ouvrir le dialogue (bas)</button>
    <button lcButton id="qa-open-drawer" type="button" style="position:fixed;left:16px;top:72px" (click)="drawer()">Ouvrir le tiroir</button>
    <button lcButton id="qa-open-confirm" type="button" style="position:fixed;left:16px;top:128px" (click)="confirm()">Confirmer</button>`,
})
class QaOverlaysComponent {
  private readonly dialogs = inject(LcDialogService);
  private readonly drawers = inject(LcDrawerService);
  protected dialog(): void { void this.dialogs.open(QaDialogComponent, { size: 'small' }).closed.then((r) => qa()['results'].push(['dialog', r])); }
  protected drawer(): void { void this.drawers.open(QaDrawerComponent).closed.then((r) => qa()['results'].push(['drawer', r])); }
  protected confirm(): void { void this.dialogs.confirm({ title: 'Supprimer ?', message: 'Irréversible.' }).then((r) => qa()['results'].push(['confirm', r])); }
}

const meta: Meta = {
  title: 'QA/Overlays/Motion v2',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaOverlaysComponent] })],
  render: () => ({ template: '<lc-qa-ov />' }),
};
export default meta;
export const Overlays: StoryObj = {};
