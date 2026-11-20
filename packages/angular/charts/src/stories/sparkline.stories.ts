import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcSparklineComponent } from '@lionelcointot/ui-angular/charts';

const VALUES = [10, 9.6, 9.2, 8.7, 8.5, 8, 7.4, 7, 6.5, 6, 5.2, 4.9];

/**
 * Tiny trend line without axes or legend, sized to sit in a card or a table cell.
 * `ariaLabel` is required: it states the trend in words, because the drawing alone carries no text. `null` values leave gaps.
 *
 * Import: `import { LcSparklineComponent } from '@lionelcointot/ui-angular/charts';`
 */
const meta: Meta<LcSparklineComponent> = {
  title: 'Charts/Sparkline',
  component: LcSparklineComponent,
  decorators: [moduleMetadata({ imports: [LcSparklineComponent] })],
  args: { ariaLabel: 'Temps de réponse sur 12 mois, en baisse', height: '32px', showEndPoint: true },
  argTypes: { values: { control: false } },
};
export default meta;
type Story = StoryObj<LcSparklineComponent>;

/** Every input is bound: change them in the Controls panel. The values are fixed demo data. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, values: VALUES },
    template: `<div style="width:160px"><lc-sparkline [ariaLabel]="ariaLabel" [values]="values" [height]="height" [showEndPoint]="showEndPoint" /></div>`,
  }),
};
