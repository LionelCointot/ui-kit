import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, commonArgTypes, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcThemeToggleComponent } from '@lionelcointot/ui-angular';

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
  decorators: [moduleMetadata({ imports: [LcThemeToggleComponent, LcButtonComponent, StoryMotionNoticeComponent] })],
  args: { size: 'medium', fillMode: 'outline' },
  argTypes: { size: commonArgTypes.size, fillMode: commonArgTypes.fillMode },
};
export default meta;
type Story = StoryObj<LcThemeToggleComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({ props: args, template: `<lc-theme-toggle [size]="size" [fillMode]="fillMode" />` }),
};

const ANIMATION_CODE = `<lc-theme-toggle />`;

/** The new theme spreads as a circle from the button, to the farthest corner (View Transitions; instant without the API or under reduced motion). "Rejouer" clicks the toggle again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({
    props: { ...replayable({ wait: 0, play: (_later, root) => root.querySelector<HTMLElement>('lc-theme-toggle button')?.click() }) },
    template: `
      <lc-story-motion-notice />
      <div #root data-demo="d37">
        <button lcButton fillMode="outline" size="small" style="margin-inline-end:var(--lc-sys-space-4)" (click)="replay(root)">Rejouer</button>
        <lc-theme-toggle />
      </div>`,
  }),
};
