import { Component, inject, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcDialogComponent } from '../dialog/dialog.component';
import { LcDialogRef } from '../dialog/dialog-ref';
import { LcDialogService, type LcDialogConfig } from '../dialog/dialog.service';

/** Composant ouvert dans le dialogue : `lc-dialog` pour la mise en page, le message est relié par `aria-describedby`. */
@Component({
  selector: 'lc-dialog-demo-content',
  imports: [LcDialogComponent, LcButtonComponent],
  template: `
    <lc-dialog title="Revenir au niveau Simple ?" hideClose>
      <p id="lc-dialog-demo-message" style="margin:0">Vos réglages détaillés seront conservés, mais masqués.</p>
      <ng-container ngProjectAs="[lcDialogActions]">
        <button lcButton type="button" fillMode="outline" themeColor="neutral" (click)="ref.close(false)">Annuler</button>
        <button lcButton type="button" (click)="ref.close(true)">Revenir</button>
      </ng-container>
    </lc-dialog>
  `,
})
class DialogDemoContentComponent {
  protected readonly ref = inject<LcDialogRef<boolean>>(LcDialogRef);
}

@Component({
  selector: 'lc-dialog-demo',
  imports: [LcButtonComponent],
  template: `<button lcButton type="button" (click)="open()">Ouvrir le dialogue</button>`,
})
class DialogDemoComponent {
  private readonly dialogs = inject(LcDialogService);
  readonly config = input<LcDialogConfig<unknown>>({});

  protected open(): void {
    this.dialogs.open(DialogDemoContentComponent, { size: 'small', ...this.config() });
  }
}

const meta: Meta<DialogDemoComponent> = {
  title: 'Superpositions/Dialogue',
  decorators: [moduleMetadata({ imports: [DialogDemoComponent, LcDialogComponent, LcButtonComponent] })],
  render: (args) => ({ props: args, template: `<lc-dialog-demo [config]="config" />` }),
  args: { config: {} },
};
export default meta;
type Story = StoryObj<DialogDemoComponent>;

/** Rôle `dialog` (défaut). */
export const Defaut: Story = {};

/**
 * `role: 'alertdialog'` : message qui interrompt et attend une réponse (confirmation, action destructive).
 * `ariaDescribedBy` relie le message au dialogue. `LcDialogService.confirm()` ouvre déjà un `alertdialog`.
 */
export const AlerteDialogue: Story = {
  args: { config: { role: 'alertdialog', ariaDescribedBy: 'lc-dialog-demo-message' } },
};
