import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcSheetComponent } from '@lionelcointot/ui-angular/overlay';

type Args = Pick<LcSheetComponent, 'title'> & { closeLabel: string; closeText: string };

/**
 * Bottom sheet on a native modal `<dialog>`: it rises from the bottom, can be pulled down by its handle or header, and never applies anything when closed
 * (close button, gesture, Escape). Above the phone width it becomes a centred card; a click on the backdrop then closes it. Footer actions go in `[lcSheetFooter]`.
 * Limit: a modal `<dialog>` lives in the top layer, so a CDK overlay opened from inside the sheet (calendar, list) can stay hidden below it.
 *
 * Import: `import { LcSheetComponent } from '@lionelcointot/ui-angular/overlay';`
 */
const meta: Meta<Args> = {
  title: 'Overlays/Sheet',
  component: LcSheetComponent,
  decorators: [moduleMetadata({ imports: [LcSheetComponent, LcButtonComponent, StoryMotionNoticeComponent] })],
  args: { title: 'Filtres', closeLabel: 'Fermer sans appliquer', closeText: '' },
  argTypes: {
    closeLabel: { control: 'text', description: 'Accessible name of the close icon button.' },
    closeText: { control: 'text', description: 'Text close button before the title (iOS style, e.g. "Annuler"); replaces the icon. Empty: icon.' },
  },
};
export default meta;
type Story = StoryObj<Args>;

const LINES = Array.from({ length: 12 }, (_, index) => `Ligne ${index + 1} : le corps défile sous l'en-tête et au-dessus du pied.`);

/** Click the button to open the sheet: every control (title, close label) is applied. */
export const Playground: Story = {
  parameters: { controlsCheck: { openWith: 'button' } },
  render: (args) => ({
    props: { ...args, shown: signal(false), lines: LINES },
    template: `
      <button lcButton type="button" (click)="shown.set(true)">Ouvrir la feuille</button>
      <lc-sheet [(open)]="shown" [title]="title" [closeLabel]="closeLabel" [closeText]="closeText || undefined">
        @for (line of lines; track line) {
          <p style="margin:var(--lc-sys-space-3) var(--lc-sys-space-4)">{{ line }}</p>
        }
        <button lcSheetFooter lcButton type="button" fillMode="outline" themeColor="neutral" (click)="shown.set(false)">Annuler</button>
        <button lcSheetFooter lcButton type="button" (click)="shown.set(false)">Enregistrer</button>
      </lc-sheet>`,
  }),
};

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcSheetComponent } from '@lionelcointot/ui-angular/overlay';

@Component({
  selector: 'app-example',
  imports: [LcButtonComponent, LcSheetComponent],
  template: \`
    <button lcButton type="button" (click)="shown.set(true)">Ouvrir la feuille</button>
    <lc-sheet [(open)]="shown" title="Filtres">
      <p>Contenu de la feuille.</p>
      <button lcSheetFooter lcButton type="button" (click)="shown.set(false)">Fermer</button>
    </lc-sheet>
  \`,
})
export class ExampleComponent {
  protected readonly shown = signal(false);
}`;

/** On a phone the sheet rises in 500 ms and goes down in 200 ms, and follows a finger pulling its handle; on a wide screen it is a card that rises and fades. "Rejouer" reopens it. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => {
    const shown = signal(false);
    return {
      props: { shown, ...replayable({ reset: () => shown.set(false), play: () => shown.set(true) }) },
      template: `
        <lc-story-motion-notice />
        <div #root>
          <button lcButton fillMode="outline" size="small" (click)="replay(root)">Rejouer</button>
          @for (key of keys(); track key) {
            <lc-sheet [(open)]="shown" title="Filtres">
              <p style="margin:var(--lc-sys-space-3) var(--lc-sys-space-4)">Tirez la poignée vers le bas pour fermer.</p>
              <button lcSheetFooter lcButton type="button" (click)="shown.set(false)">Fermer</button>
            </lc-sheet>
          }
        </div>`,
    };
  },
};
