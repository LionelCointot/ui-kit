import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import type { LcThemeDefinition } from '@lionelcointot/ui-tokens/theme';
import { LcThemeBuilderComponent } from '@lionelcointot/ui-angular/theme-builder';

/**
 * Theme builder page: tune the settings, watch every component change live (across the whole page), then export a `.tokens.json`
 * (product theme, built with `lc-tokens build`) or a `.css` file. The "Thème" toolbar picks the starting base (light or dark).
 *
 * Import: `import { LcThemeBuilderComponent } from '@lionelcointot/ui-angular/theme-builder';`
 */
const meta: Meta<LcThemeBuilderComponent> = {
  title: 'Tools/Theme builder',
  component: LcThemeBuilderComponent,
  decorators: [moduleMetadata({ imports: [LcThemeBuilderComponent] })],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<LcThemeBuilderComponent>;

/** The complete builder; its single input `theme` is a two-way model, so the story starts from the toolbar's base. */
export const Playground: Story = {
  // Extrait écrit à la main : le thème de départ dépend de la barre d'outils, ce que le générateur (code-snippet.ts) ne sait pas recopier.
  parameters: { ...fixedExample, layout: 'fullscreen', docs: { source: { code: `import { Component } from '@angular/core';
import { LcThemeDefinition } from '@lionelcointot/ui-angular';
import { LcThemeBuilderComponent } from '@lionelcointot/ui-angular/theme-builder';

@Component({
  selector: 'app-example',
  imports: [LcThemeBuilderComponent],
  template: '<lc-theme-builder [(theme)]="theme" />',
})
export class ExampleComponent {
  // Thème de départ : extends vaut 'default' (clair) ou 'dark' (sombre).
  theme: LcThemeDefinition = { name: 'mon-theme', extends: 'default', overrides: {} };
}` } } },
  render: (_args, context) => {
    const theme: LcThemeDefinition = { name: 'mon-theme', extends: context.globals['theme'] === 'dark' ? 'dark' : 'default', overrides: {} };
    return { props: { theme }, template: `<lc-theme-builder [(theme)]="theme" />` };
  },
};
