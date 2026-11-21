import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcRevealDirective } from '@lionelcointot/ui-angular';

/**
 * Fade-in and 8 px descent when the element is inserted, delayed by `lcRevealIndex` steps (80 ms each, capped at 8) to cascade a list.
 * It plays on insertion only, not on scroll. With `prefers-reduced-motion: reduce` the element appears at once.
 * Duration, curve, distance and step: `--lc-reveal-*` tokens.
 *
 * Import: `import { LcRevealDirective } from '@lionelcointot/ui-angular';`
 */
const meta: Meta<LcRevealDirective> = {
  title: 'Layout/Reveal',
  component: LcRevealDirective,
  decorators: [moduleMetadata({ imports: [LcRevealDirective, LcButtonComponent, StoryMotionNoticeComponent] })],
  args: { lcRevealIndex: 0 },
  argTypes: { lcRevealIndex: { control: { type: 'number', min: 0, max: 12 } } },
};
export default meta;
type Story = StoryObj<LcRevealDirective>;

/** `lcRevealIndex` sets the rank of the block, hence its delay. It plays on insertion only: see the `Animation` story to replay it. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<div lcReveal [lcRevealIndex]="lcRevealIndex" style="max-width:24rem;padding:var(--lc-sys-space-3) var(--lc-sys-space-4);border:var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border);border-radius:var(--lc-sys-radius-md)">Bloc de rang {{ lcRevealIndex }}</div>`,
  }),
};

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { LcRevealDirective } from '@lionelcointot/ui-angular';

@Component({
  selector: 'app-example',
  imports: [LcRevealDirective],
  template: \`
    <ul>
      @for (item of items; track item; let i = $index) {
        <li lcReveal [lcRevealIndex]="i">{{ item }}</li>
      }
    </ul>\`,
})
export class ExampleComponent {
  readonly items = ['Projet', 'Tâches', 'Équipe', 'Fichiers'];
}`;

/** A cascade of nine rows: each one starts 80 ms after the previous, the ninth shares the delay of the eighth. "Rejouer" inserts them again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({
    props: { rows: [0, 1, 2, 3, 4, 5, 6, 7, 8], ...replayable() },
    template: `
      <lc-story-motion-notice />
      <div #root style="max-width:24rem">
        <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="replay(root)">Rejouer</button>
        <div style="display:grid;gap:var(--lc-sys-space-2)">
          @for (key of keys(); track key) {
            @for (row of rows; track row) {
              <div lcReveal [lcRevealIndex]="row" style="padding:var(--lc-sys-space-3) var(--lc-sys-space-4);border:var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border);border-radius:var(--lc-sys-radius-md)">Ligne {{ row + 1 }}</div>
            }
          }
        </div>
      </div>`,
  }),
};
