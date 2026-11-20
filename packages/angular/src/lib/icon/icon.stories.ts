import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample, sizeOptions } from '@lc/storybook';
import { LcIconComponent } from './icon.component';
import { LC_DEFAULT_ICONS } from './default-icons';

const ALL_NAMES = Object.keys(LC_DEFAULT_ICONS).sort();

type IconArgs = LcIconComponent & { filter: string };

/**
 * Inline SVG icon (`currentColor`), decorative by default and labelled when `label` is provided.
 * `size="inherit"` follows `--lc-icon-size` (set by buttons, for example) or the text size.
 * Register more icons with `provideLcIcons()`.
 *
 * Import: `import { LcIconComponent, provideLcIcons } from '@lionelcointot/ui-angular';`
 */
const meta: Meta<IconArgs> = {
  title: 'Foundations/Icons',
  component: LcIconComponent,
  decorators: [moduleMetadata({ imports: [LcIconComponent] })],
  args: { name: 'search', size: 'inherit', label: undefined },
  argTypes: {
    name: { control: 'select', options: ALL_NAMES },
    size: { control: 'inline-radio', options: ['inherit', ...sizeOptions] },
    label: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<IconArgs>;

/** Every input is bound: pick a registered icon, a size and an optional accessible label. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="font-size:2rem"><lc-icon [name]="name" [size]="size" [label]="label" /></div>`,
  }),
};

/** All registered icons: type in the `filter` control to narrow the list by name, `size` changes the preview. */
export const Gallery: Story = {
  args: { filter: '', size: 'large' },
  argTypes: { name: { table: { disable: true } }, label: { table: { disable: true } }, filter: { control: 'text' } },
  render: (args) => ({
    props: {
      ...args,
      visible: (filter: string) => ALL_NAMES.filter((name) => name.includes((filter ?? '').trim().toLowerCase())),
    },
    template: `
      <p style="margin:0 0 var(--lc-sys-space-3)">{{ visible(filter).length }} / ${ALL_NAMES.length} icônes</p>
      <ul style="display:flex;flex-wrap:wrap;gap:var(--lc-sys-space-4);margin:0;padding:0;list-style:none">
        @for (name of visible(filter); track name) {
          <li style="display:grid;justify-items:center;gap:var(--lc-sys-space-2);width:120px">
            <lc-icon [name]="name" [size]="size" /><code>{{ name }}</code></li>
        } @empty { <li>Aucune icône ne correspond.</li> }
      </ul>`,
  }),
};

/** The three fixed sizes, and `inherit` following the surrounding text. */
export const Sizes: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-4);align-items:center">
      <lc-icon name="bell" size="small" /><lc-icon name="bell" size="medium" /><lc-icon name="bell" size="large" />
      <span style="font-size:2rem"><lc-icon name="bell" /></span></div>`,
  }),
};

/** With a `label`, the icon becomes an image for assistive technologies; without, it is hidden from them. */
export const AccessibleName: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-4);align-items:center">
      <lc-icon name="circle-alert" size="large" label="Attention" /><lc-icon name="circle-alert" size="large" /></div>`,
  }),
};
