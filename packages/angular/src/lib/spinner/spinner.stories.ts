import { ChangeDetectionStrategy, Component } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, commonArgTypes, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcSpinnerComponent } from '@lionelcointot/ui-angular';

/** Demo of the `Animation` story (d42): the ring turns in a loop; "Rejouer" inserts it again. */
@Component({
  selector: 'lc-spinner-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcSpinnerComponent, LcButtonComponent, StoryMotionNoticeComponent],
  template: `
    <lc-story-motion-notice />
    <section #root data-demo="d42">
      <p><button lcButton fillMode="outline" size="small" (click)="demo.replay(root)">Rejouer</button></p>
      @for (key of demo.keys(); track key) {
        <lc-spinner label="Chargement des projets" />
      }
    </section>`,
})
class SpinnerAnimationDemoComponent {
  protected readonly demo = replayable();
}

/**
 * Loading indicator: a decorative ring plus a visually hidden text announced to screen readers (`role="status"`).
 * Defaults to the application size and to the `LC_LABELS.loading` text.
 *
 * Import: `import { LcSpinnerComponent } from '@lionelcointot/ui-angular';`
 */
const meta: Meta<LcSpinnerComponent> = {
  title: 'Feedback/Spinner',
  component: LcSpinnerComponent,
  decorators: [moduleMetadata({ imports: [LcSpinnerComponent, LcButtonComponent, SpinnerAnimationDemoComponent] })],
  args: { size: 'medium', label: 'Chargement des projets' },
  argTypes: { size: commonArgTypes.size },
};
export default meta;
type Story = StoryObj<LcSpinnerComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({ props: args, template: `<lc-spinner [size]="size" [label]="label" />` }),
};

/** `small`, `medium` and `large`. */
export const Sizes: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-4);align-items:center">
      <lc-spinner size="small" /><lc-spinner size="medium" /><lc-spinner size="large" /></div>`,
  }),
};

/** Inline with a text, in a loading panel. */
export const InAPanel: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div aria-busy="true" style="display:flex;gap:var(--lc-sys-space-3);align-items:center">
      <lc-spinner label="Chargement des tâches" /><span aria-hidden="true">Chargement des tâches…</span></div>`,
  }),
};

/** The ring turns at a constant speed in a loop (token-driven); it stops under reduced motion. "Rejouer" inserts it again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: '<lc-spinner label="Chargement des projets" />' } } },
  render: () => ({ template: '<lc-spinner-animation-demo />' }),
};

/** For a button, prefer the `loading` input of `button[lcButton]`, which shows the same ring. */
export const InAButton: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<button lcButton [loading]="true">Enregistrement</button>` }),
};
