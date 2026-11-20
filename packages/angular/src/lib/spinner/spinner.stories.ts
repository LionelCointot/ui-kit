import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes, fixedExample } from '@lc/storybook';
import { LcButtonComponent, LcSpinnerComponent } from '@lionelcointot/ui-angular';

/**
 * Loading indicator: a decorative ring plus a visually hidden text announced to screen readers (`role="status"`).
 * Defaults to the application size and to the `LC_LABELS.loading` text.
 *
 * Import: `import { LcSpinnerComponent } from '@lionelcointot/ui-angular';`
 */
const meta: Meta<LcSpinnerComponent> = {
  title: 'Feedback/Spinner',
  component: LcSpinnerComponent,
  decorators: [moduleMetadata({ imports: [LcSpinnerComponent, LcButtonComponent] })],
  args: { size: 'medium', label: 'Chargement des projets' },
  argTypes: { size: commonArgTypes.size },
};
export default meta;
type Story = StoryObj<LcSpinnerComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({ props: args, template: `<lc-spinner [size]="size" [label]="label" />` }),
};

/** `small`, `medium` and `large`. */
export const Sizes: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-4);align-items:center">
      <lc-spinner size="small" /><lc-spinner size="medium" /><lc-spinner size="large" /></div>`,
  }),
};

/** Inline with a text, in a loading panel. */
export const InAPanel: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div aria-busy="true" style="display:flex;gap:var(--lc-sys-space-3);align-items:center">
      <lc-spinner label="Chargement des tâches" /><span aria-hidden="true">Chargement des tâches…</span></div>`,
  }),
};

/** For a button, prefer the `loading` input of `button[lcButton]`, which shows the same ring. */
export const InAButton: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<button lcButton [loading]="true">Enregistrement</button>` }),
};
