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
  // Page de fondations : l'extrait montre l'usage des tokens, la démonstration elle-même est générée (foundation-pages.ts).
  parameters: {
    docs: {
      source: {
        code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  template: '<h2 class="title">Titre de section</h2><p class="body">Texte courant de la page.</p>',
  styles: '.title { font-family: var(--lc-sys-font-family-base); font-size: var(--lc-sys-font-size-xl); font-weight: var(--lc-sys-font-weight-semibold); } .body { font-size: var(--lc-sys-font-size-md); }',
})
export class ExampleComponent {}`,
      },
    },
  },
  render: () => ({ template: '<lc-doc-typography />' }),
};
