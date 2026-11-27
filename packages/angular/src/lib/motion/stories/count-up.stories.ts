import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcCountUpDirective } from '@lionelcointot/ui-angular';

/** Demo of the `Animation` story: a number counting up from 0, then from its old value to a new one, in each format. */
@Component({
  selector: 'lc-count-up-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcCountUpDirective, LcButtonComponent, StoryMotionNoticeComponent],
  styles: `
    .lc-demo__row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--lc-sys-space-6); padding-block: var(--lc-sys-space-4); }
    .lc-demo__value { font-size: var(--lc-sys-font-size-xl); font-variant-numeric: tabular-nums; }
  `,
  template: `
    <lc-story-motion-notice />
    <section #section>
      <h3>lcCountUp
        <button lcButton fillMode="outline" size="small" (click)="demo.replay(section)">Rejouer</button>
        <button lcButton fillMode="outline" size="small" (click)="total.set(total() === 1200 ? 1850 : 1200)">Changer la valeur</button>
      </h3>
      @for (key of demo.keys(); track key) {
        <div class="lc-demo__row">
          <span class="lc-demo__value" data-sample [lcCountUp]="total()"></span>
          <span class="lc-demo__value" [lcCountUp]="total()" lcCountUpFormat="integer"></span>
          <span class="lc-demo__value" [lcCountUp]="12" lcCountUpFormat="percent"></span>
          <span class="lc-demo__value" [lcCountUp]="total()" lcCountUpFormat="money"></span>
        </div>
      }
    </section>`,
})
class CountUpAnimationDemoComponent {
  protected readonly total = signal(1200);
  protected readonly demo = replayable({ reset: () => this.total.set(1200) });
}

/**
 * Writes a number into the element and counts up to it. The final text is in the first render (server included); in the browser it counts from 0 the first time it appears,
 * and from the old value to the new one when the value changes. Formatted like `lc-data-table` (`number`: 2 decimals, `integer`, `percent`, `money`, or a function).
 * Nothing is announced to screen readers while counting; under reduced motion the final value shows at once.
 *
 * Import: `import { LcCountUpDirective } from '@lionelcointot/ui-angular';`
 */
const meta: Meta = {
  title: 'Layout/Count up',
  decorators: [moduleMetadata({ imports: [CountUpAnimationDemoComponent] })],
};
export default meta;
type Story = StoryObj;

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcCountUpDirective } from '@lionelcointot/ui-angular';

@Component({
  selector: 'app-example',
  imports: [LcCountUpDirective],
  template: \`
    <span [lcCountUp]="total()"></span>
    <span [lcCountUp]="total()" lcCountUpFormat="money"></span>\`,
})
export class ExampleComponent {
  protected readonly total = signal(1200);
}`;

/** The number counts from 0 to its value; "Rejouer" counts again from 0, "Changer la valeur" counts from the old value to the new one. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-count-up-animation-demo />' }),
};
