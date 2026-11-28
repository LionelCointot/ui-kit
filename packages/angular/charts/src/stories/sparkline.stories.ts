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

/** Data states: `undefined` shows a skeleton at the sparkline height, `null` a dash, `stale` dims the line during a reload. The last one has its values, for comparison. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { values: VALUES },
    template: `<div style="display:grid;gap:var(--lc-sys-space-6);grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));max-width:48rem">
      <section><h3>Chargement</h3><lc-sparkline ariaLabel="Temps de réponse sur 12 mois" [values]="undefined" /></section>
      <section><h3>Vide</h3><lc-sparkline ariaLabel="Temps de réponse sur 12 mois" [values]="null" /></section>
      <section><h3>Rechargement</h3><lc-sparkline ariaLabel="Temps de réponse sur 12 mois, en baisse" [values]="values" [stale]="true" /></section>
      <section><h3>Valeurs</h3><lc-sparkline ariaLabel="Temps de réponse sur 12 mois, en baisse" [values]="values" /></section></div>`,
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
