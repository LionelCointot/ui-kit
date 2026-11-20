import { ChangeDetectionStrategy, Component, OnDestroy, inject, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, type LcStatusKind } from '@lionelcointot/ui-angular';
import { fixedExample } from '@lc/storybook';
import { LcToastOutletComponent } from '../toast/toast-outlet.component';
import { LcToastService } from '../toast/toast.service';

const KINDS: readonly LcStatusKind[] = ['info', 'success', 'warning', 'error'];
const MESSAGES: Record<LcStatusKind, string> = {
  info: 'Une nouvelle version est disponible.',
  success: 'Le document a été enregistré.',
  warning: 'Connexion instable : certaines données peuvent être en retard.',
  error: "L'envoi a échoué.",
};

/** Demo only: buttons that call `LcToastService.show()`. Not part of the library. */
@Component({
  selector: 'toast-demo',
  imports: [LcButtonComponent],
  template: `
    <div style="display:flex;gap:var(--lc-sys-space-2);flex-wrap:wrap">
      @if (kind(); as kind) {
        <button lcButton [themeColor]="kind === 'info' ? 'primary' : kind" (click)="show(kind)">Afficher un toast</button>
      } @else {
        @for (item of kinds; track item) {
          <button lcButton fillMode="outline" [themeColor]="item === 'info' ? 'primary' : item" (click)="show(item)">{{ item }}</button>
        }
        <button lcButton fillMode="flat" themeColor="neutral" (click)="service.dismissAll()">Tout fermer</button>
      }
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ToastDemoComponent implements OnDestroy {
  protected readonly service = inject(LcToastService);
  protected readonly kinds = KINDS;
  /** When set, a single button shows a toast of this kind; otherwise one button per kind. */
  readonly kind = input<LcStatusKind>();
  readonly message = input<string>();
  readonly durationMs = input<number>();
  readonly withAction = input(false);

  protected show(kind: LcStatusKind): void {
    this.service.show({
      kind,
      message: this.message() || MESSAGES[kind],
      durationMs: this.durationMs(),
      action: this.withAction() ? { label: 'Annuler', run: () => this.service.show({ kind: 'info', message: 'Action annulée.' }) } : undefined,
    });
  }

  ngOnDestroy(): void {
    this.service.dismissAll();
  }
}

interface ToastArgs {
  kind: LcStatusKind;
  message: string;
  durationMs: number;
  withAction: boolean;
}

/**
 * Ephemeral notifications: `LcToastService.show({ kind, message, action?, durationMs? })` displays a toast, and
 * `<lc-toast-outlet />` (placed once at the application root) renders the stack. At most three toasts are visible,
 * the timer pauses on hover and focus, and errors stay until closed.
 *
 * Import: `import { LcToastService, LcToastOutletComponent } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<ToastArgs> = {
  title: 'Feedback/Toast',
  component: LcToastOutletComponent,
  decorators: [moduleMetadata({ imports: [ToastDemoComponent, LcToastOutletComponent] })],
  args: { kind: 'success', message: 'Le document a été enregistré.', durationMs: 5000, withAction: false },
  argTypes: {
    kind: { control: 'inline-radio', options: [...KINDS] },
    message: { control: 'text' },
    durationMs: { control: { type: 'number', min: 1000, step: 500 }, description: 'Display duration in ms (ignored for `error`).' },
    withAction: { control: 'boolean', description: 'Adds an action button to the toast.' },
  },
};
export default meta;
type Story = StoryObj<ToastArgs>;

/** Click the button: every service option is bound (`kind`, `message`, `durationMs`, `action`). */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['message', 'durationMs', 'withAction'] } },
  render: (args) => ({
    props: args,
    template: `<toast-demo [kind]="kind" [message]="message" [durationMs]="durationMs" [withAction]="withAction" /><lc-toast-outlet />`,
  }),
};

/** One button per kind: info, success, warning and error (the error toast stays until closed). */
export const AllKinds: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<toast-demo /><lc-toast-outlet />` }),
};

/** A toast with an action button: it runs the callback and closes the toast. */
export const WithAction: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<toast-demo kind="success" message="Fichier supprimé." [withAction]="true" /><lc-toast-outlet />`,
  }),
};

/** Click repeatedly: at most three toasts stay visible, the oldest non-error one is dropped first. */
export const Stacking: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<toast-demo kind="info" [durationMs]="15000" /><lc-toast-outlet />` }),
};
