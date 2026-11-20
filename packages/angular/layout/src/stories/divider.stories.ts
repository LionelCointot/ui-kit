import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcDividerComponent } from '../divider/divider.component';

/**
 * Horizontal or vertical separator (`role="separator"`).
 *
 * Import: `import { LcDividerComponent } from '@lionelcointot/ui-angular/layout';`
 */
const meta: Meta<LcDividerComponent> = {
  title: 'Layout/Divider',
  component: LcDividerComponent,
  decorators: [moduleMetadata({ imports: [LcDividerComponent] })],
  args: { orientation: 'horizontal' },
  argTypes: { orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] } },
};
export default meta;
type Story = StoryObj<LcDividerComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display:flex;gap:var(--lc-sys-space-4);align-items:stretch;height:6rem;max-width:24rem"
        [style.flex-direction]="orientation === 'vertical' ? 'row' : 'column'">
        <span>Avant</span>
        <lc-divider [orientation]="orientation" />
        <span>Après</span>
      </div>`,
  }),
};

/** Horizontal separator between two blocks of text. */
export const Horizontal: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="max-width:24rem">
        <p>Résumé du projet.</p>
        <lc-divider />
        <p>Liste des tâches.</p>
      </div>`,
  }),
};

/** Vertical separator between inline items. */
export const Vertical: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="display:flex;gap:var(--lc-sys-space-4);align-items:stretch">
        <span>Accueil</span><lc-divider orientation="vertical" /><span>Projets</span><lc-divider orientation="vertical" /><span>Équipe</span>
      </div>`,
  }),
};
