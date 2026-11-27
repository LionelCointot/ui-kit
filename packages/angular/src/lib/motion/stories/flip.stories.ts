import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample } from '@lc/storybook';
import { LcButtonComponent, LcFlipDirective, LcRevealDirective } from '@lionelcointot/ui-angular';

const TASKS = ['Préparer la réunion', 'Relire le compte rendu', 'Envoyer les invitations', 'Mettre à jour le planning', 'Archiver les pièces', 'Fermer le dossier'];

/** Demo of the `Animation` story: a list sorted, reversed and filtered, then a row added at the top; "Rejouer" reverses the list. */
@Component({
  selector: 'lc-flip-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcFlipDirective, LcRevealDirective, LcButtonComponent, StoryMotionNoticeComponent],
  styles: `
    .lc-demo__bar { display: flex; flex-wrap: wrap; gap: var(--lc-sys-space-2); padding-block-end: var(--lc-sys-space-4); }
    .lc-demo__list { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--lc-sys-space-2); max-inline-size: 22rem; }
    .lc-demo__row { padding: var(--lc-sys-space-3) var(--lc-sys-space-4); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-sunken); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); }
  `,
  template: `
    <lc-story-motion-notice />
    <div class="lc-demo__bar">
      <button lcButton fillMode="outline" size="small" (click)="reverse()">Rejouer</button>
      <button lcButton fillMode="outline" size="small" (click)="sort()">Trier</button>
      <button lcButton fillMode="outline" size="small" (click)="filter()">Filtrer</button>
      <button lcButton fillMode="outline" size="small" (click)="add()">Ajouter en tête</button>
    </div>
    <ul class="lc-demo__list" [lcFlip]="rows()">
      @for (row of rows(); track row) {
        <li class="lc-demo__row" lcReveal>{{ row }}</li>
      }
    </ul>`,
})
class FlipAnimationDemoComponent {
  protected readonly rows = signal<readonly string[]>(TASKS);
  private added = 0;
  protected reverse(): void {
    this.rows.set([...this.rows()].reverse());
  }
  protected sort(): void {
    this.rows.set([...this.rows()].sort((a, b) => a.localeCompare(b)));
  }
  protected filter(): void {
    this.rows.set(this.rows().length > 3 ? this.rows().filter((_, index) => index % 2 === 0) : TASKS);
  }
  protected add(): void {
    this.rows.set([`Nouvelle tâche ${++this.added}`, ...this.rows()]);
  }
}

/**
 * Rows of a list glide to their new place when it is sorted, filtered or reordered.
 * `lcFlip` takes the immutable list that the `@for` loops over (a new array at every change: a list changed in place is not detected) and moves the rows that stay;
 * rows that arrive enter with `lcReveal`, rows that leave play their own exit. Duration and curve are the `--lc-list-move-*` tokens; nothing moves under reduced motion.
 *
 * Import: `import { LcFlipDirective } from '@lionelcointot/ui-angular';`
 */
const meta: Meta = {
  title: 'Layout/Flip',
  decorators: [moduleMetadata({ imports: [FlipAnimationDemoComponent] })],
};
export default meta;
type Story = StoryObj;

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcFlipDirective, LcRevealDirective } from '@lionelcointot/ui-angular';

@Component({
  selector: 'app-example',
  imports: [LcFlipDirective, LcRevealDirective],
  template: \`
    <button (click)="reverse()">Inverser</button>
    <ul [lcFlip]="tasks()">
      @for (task of tasks(); track task) {
        <li lcReveal>{{ task }}</li>
      }
    </ul>\`,
})
export class ExampleComponent {
  protected readonly tasks = signal(['Préparer la réunion', 'Relire le compte rendu', 'Envoyer les invitations']);
  protected reverse(): void {
    this.tasks.set([...this.tasks()].reverse()); // une copie : la liste n'est jamais modifiée en place
  }
}`;

/** A list that is reversed, sorted, filtered and extended: the rows that stay glide to their new place. "Rejouer" reverses the list. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-flip-animation-demo />' }),
};
