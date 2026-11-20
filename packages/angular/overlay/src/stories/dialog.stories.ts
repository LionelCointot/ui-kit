import { Component, inject, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcDialogComponent } from '../dialog/dialog.component';
import { LC_DIALOG_DATA, LcDialogRef } from '../dialog/dialog-ref';
import { LcDialogService, type LcDialogConfig } from '../dialog/dialog.service';

interface DemoData {
  readonly title: string;
  readonly message: string;
  readonly hideClose: boolean;
}

/** Component opened in the dialog: `lc-dialog` provides the layout, the message is linked through `aria-describedby`. */
@Component({
  selector: 'lc-dialog-demo-content',
  imports: [LcDialogComponent, LcButtonComponent],
  template: `
    <lc-dialog [title]="data.title" [hideClose]="data.hideClose">
      <p id="lc-dialog-demo-message" style="margin:0">{{ data.message }}</p>
      <ng-container ngProjectAs="[lcDialogActions]">
        <button lcButton type="button" fillMode="outline" themeColor="neutral" (click)="ref.close(false)">Annuler</button>
        <button lcButton type="button" (click)="ref.close(true)">Valider</button>
      </ng-container>
    </lc-dialog>
  `,
})
class DialogDemoContentComponent {
  protected readonly ref = inject<LcDialogRef<boolean>>(LcDialogRef);
  protected readonly data = inject(LC_DIALOG_DATA) as DemoData;
}

/** Button that opens the dialog through `LcDialogService.open()` with the given title, message and config. */
@Component({
  selector: 'lc-dialog-demo',
  imports: [LcButtonComponent],
  template: `<button lcButton type="button" (click)="open()">Ouvrir le dialogue</button>`,
})
class DialogDemoComponent {
  private readonly dialogs = inject(LcDialogService);
  readonly title = input('Revenir au niveau Simple ?');
  readonly message = input('Vos réglages détaillés seront conservés, mais masqués.');
  readonly hideClose = input(true);
  readonly config = input<LcDialogConfig<unknown>>({});

  protected open(): void {
    const data: DemoData = { title: this.title(), message: this.message(), hideClose: this.hideClose() };
    this.dialogs.open(DialogDemoContentComponent, { size: 'small', ...this.config(), data });
  }
}

type Args = LcDialogComponent & Required<Pick<LcDialogConfig<unknown>, 'size' | 'dismissible' | 'role'>> & { message: string };

/**
 * Modal dialog opened by `LcDialogService.open(Component, config)`: focus is trapped then restored, Escape closes the top dialog.
 * The opened component places `lc-dialog` in its template for the title, body and actions; `LcDialogService.confirm()` covers the yes/no case.
 *
 * Import: `import { LcDialogComponent, LcDialogService } from '@lionelcointot/ui-angular/overlay';`
 */
const meta: Meta<Args> = {
  title: 'Overlays/Dialog',
  component: LcDialogComponent,
  decorators: [moduleMetadata({ imports: [DialogDemoComponent] })],
  args: {
    title: 'Revenir au niveau Simple ?',
    message: 'Vos réglages détaillés seront conservés, mais masqués.',
    hideClose: true,
    size: 'small',
    dismissible: true,
    role: 'dialog',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large', 'fullscreen'], description: 'Service config `size`.' },
    dismissible: { control: 'boolean', description: 'Service config `dismissible`: Escape, backdrop click and close button.' },
    role: { control: 'inline-radio', options: ['dialog', 'alertdialog'], description: 'Service config `role`.' },
    message: { control: 'text', description: 'Body text of the demo content.' },
  },
};
export default meta;
type Story = StoryObj<Args>;

/** Click the button to open the dialog: every control (title, message, close button, size, dismissal, role) is applied. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, config: { size: args.size, dismissible: args.dismissible, role: args.role, ariaDescribedBy: 'lc-dialog-demo-message' } satisfies LcDialogConfig<unknown> },
    template: `<lc-dialog-demo [title]="title" [message]="message" [hideClose]="hideClose" [config]="config" />`,
  }),
};

/**
 * `role: 'alertdialog'`: a message that interrupts and waits for an answer (confirmation, destructive action).
 * `ariaDescribedBy` links the message to the dialog. `LcDialogService.confirm()` already opens an `alertdialog`.
 */
export const AlertDialog: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { config: { role: 'alertdialog', ariaDescribedBy: 'lc-dialog-demo-message' } satisfies LcDialogConfig<unknown> },
    template: `<lc-dialog-demo [config]="config" />`,
  }),
};
