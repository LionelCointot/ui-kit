import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { DocMotionComponent } from './foundation-pages';

/** Page de fondations : une story unique, générée depuis les tokens résolus (voir foundation-pages.ts). */
const meta: Meta = {
  title: 'Foundations/Motion',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [DocMotionComponent] })],
  parameters: { controls: { disable: true }, actions: { disable: true } },
};
export default meta;

export const Motion: StoryObj = {
  name: 'Motion',
  // Page de fondations : l'extrait montre l'usage des tokens, la démonstration elle-même est générée (foundation-pages.ts).
  parameters: {
    docs: {
      source: {
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  template: '<div class="panel">Panneau</div>',
  styles: '.panel { animation: enter var(--lc-sys-duration-normal) var(--lc-sys-easing-standard); } @keyframes enter { from { opacity: 0; transform: translateY(calc(-1 * var(--lc-sys-motion-offset-sm))); } }',
})
export class ExampleComponent {}`,
      },
    },
  },
  render: () => ({ template: '<lc-doc-motion />' }),
};
