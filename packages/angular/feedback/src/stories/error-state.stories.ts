import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcErrorDetailsDirective, LcErrorStateComponent } from '../error-state/error-state.component';

/**
 * Error state: title, description, a retry button (`retry` output, label overridable) and an optional collapsible
 * technical detail (`[lcErrorDetails]` slot, for example a trace identifier).
 *
 * Import: `import { LcErrorStateComponent, LcErrorDetailsDirective } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<LcErrorStateComponent> = {
  title: 'Feedback/Error state',
  component: LcErrorStateComponent,
  decorators: [moduleMetadata({ imports: [LcErrorStateComponent, LcErrorDetailsDirective] })],
  args: { title: 'Chargement impossible', description: 'La liste des projets n’a pas pu être récupérée.', retryLabel: undefined },
  argTypes: { retry: { action: 'retry' }, retryLabel: { control: 'text' } },
};
export default meta;
type Story = StoryObj<LcErrorStateComponent>;

/** Every input is bound: change them in the Controls panel (leave `retryLabel` empty for the default label). */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-error-state [title]="title" [description]="description" [retryLabel]="retryLabel" (retry)="retry($event)" />`,
  }),
};

/** The `[lcErrorDetails]` slot adds a collapsible technical detail under the retry button. */
export const WithDetails: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<lc-error-state title="Chargement impossible" description="Le serveur ne répond pas.">
      <p lcErrorDetails style="margin:0">Identifiant de trace : <code>7f3a-92c1-0b4e</code><br />Code : 503</p></lc-error-state>`,
  }),
};

/** Custom retry label, no description. */
export const CustomRetryLabel: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<lc-error-state title="Synchronisation interrompue" retryLabel="Relancer la synchronisation" />`,
  }),
};
