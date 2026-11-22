import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes } from '@lc/storybook';
import { LcThemeToggleComponent } from '@lionelcointot/ui-angular';

/**
 * Light / dark / system switch bound to `LcThemeService` (`choice`, `setChoice`): three icon buttons in a group, the current
 * choice exposed by `aria-pressed`. Names come from `LC_LABELS.themeToggle` and also show as the native `title` tooltip.
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
