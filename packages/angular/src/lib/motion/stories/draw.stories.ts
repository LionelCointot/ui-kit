import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcDrawDirective } from '@lionelcointot/ui-angular';

/** Demo of the `Animation` story: a ring and a line drawn from nothing; "Rejouer" reinserts them, then changes the value. */
@Component({
  selector: 'lc-draw-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcDrawDirective, LcButtonComponent, StoryMotionNoticeComponent],
  styles: `
    svg { display: block; color: var(--lc-sys-color-primary); }
    .lc-demo__ring { transform: rotate(-90deg); transform-origin: center; }
  `,
  template: `
    <lc-story-motion-notice />
    <section #section>
      <h3>lcDraw <button lcButton fillMode="outline" size="small" (click)="draw.replay(section)">Rejouer</button></h3>
      @for (key of draw.keys(); track key) {
        <svg width="240" height="80" viewBox="0 0 240 80" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" aria-hidden="true">
          <circle class="lc-demo__ring" [lcDraw]="value()" cx="40" cy="40" r="30" />
          <path [lcDraw]="value()" d="M100 60 C 130 10, 160 10, 220 60" />
        </svg>
      }
    </section>`,
})
class DrawAnimationDemoComponent {
  protected readonly value = signal(0.7);
  protected readonly draw = replayable({ reset: () => this.value.set(0.7), play: () => this.value.set(1), wait: 1200, destroyRef: inject(DestroyRef) });
}

/**
 * A stroke that draws itself: `lcDraw` takes a value from 0 (nothing) to 1 (whole stroke) on a `path`, `circle`, `line` or `polyline` of an SVG,
 * draws it from 0 when it appears and follows the value when it changes. Duration and curve are `--lc-sys-*` tokens.
 *
 * Import: `import { LcDrawDirective } from '@lionelcointot/ui-angular';`
 */
const meta: Meta = {
  title: 'Layout/Draw',
  decorators: [moduleMetadata({ imports: [DrawAnimationDemoComponent] })],
};
export default meta;
type Story = StoryObj;

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { LcDrawDirective } from '@lionelcointot/ui-angular';

@Component({
  selector: 'app-example',
  imports: [LcDrawDirective],
  template: \`
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="6">
      <circle [lcDraw]="0.7" cx="40" cy="40" r="30" />
    </svg>\`,
})
export class ExampleComponent {}`;

/** A ring and a curve drawn to 70 % then completed to 100 %. "Rejouer" reinserts them. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-draw-animation-demo />' }),
};
