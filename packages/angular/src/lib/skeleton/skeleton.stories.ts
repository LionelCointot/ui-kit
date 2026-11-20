import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcSkeletonComponent } from './skeleton.component';
import { LcSpinnerComponent } from '../spinner/spinner.component';

/**
 * Loading placeholder (decorative, `aria-hidden`): a `text` block of one or more lines, a `rect` or a `circle`.
 * The parent announces the loading (for example `aria-busy` or an `lc-spinner`).
 *
 * Import: `import { LcSkeletonComponent } from '@lionelcointot/ui-angular';`
 */
const meta: Meta<LcSkeletonComponent> = {
  title: 'Feedback/Skeleton',
  component: LcSkeletonComponent,
  decorators: [moduleMetadata({ imports: [LcSkeletonComponent, LcSpinnerComponent] })],
  args: { shape: 'text', lines: 3, width: '20rem', height: '6rem' },
  argTypes: {
    shape: { control: 'inline-radio', options: ['text', 'rect', 'circle'] },
    lines: { control: { type: 'number', min: 1, max: 8 }, description: 'Number of lines (`text` shape only).' },
    width: { control: 'text', description: "CSS width, e.g. '12rem' or '60%'." },
    height: { control: 'text', description: 'CSS height (`rect` and `circle` shapes).' },
  },
};
export default meta;
type Story = StoryObj<LcSkeletonComponent>;

/** Every input is bound: change them in the Controls panel (`height` applies to `rect` and `circle`, `lines` to `text`). */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-skeleton [shape]="shape" [lines]="lines" [width]="width" [height]="height" />`,
  }),
};

/** The three shapes. */
export const Shapes: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-4);align-items:center">
      <lc-skeleton shape="text" width="12rem" /><lc-skeleton shape="rect" width="8rem" height="4rem" /><lc-skeleton shape="circle" width="4rem" height="4rem" /></div>`,
  }),
};

/** A text block of four lines: the last one is shorter. */
export const Paragraph: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-skeleton shape="text" [lines]="4" width="24rem" />` }),
};

/** Composition: the placeholder of a profile card while it loads. */
export const CardPlaceholder: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div aria-busy="true" style="display:flex;gap:var(--lc-sys-space-3);align-items:center;max-width:24rem">
      <lc-skeleton shape="circle" width="3rem" height="3rem" />
      <div style="flex:1"><lc-skeleton shape="text" [lines]="2" width="100%" /></div></div>`,
  }),
};
