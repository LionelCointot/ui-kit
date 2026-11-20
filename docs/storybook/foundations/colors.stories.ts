import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { DocColorsComponent } from './foundation-pages';

/** Page de fondations : une story unique, générée depuis les tokens résolus (voir foundation-pages.ts). */
const meta: Meta = {
  title: 'Foundations/Colors',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [DocColorsComponent] })],
  parameters: { controls: { disable: true }, actions: { disable: true } },
};
export default meta;

export const Colors: StoryObj = {
  name: 'Colors',
  render: () => ({ template: '<lc-doc-colors />' }),
};
