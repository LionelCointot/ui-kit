import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample } from '@lc/storybook';
import { LcButtonComponent, LcFlashDirective } from '@lionelcointot/ui-angular';

/** Demo of the `Animation` story: a value whose colour flashes each time it changes. */
@Component({
  selector: 'lc-flash-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcFlashDirective, LcButtonComponent, StoryMotionNoticeComponent],
  styles: `.lc-demo__value { font-size: var(--lc-sys-font-size-xl); font-variant-numeric: tabular-nums; }`,
  template: `
    <lc-story-motion-notice />
    <h3>lcFlash <button lcButton fillMode="outline" size="small" (click)="value.set(value() + 1)">Rejouer</button></h3>
    <p>Stock : <span class="lc-demo__value" [lcFlash]="value()">{{ value() }}</span></p>`,
})
class FlashAnimationDemoComponent {
  protected readonly value = signal(72);
}

/**
 * Flashes the text colour from the accent back to its inherited colour each time the bound value changes (not for the first value, nor for the same value again).
 * A change during a flash restarts it. Nothing plays under reduced motion.
 *
 * Import: `import { LcFlashDirective } from '@lionelcointot/ui-angular';`
 */
const meta: Meta = {
  title: 'Layout/Flash',
  decorators: [moduleMetadata({ imports: [FlashAnimationDemoComponent] })],
};
export default meta;
type Story = StoryObj;

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcFlashDirective } from '@lionelcointot/ui-angular';

@Component({
  selector: 'app-example',
  imports: [LcFlashDirective],
  template: \`<span [lcFlash]="stock()">{{ stock() }}</span>\`,
})
export class ExampleComponent {
  protected readonly stock = signal(72);
}`;

/** "Rejouer" changes the value: the number flashes in the accent colour, then returns to the text colour. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-flash-animation-demo />' }),
};
