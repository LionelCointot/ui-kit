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
  // Page de fondations : l'extrait montre l'usage des tokens, la démonstration elle-même est générée (foundation-pages.ts).
  parameters: {
    docs: {
      source: {
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  template: '<div class="panel">Contenu espacé et arrondi</div>',
  styles: '.panel { padding: var(--lc-sys-space-4); border: 1px solid var(--lc-sys-color-border); border-radius: var(--lc-sys-radius-lg); }',
})
export class ExampleComponent {}`,
      },
    },
  },
  render: () => ({ template: '<lc-doc-spacing />' }),
};
