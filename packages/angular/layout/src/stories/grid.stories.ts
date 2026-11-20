import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcGridComponent } from '../grid/grid.component';
import { LcGridItemComponent } from '../grid/grid-item.component';

const BOX = 'padding:var(--lc-sys-space-4);background:var(--lc-sys-color-surface-sunken);border:1px solid var(--lc-sys-color-border);border-radius:var(--lc-sys-radius-md)';

/**
 * Column grid driven by the width of its container. `columns` is a number or a number per breakpoint
 * (`{ md: 2, lg: 3 }`); `lc-grid-item` spans several columns with `span`.
 *
 * Import: `import { LcGridComponent, LcGridItemComponent } from '@lionelcointot/ui-angular/layout';`
 */
const meta: Meta<LcGridComponent> = {
  title: 'Layout/Grid',
  component: LcGridComponent,
  decorators: [moduleMetadata({ imports: [LcGridComponent, LcGridItemComponent] })],
  args: { columns: 3, gap: '4' },
  argTypes: {
    columns: { control: { type: 'number', min: 1, max: 6 } },
    gap: { control: 'select', options: ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16'] },
  },
};
export default meta;
type Story = StoryObj<LcGridComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, box: BOX, items: [1, 2, 3, 4, 5, 6] },
    template: `
      <lc-grid [columns]="columns" [gap]="gap">
        @for (n of items; track n) {
          <lc-grid-item><div [style]="box">Élément {{ n }}</div></lc-grid-item>
        }
      </lc-grid>`,
  }),
};

/** Items spanning several columns; a span is capped at the current number of columns. */
export const Spans: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { box: BOX },
    template: `
      <lc-grid [columns]="4" gap="3">
        <lc-grid-item [span]="4"><div [style]="box">En-tête sur 4 colonnes</div></lc-grid-item>
        <lc-grid-item [span]="2"><div [style]="box">2 colonnes</div></lc-grid-item>
        <lc-grid-item><div [style]="box">1</div></lc-grid-item>
        <lc-grid-item><div [style]="box">1</div></lc-grid-item>
        <lc-grid-item [span]="3"><div [style]="box">3 colonnes</div></lc-grid-item>
        <lc-grid-item><div [style]="box">1</div></lc-grid-item>
      </lc-grid>`,
  }),
};

/** Columns per breakpoint of the container: one on narrow widths, two from `md`, three from `lg`. */
export const Responsive: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { box: BOX, columns: { sm: 1, md: 2, lg: 3 }, items: [1, 2, 3, 4, 5, 6] },
    template: `
      <lc-grid [columns]="columns" gap="4">
        @for (n of items; track n) {
          <lc-grid-item><div [style]="box">Carte {{ n }}</div></lc-grid-item>
        }
      </lc-grid>`,
  }),
};
