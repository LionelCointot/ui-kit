import { ChangeDetectionStrategy, Component } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcRevealDirective, LcStaggerDirective } from '@lionelcointot/ui-angular';

const VARIANTS = ['rise', 'drop', 'fade', 'scale', 'pop', 'left', 'right'] as const;
const ROWS = ['Préparer la réunion', 'Relire le compte rendu', 'Envoyer les invitations', 'Mettre à jour le planning', 'Archiver les pièces', 'Fermer le dossier'];

/** Demo of the `Animation` story: each variant of `lcReveal`, then a list in cascade under `lcStagger`. */
@Component({
  selector: 'lc-reveal-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcRevealDirective, LcStaggerDirective, LcButtonComponent, StoryMotionNoticeComponent],
  styles: `
    .lc-demo__row { display: flex; flex-wrap: wrap; gap: var(--lc-sys-space-3); padding-block: var(--lc-sys-space-4); }
    .lc-demo__box { padding: var(--lc-sys-space-3) var(--lc-sys-space-4); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-sunken); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); }
    .lc-demo__list { margin: 0; padding: var(--lc-sys-space-4) 0; list-style: none; display: grid; gap: var(--lc-sys-space-2); max-inline-size: 22rem; }
  `,
  template: `
    <lc-story-motion-notice />
    <section #reveal>
      <h3>lcReveal <button lcButton fillMode="outline" size="small" (click)="variants.replay(reveal)">Rejouer</button></h3>
      @for (key of variants.keys(); track key) {
        <div class="lc-demo__row">
          @for (variant of variantNames; track variant) {
            <div class="lc-demo__box" [lcReveal]="variant">{{ variant }}</div>
          }
        </div>
      }
    </section>
    <section #stagger>
      <h3>lcStagger <button lcButton fillMode="outline" size="small" (click)="cascade.replay(stagger)">Rejouer</button></h3>
      @for (key of cascade.keys(); track key) {
        <ul class="lc-demo__list" lcStagger>
          @for (row of rows; track row) {
            <li class="lc-demo__box" lcReveal>{{ row }}</li>
          }
        </ul>
      }
    </section>`,
})
class RevealAnimationDemoComponent {
  protected readonly variantNames = VARIANTS;
  protected readonly rows = ROWS;
  protected readonly variants = replayable();
  protected readonly cascade = replayable();
}

/**
 * Entrance and exit of an element created by `@if` or `@for`, and cascades of such elements.
 * `lcReveal` fades the element in from a start point (`rise`, `drop`, `fade`, `scale`, `pop`, `left`, `right`, `tilt`) and plays its exit before it leaves the page;
 * duration, curve, distance and delay are `--lc-sys-*` tokens. `lcStagger` (`fine`, `normal`, `cards`) delays each element of the batch by its rank, up to a cap.
 *
 * Import: `import { LcRevealDirective, LcStaggerDirective } from '@lionelcointot/ui-angular';`
 */
const meta: Meta = {
  title: 'Layout/Reveal',
  decorators: [moduleMetadata({ imports: [RevealAnimationDemoComponent] })],
};
export default meta;
type Story = StoryObj;

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { LcRevealDirective, LcStaggerDirective } from '@lionelcointot/ui-angular';

@Component({
  selector: 'app-example',
  imports: [LcRevealDirective, LcStaggerDirective],
  template: \`
    <div lcReveal="pop">Variant</div>

    <ul lcStagger="normal">
      @for (task of tasks; track task) {
        <li lcReveal>{{ task }}</li>
      }
    </ul>\`,
})
export class ExampleComponent {
  protected readonly tasks = ['Préparer la réunion', 'Relire le compte rendu', 'Envoyer les invitations'];
}`;

/** The variants of `lcReveal`, then a list entering in cascade under `lcStagger`. "Rejouer" reinserts the demo it sits next to. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-reveal-animation-demo />' }),
};
