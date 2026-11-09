import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { type LcThemeDefinition, resolveTheme } from '@lionelcointot/ui-tokens/theme';
import { LcThemeContrastReportComponent } from '../contrast-report/theme-contrast-report.component';
import { LcThemeEditorComponent } from '../editor/theme-editor.component';
import { LcThemePreviewComponent } from '../preview/theme-preview.component';

const teal: LcThemeDefinition = {
  name: 'teal',
  extends: 'default',
  overrides: { 'color.primary': '#0b5f5a', 'color.on-primary': '#ffffff', 'color.primary-container': '#d3ece9', 'color.on-primary-container': '#06403c', 'radius.md': '12px' },
};

const meta: Meta = {
  title: 'Outils/Composants du theme builder',
  decorators: [moduleMetadata({ imports: [LcThemeEditorComponent, LcThemeContrastReportComponent, LcThemePreviewComponent] })],
};
export default meta;
type Story = StoryObj;

export const EditeurSimple: Story = {
  name: 'Éditeur (mode simple)',
  render: () => ({ props: { theme: teal }, template: `<lc-theme-editor [(theme)]="theme" mode="simple" />` }),
};

export const EditeurAvance: Story = {
  name: 'Éditeur (mode avancé)',
  render: () => ({ props: { theme: teal }, template: `<lc-theme-editor [(theme)]="theme" mode="advanced" />` }),
};

export const RapportDeContraste: Story = {
  name: 'Rapport de contraste',
  render: () => ({
    props: { ok: resolveTheme({ extends: 'default', overrides: {} }), weak: resolveTheme({ extends: 'default', overrides: { 'color.primary': '#9ab6d9' } }) },
    template: `<lc-theme-contrast-report [resolved]="ok" /><hr /><lc-theme-contrast-report [resolved]="weak" />`,
  }),
};

export const Apercu: Story = {
  name: 'Aperçu des composants',
  render: () => ({ template: `<lc-theme-preview />` }),
};
