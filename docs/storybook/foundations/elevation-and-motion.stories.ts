import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { DocElevationComponent } from './foundation-pages';

/** Page de fondations : une story unique, générée depuis les tokens résolus (voir foundation-pages.ts). */
const meta: Meta = {
  title: 'Foundations/Elevation and motion',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [DocElevationComponent] })],
  parameters: { controls: { disable: true }, actions: { disable: true } },
};
export default meta;

export const ElevationAndMotion: StoryObj = {
  name: 'Elevation and motion',
  render: () => ({ template: '<lc-doc-elevation />' }),
};
