import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcFillDirective } from '@lionelcointot/ui-angular';

/** Demo of the `Animation` story: a bar filling from the left and a gauge filling from the bottom; "Rejouer" reinserts them, then changes the value. */
@Component({
  selector: 'lc-fill-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcFillDirective, LcButtonComponent, StoryMotionNoticeComponent],
  styles: `
    .lc-demo__track { inline-size: 22rem; max-inline-size: 100%; block-size: 0.75rem; border-radius: var(--lc-sys-radius-full); background: var(--lc-sys-color-surface-sunken); overflow: hidden; }
    .lc-demo__gauge { inline-size: 1.5rem; block-size: 8rem; border-radius: var(--lc-sys-radius-sm); background: var(--lc-sys-color-surface-sunken); overflow: hidden; margin-block-start: var(--lc-sys-space-4); }
    .lc-demo__fill { inline-size: 100%; block-size: 100%; background: var(--lc-sys-color-primary); }
  `,
  template: `
    <lc-story-motion-notice />
    <section #section>
      <h3>lcFill <button lcButton fillMode="outline" size="small" (click)="fill.replay(section)">Rejouer</button></h3>
      @for (key of fill.keys(); track key) {
        <div class="lc-demo__track"><div class="lc-demo__fill" [lcFill]="value()"></div></div>
        <div class="lc-demo__gauge"><div class="lc-demo__fill" [lcFill]="value()" lcFillAxis="y"></div></div>
      }
    </section>`,
})
class FillAnimationDemoComponent {
  protected readonly value = signal(0.7);
  protected readonly fill = replayable({ reset: () => this.value.set(0.7), play: () => this.value.set(0.3), wait: 1200, destroyRef: inject(DestroyRef) });
}

/**
 * A bar or gauge that fills: `lcFill` takes a value from 0 (empty) to 1 (full), fills from 0 when it appears and follows the value when it changes.
 * `lcFillAxis="y"` fills from the bottom. Size and colour stay yours; duration and curve are `--lc-sys-*` tokens.
 *
 * Import: `import { LcFillDirective } from '@lionelcointot/ui-angular';`
 */
const meta: Meta = {
  title: 'Layout/Fill',
  decorators: [moduleMetadata({ imports: [FillAnimationDemoComponent] })],
};
export default meta;
type Story = StoryObj;

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { LcFillDirective } from '@lionelcointot/ui-angular';

@Component({
  selector: 'app-example',
  imports: [LcFillDirective],
  styles: \`.bar { height: 8px; background: currentColor; }\`,
  template: \`<div class="bar" [lcFill]="0.7"></div>\`,
})
export class ExampleComponent {}`;

/** A bar filling to 70 % then following a new value (30 %), and a gauge filling from the bottom. "Rejouer" reinserts them. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-fill-animation-demo />' }),
};
