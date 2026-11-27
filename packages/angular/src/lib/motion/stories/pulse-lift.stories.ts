import { ChangeDetectionStrategy, Component } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';

/** Demo of the `Animation` story: the live dot pulsing, and cards lifting under a fine pointer; "Rejouer" reinserts them. */
@Component({
  selector: 'lc-pulse-lift-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcButtonComponent, StoryMotionNoticeComponent],
  styles: `
    .lc-demo__row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--lc-sys-space-4); padding-block: var(--lc-sys-space-4); }
    .lc-demo__dot { inline-size: 0.75rem; block-size: 0.75rem; border-radius: var(--lc-sys-radius-full); background: var(--lc-sys-color-primary); }
    .lc-demo__card { padding: var(--lc-sys-space-4) var(--lc-sys-space-5); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-sunken); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); }
  `,
  template: `
    <lc-story-motion-notice />
    <section #section>
      <h3>lc-pulse, lc-lift <button lcButton fillMode="outline" size="small" (click)="demo.replay(section)">Rejouer</button></h3>
      @for (key of demo.keys(); track key) {
        <div class="lc-demo__row">
          <span class="lc-demo__dot lc-pulse" aria-hidden="true"></span> En direct
        </div>
        <div class="lc-demo__row">
          <div class="lc-demo__card lc-lift">Survolez-moi</div>
          <div class="lc-demo__card lc-lift">Moi aussi</div>
        </div>
      }
    </section>`,
})
class PulseLiftAnimationDemoComponent {
  protected readonly demo = replayable();
}

/**
 * Two CSS classes, no directive: `lc-pulse` makes a "live" dot breathe (decorative, never the only carrier of information, still under reduced motion);
 * `lc-lift` raises an element a few pixels under a fine pointer (mouse), nothing on touch screens. Durations, curves and distances are `--lc-live-*` and `--lc-lift-*` tokens.
 */
const meta: Meta = {
  title: 'Layout/Pulse lift',
  decorators: [moduleMetadata({ imports: [PulseLiftAnimationDemoComponent] })],
};
export default meta;
type Story = StoryObj;

const ANIMATION_CODE = `import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  template: \`
    <span class="lc-pulse" aria-hidden="true"></span> En direct
    <div class="lc-lift">Carte</div>\`,
})
export class ExampleComponent {}`;

/** A pulsing live dot and two cards that lift on hover. "Rejouer" reinserts them. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-pulse-lift-animation-demo />' }),
};
