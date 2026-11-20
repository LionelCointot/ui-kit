import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { DocTypographyComponent } from './foundation-pages';

/** Page de fondations : une story unique, générée depuis les tokens résolus (voir foundation-pages.ts). */
const meta: Meta = {
  title: 'Foundations/Typography',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [DocTypographyComponent] })],
  parameters: { controls: { disable: true }, actions: { disable: true } },
};
export default meta;

export const Typography: StoryObj = {
  name: 'Typography',
  render: () => ({ template: '<lc-doc-typography />' }),
};
