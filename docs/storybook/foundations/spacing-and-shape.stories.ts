import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { DocSpacingComponent } from './foundation-pages';

/** Page de fondations : une story unique, générée depuis les tokens résolus (voir foundation-pages.ts). */
const meta: Meta = {
  title: 'Foundations/Spacing and shape',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [DocSpacingComponent] })],
  parameters: { controls: { disable: true }, actions: { disable: true } },
};
export default meta;

export const SpacingAndShape: StoryObj = {
  name: 'Spacing and shape',
  render: () => ({ template: '<lc-doc-spacing />' }),
};
