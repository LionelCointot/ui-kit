import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import type { LcThemeDefinition } from '@lionelcointot/ui-tokens/theme';
import { LcThemeBuilderComponent } from '../builder/theme-builder.component';

/**
 * Page « Outils / Theme builder » : régler les paramètres, voir tous les composants changer en direct (sur toute la
 * page), puis exporter en `.tokens.json` (thème produit, `lc-tokens build`) ou en `.css`. La barre d'outils « Thème »
 * fixe la base de départ (clair ou sombre).
 */
const meta: Meta<LcThemeBuilderComponent> = {
  title: 'Outils/Theme builder',
  component: LcThemeBuilderComponent,
  decorators: [moduleMetadata({ imports: [LcThemeBuilderComponent] })],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<LcThemeBuilderComponent>;

export const ThemeBuilder: Story = {
  name: 'Theme builder',
  render: (_args, context) => {
    const theme: LcThemeDefinition = { name: 'mon-theme', extends: context.globals['theme'] === 'dark' ? 'dark' : 'default', overrides: {} };
    return { props: { theme }, template: `<lc-theme-builder [(theme)]="theme" />` };
  },
};
