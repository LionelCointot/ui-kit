import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes } from '@lc/storybook';
import { LcThemeToggleComponent } from '@lionelcointot/ui-angular';

/**
 * Single icon button bound to `LcThemeService` (`choice`, `setChoice`) that cycles light, dark, system. The icon shows the
 * current choice (sun, moon, sun-moon for system). Its accessible name states the current choice and the action
 * (`LC_LABELS.themeToggle`) and is also the native `title` tooltip; no `aria-pressed`.
 *
 * Import: `import { LcThemeToggleComponent } from '@lionelcointot/ui-angular';`
 */
const meta: Meta<LcThemeToggleComponent> = {
  title: 'Buttons/Theme toggle',
  component: LcThemeToggleComponent,
  decorators: [moduleMetadata({ imports: [LcThemeToggleComponent] })],
  args: { size: 'medium', fillMode: 'outline' },
  argTypes: { size: commonArgTypes.size, fillMode: commonArgTypes.fillMode },
};
export default meta;
type Story = StoryObj<LcThemeToggleComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({ props: args, template: `<lc-theme-toggle [size]="size" [fillMode]="fillMode" />` }),
};
