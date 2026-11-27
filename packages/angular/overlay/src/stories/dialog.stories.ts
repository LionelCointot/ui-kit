import { ChangeDetectionStrategy, Component, DestroyRef, inject, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcDialogComponent, LC_DIALOG_DATA, LcDialogRef, LcDialogService, type LcDialogConfig } from '@lionelcointot/ui-angular/overlay';

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
  // S'ouvre au clic : la vérification des contrôles clique sur le bouton avant de comparer le rendu.
  // dismissible : comportement à la fermeture, sans effet visible sur le rendu.
  parameters: { controlsCheck: { openWith: 'button', stateDependent: ['dismissible'] } },
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

const ANIMATION_CODE = `import { Component, inject } from '@angular/core';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcDialogService } from '@lionelcointot/ui-angular/overlay';

@Component({
  selector: 'app-example',
  imports: [LcButtonComponent],
  template: \`<button lcButton type="button" (click)="open()">Ouvrir le dialogue</button>\`,
})
export class ExampleComponent {
  private readonly dialogs = inject(LcDialogService);

  protected open(): void {
    // The dialog grows from the focused element at the time of the call (here the button).
    this.dialogs.open(ConfirmContentComponent, { size: 'small' });
  }
}`;

/** Demo of the `Animation` story: "Rejouer" focuses the "Ouvrir" button and opens the dialog from it. */
@Component({
  selector: 'lc-dialog-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcButtonComponent, StoryMotionNoticeComponent],
  template: `
    <lc-story-motion-notice />
    <div data-demo="d26" #root style="display:flex;gap:var(--lc-sys-space-3);align-items:center;padding-block:var(--lc-sys-space-8)">
      <button lcButton fillMode="outline" size="small" (click)="replayer.replay(root)">Rejouer</button>
      <button lcButton type="button" data-opener (click)="show()">Ouvrir le dialogue</button>
    </div>`,
})
class DialogAnimationDemoComponent {
  private readonly dialogs = inject(LcDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private ref: LcDialogRef | undefined;
  protected readonly replayer = replayable({
    reset: () => this.ref?.close(),
    play: (_later, root) => {
      root.querySelector<HTMLElement>('[data-opener]')?.focus();
      this.show();
    },
    destroyRef: this.destroyRef,
  });

  protected show(): void {
    this.ref = this.dialogs.open(DialogDemoContentComponent, { size: 'small', data: { title: 'Revenir au niveau Simple ?', message: 'Vos réglages détaillés seront conservés, mais masqués.', hideClose: true } satisfies DemoData });
  }
}

/** The dialog grows from the button that opened it (scale 0.91 to 1 in 500 ms) and leaves in 150 ms; below 768 px it is presented as a bottom sheet. "Rejouer" opens it again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  decorators: [moduleMetadata({ imports: [DialogAnimationDemoComponent] })],
  render: () => ({ template: `<lc-dialog-animation-demo />` }),
};
