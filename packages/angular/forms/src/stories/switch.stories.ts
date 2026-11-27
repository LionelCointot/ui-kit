import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcSwitchComponent } from '@lionelcointot/ui-angular/forms';

/** Demo of the `Animation` story (d46): the knob of the first switch slides with a small overshoot while the track changes colour. */
@Component({
  selector: 'lc-switch-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcSwitchComponent, LcButtonComponent, StoryMotionNoticeComponent],
  template: `
    <lc-story-motion-notice />
    <div #root data-demo="d46">
      <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="demo.replay(root)">Rejouer</button>
      @for (key of demo.keys(); track key) {
        <div style="display:grid;gap:var(--lc-sys-space-4);justify-items:start">
          <button lcSwitch [(checked)]="mentions">Mentions</button>
          <button lcSwitch [(checked)]="reminders">Échéances à J−2</button>
        </div>
      }
    </div>`,
})
class SwitchAnimationDemoComponent {
  protected readonly mentions = signal(true);
  protected readonly reminders = signal(false);
  protected readonly demo = replayable({
    destroyRef: inject(DestroyRef),
    reset: () => {
      this.mentions.set(true);
      this.reminders.set(false);
    },
    play: () => {
      this.mentions.set(false);
    },
  });
}

/**
 * On/off switch (`button[lcSwitch]`, `role="switch"`). The value is `checked` (two-way model); Space and Enter toggle it.
 * The label is the content or an `aria-label`. Implements `FormCheckboxControl`, so it binds to a boolean field of Signal Forms.
 *
 * Import: `import { LcSwitchComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcSwitchComponent> = {
  title: 'Forms/Switch',
  component: LcSwitchComponent,
  decorators: [moduleMetadata({ imports: [LcSwitchComponent, SwitchAnimationDemoComponent] })],
  args: { checked: false, disabled: false },
  argTypes: { id: { control: false }, extraDescribedBy: { control: false }, checkedChange: { action: 'checkedChange' } },
};
export default meta;
type Story = StoryObj<LcSwitchComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<button lcSwitch [checked]="checked" [disabled]="disabled">Notifications</button>`,
  }),
};

/** Off, on and disabled switches. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-3);justify-items:start">
        <button lcSwitch>Désactivé</button>
        <button lcSwitch [checked]="true">Activé</button>
        <button lcSwitch [disabled]="true">Indisponible</button>
      </div>`,
  }),
};

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcSwitchComponent } from '@lionelcointot/ui-angular/forms';

@Component({
  selector: 'app-example',
  imports: [LcSwitchComponent],
  template: \`<button lcSwitch [(checked)]="mentions">Mentions</button>\`,
})
export class ExampleComponent {
  protected readonly mentions = signal(true);
}`;

/** The knob slides from one end of the track to the other and settles after a small overshoot; the track colour follows. "Rejouer" shows the starting state again, then toggles both switches. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-switch-animation-demo />' }),
};
