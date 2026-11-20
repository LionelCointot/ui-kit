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
  // Page de fondations : l'extrait montre l'usage des tokens, la démonstration elle-même est générée (foundation-pages.ts).
  parameters: {
    docs: {
      source: {
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  template: '<p class="callout">Message mis en avant</p>',
  styles: '.callout { background: var(--lc-sys-color-primary); color: var(--lc-sys-color-on-primary); padding: var(--lc-sys-space-3); border-radius: var(--lc-sys-radius-md); }',
})
export class ExampleComponent {}`,
      },
    },
  },
  render: () => ({ template: '<lc-doc-colors />' }),
};
