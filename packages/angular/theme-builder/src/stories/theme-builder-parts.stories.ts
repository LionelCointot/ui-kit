import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { type LcThemeDefinition, resolveTheme } from '@lionelcointot/ui-tokens/theme';
import { LcThemeContrastReportComponent, LcThemeEditorComponent, LcThemePreviewComponent } from '@lionelcointot/ui-angular/theme-builder';

const teal: LcThemeDefinition = {
  name: 'teal',
  extends: 'default',
  overrides: { 'color.primary': '#0b5f5a', 'color.on-primary': '#ffffff', 'color.primary-container': '#d3ece9', 'color.on-primary-container': '#06403c', 'radius.md': '12px' },
};

/**
 * The building blocks of the theme builder, usable on their own: the editor (`lc-theme-editor`, simple or advanced mode),
 * the WCAG contrast report (`lc-theme-contrast-report`) and the component preview (`lc-theme-preview`).
 *
 * Import: `import { LcThemeEditorComponent, LcThemeContrastReportComponent, LcThemePreviewComponent } from '@lionelcointot/ui-angular/theme-builder';`
 */
const meta: Meta<LcThemeEditorComponent> = {
  title: 'Tools/Theme builder parts',
  component: LcThemeEditorComponent,
  decorators: [moduleMetadata({ imports: [LcThemeEditorComponent, LcThemeContrastReportComponent, LcThemePreviewComponent] })],
  args: { mode: 'simple' },
  argTypes: { mode: { control: 'inline-radio', options: ['simple', 'advanced'] }, theme: { control: false } },
};
export default meta;
type Story = StoryObj<LcThemeEditorComponent>;

/** The editor with its `mode` input bound; edits flow back through `[(theme)]`. */
export const Playground: Story = {
  render: (args) => ({ props: { ...args, theme: teal }, template: `<lc-theme-editor [(theme)]="theme" [mode]="mode" />` }),
};

/** Editor in simple mode: the few settings that matter most. */
export const SimpleEditor: Story = {
  parameters: fixedExample,
  render: () => ({ props: { theme: teal }, template: `<lc-theme-editor [(theme)]="theme" mode="simple" />` }),
};

/** Editor in advanced mode: every overridable token. */
export const AdvancedEditor: Story = {
  parameters: fixedExample,
  render: () => ({ props: { theme: teal }, template: `<lc-theme-editor [(theme)]="theme" mode="advanced" />` }),
};

/** Contrast report: a compliant theme above, a theme with a too-light primary below. */
export const ContrastReport: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ok: resolveTheme({ extends: 'default', overrides: {} }), weak: resolveTheme({ extends: 'default', overrides: { 'color.primary': '#9ab6d9' } }) },
    template: `<lc-theme-contrast-report [resolved]="ok" /><hr /><lc-theme-contrast-report [resolved]="weak" />`,
  }),
};

/** Preview of the components under the current theme. */
export const ComponentPreview: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-theme-preview />` }),
};
