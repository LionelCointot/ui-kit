import { Component, inject, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcConfirmDialogComponent } from '../dialog/confirm-dialog.component';
import { LcDialogService, type LcConfirmOptions } from '../dialog/dialog.service';

/** Button that asks for a confirmation through `LcDialogService.confirm()` and shows the boolean answer. */
@Component({
  selector: 'lc-confirm-demo',
  imports: [LcButtonComponent],
  template: `
    <button lcButton type="button" [themeColor]="destructive() ? 'error' : 'primary'" (click)="ask()">{{ destructive() ? 'Supprimer le projet' : 'Archiver le projet' }}</button>
    <p style="margin-block-start:var(--lc-sys-space-4, 16px)">Réponse : {{ answer() }}</p>
  `,
})
class ConfirmDemoComponent {
  private readonly dialogs = inject(LcDialogService);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input<string>();
  readonly cancelLabel = input<string>();
  readonly destructive = input(false);
  protected readonly answer = signal('aucune');

  protected async ask(): Promise<void> {
    const options: LcConfirmOptions = {
      title: this.title(),
      message: this.message(),
      destructive: this.destructive(),
      ...(this.confirmLabel() ? { confirmLabel: this.confirmLabel() } : {}),
      ...(this.cancelLabel() ? { cancelLabel: this.cancelLabel() } : {}),
    };
    this.answer.set((await this.dialogs.confirm(options)) ? 'confirmé' : 'annulé');
  }
}

/**
 * Yes/no confirmation opened by `LcDialogService.confirm(options)`: an `alertdialog` that resolves `true` when confirmed and `false` otherwise.
 * `LcConfirmDialogComponent` is the internal component it opens; application code only calls the service.
 * Default button labels come from `LC_LABELS` (`confirm`, `cancel`).
 *
 * Import: `import { LcDialogService, type LcConfirmOptions } from '@lionelcointot/ui-angular/overlay';`
 */
const meta: Meta<LcConfirmOptions> = {
  title: 'Overlays/Confirm dialog',
  component: LcConfirmDialogComponent,
  decorators: [moduleMetadata({ imports: [ConfirmDemoComponent] })],
  args: { title: 'Supprimer ce projet ?', message: 'Cette action est définitive.', confirmLabel: '', cancelLabel: '', destructive: false },
  argTypes: {
    title: { control: 'text' },
    message: { control: 'text' },
    confirmLabel: { control: 'text', description: 'Empty: default `LC_LABELS.confirm`.' },
    cancelLabel: { control: 'text', description: 'Empty: default `LC_LABELS.cancel`.' },
    destructive: { control: 'boolean', description: 'Confirm button in `themeColor="error"`.' },
  },
};
export default meta;
type Story = StoryObj<LcConfirmOptions>;

/** Every `LcConfirmOptions` field is bound: click the button, then answer the dialog. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-confirm-demo [title]="title" [message]="message" [confirmLabel]="confirmLabel" [cancelLabel]="cancelLabel" [destructive]="destructive" />`,
  }),
};

/** Destructive confirmation with custom labels. */
export const Destructive: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<lc-confirm-demo title="Supprimer ce projet ?" message="Les tâches associées seront aussi supprimées." confirmLabel="Supprimer" cancelLabel="Conserver" [destructive]="true" />`,
  }),
};
