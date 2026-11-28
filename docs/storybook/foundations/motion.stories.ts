import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { DocMotionComponent } from './motion-page';

/** Page de fondations : les attributs de mouvement un besoin à la fois, les courbes, les réglages et les recettes (voir motion-page.ts). */
const meta: Meta = {
  title: 'Foundations/Motion',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [DocMotionComponent] })],
  parameters: { controls: { disable: true }, actions: { disable: true } },
};
export default meta;

export const Motion: StoryObj = {
  name: 'Motion',
  // Page de fondations : l'extrait montre l'usage des attributs, la démonstration elle-même est dans motion-page.ts.
  parameters: {
    docs: {
      source: {
        code: `import { Component } from '@angular/core';
import { LcRevealDirective, LcStaggerDirective } from '@lionelcointot/ui-angular';

@Component({
  selector: 'app-example',
  imports: [LcRevealDirective, LcStaggerDirective],
  template: \`
    <section lcStagger>
      <article lcReveal>Projet</article>
      <article lcReveal>Tâches</article>
      <article lcReveal>Équipe</article>
    </section>\`,
})
export class ExampleComponent {}`,
      },
    },
  },
  render: () => ({ template: '<lc-doc-motion />' }),
};
