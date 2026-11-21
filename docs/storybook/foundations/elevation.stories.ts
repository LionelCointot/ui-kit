import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { DocElevationComponent } from './foundation-pages';

/** Page de fondations : une story unique, générée depuis les tokens résolus (voir foundation-pages.ts). */
const meta: Meta = {
  title: 'Foundations/Elevation',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [DocElevationComponent] })],
  parameters: { controls: { disable: true }, actions: { disable: true } },
};
export default meta;

export const Elevation: StoryObj = {
  name: 'Elevation',
  // Page de fondations : l'extrait montre l'usage des tokens, la démonstration elle-même est générée (foundation-pages.ts).
  parameters: {
    docs: {
      source: {
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  template: '<div class="card">Carte surélevée</div>',
  styles: '.card { padding: var(--lc-sys-space-4); box-shadow: var(--lc-sys-shadow-2); }',
})
export class ExampleComponent {}`,
      },
    },
  },
  render: () => ({ template: '<lc-doc-elevation />' }),
};
