import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { fixedExample } from '@lc/storybook';
import { LcAlertComponent } from '@lionelcointot/ui-angular/feedback';

const KINDS = ['info', 'success', 'warning', 'error'] as const;

/**
 * Inline alert: always an icon and a text, in one of four kinds. Optional title and close button;
 * with `live`, a dynamic insertion is announced to screen readers.
 *
 * Import: `import { LcAlertComponent } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<LcAlertComponent> = {
  title: 'Feedback/Alert',
  component: LcAlertComponent,
  decorators: [moduleMetadata({ imports: [LcAlertComponent, LcButtonComponent] })],
  args: { kind: 'info', title: 'Maintenance programmée', dismissible: false, live: false },
  argTypes: { kind: { control: 'inline-radio', options: [...KINDS] }, dismissed: { action: 'dismissed' } },
};
export default meta;
type Story = StoryObj<LcAlertComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="max-width:36rem"><lc-alert [kind]="kind" [title]="title" [dismissible]="dismissible" [live]="live" (dismissed)="dismissed($event)">
      Le service sera indisponible samedi de 2 h à 4 h.</lc-alert></div>`,
  }),
};

/** The four kinds, each with its own icon. */
export const Kinds: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);max-width:36rem">
      <lc-alert kind="info">Une nouvelle version est disponible.</lc-alert>
      <lc-alert kind="success">Le document a été enregistré.</lc-alert>
      <lc-alert kind="warning">L'espace de stockage est presque plein.</lc-alert>
      <lc-alert kind="error">L'envoi a échoué : vérifiez votre connexion.</lc-alert></div>`,
  }),
};

/** With a title and a close button: the alert hides itself and emits `dismissed`. */
export const WithTitleAndClose: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:36rem"><lc-alert kind="warning" title="Fichier volumineux" [dismissible]="true">
      Ce fichier dépasse 50 Mo : l'import peut prendre plusieurs minutes.</lc-alert></div>`,
  }),
};

/** An alert inserted on demand with `live`: announced as `role="alert"` for warning and error, `role="status"` otherwise. */
export const LiveInsertion: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { shown: false },
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);max-width:36rem">
      <div><button lcButton (click)="shown = !shown">{{ shown ? 'Masquer' : 'Afficher' }} l'alerte</button></div>
      @if (shown) { <lc-alert kind="error" title="Échec de l'envoi" [live]="true">Réessayez dans quelques instants.</lc-alert> }</div>`,
  }),
};

/** Composition with an action button inside the content. */
export const WithAction: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:36rem"><lc-alert kind="info" title="Mise à jour disponible">
      <p style="margin:0 0 var(--lc-sys-space-2)">La version 2.4 corrige plusieurs erreurs d'affichage.</p>
      <button lcButton size="small" fillMode="outline">Mettre à jour</button></lc-alert></div>`,
  }),
};
