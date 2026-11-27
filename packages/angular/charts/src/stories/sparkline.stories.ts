import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
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
  decorators: [moduleMetadata({ imports: [LcSparklineComponent, LcButtonComponent, StoryMotionNoticeComponent] })],
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

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { LcSparklineComponent } from '@lionelcointot/ui-angular/charts';

@Component({
  selector: 'app-example',
  imports: [LcSparklineComponent],
  template: \`<lc-sparkline ariaLabel="Temps de réponse sur 12 mois, en baisse" [values]="values" />\`,
})
export class ExampleComponent {
  readonly values = [10, 9.6, 9.2, 8.7, 8.5, 8, 7.4, 7, 6.5, 6, 5.2, 4.9];
}`;

/** The line draws itself in from the left (duration and curve come from the chart tokens). "Rejouer" mounts it again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({
    props: { values: VALUES, ...replayable() },
    template: `
      <lc-story-motion-notice />
      <div data-demo="d19" #root>
        <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="replay(root)">Rejouer</button>
        @for (key of keys(); track key) {
          <div data-sample style="width:240px"><lc-sparkline ariaLabel="Temps de réponse sur 12 mois, en baisse" [values]="values" height="48px" /></div>
        }
      </div>`,
  }),
};
