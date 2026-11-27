import { ChangeDetectionStrategy, Component } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcCardComponent, LcCardHeaderComponent, LcGridComponent, LcGridItemComponent } from '@lionelcointot/ui-angular/layout';

/** Demo of the `Animation` story: cards in an `lc-grid`, then in a hand-made grid (a plain `div`), without any attribute. */
@Component({
  selector: 'lc-card-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcCardComponent, LcCardHeaderComponent, LcGridComponent, LcButtonComponent, StoryMotionNoticeComponent],
  styles: `.lc-demo__handmade { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--lc-sys-space-4); }`,
  template: `
    <lc-story-motion-notice />
    <section #root>
      <h3>lc-grid <button lcButton fillMode="outline" size="small" (click)="grid.replay(root)">Rejouer</button></h3>
      @for (key of grid.keys(); track key) {
        <lc-grid [columns]="3" gap="4">
          @for (name of names; track name) {
            <lc-card><lc-card-header [title]="name" subtitle="Mis à jour aujourd'hui" /><p>Trois tâches ouvertes.</p></lc-card>
          }
        </lc-grid>
      }
    </section>
    <section #plain>
      <h3>Plain div <button lcButton fillMode="outline" size="small" (click)="handmade.replay(plain)">Rejouer</button></h3>
      @for (key of handmade.keys(); track key) {
        <div class="lc-demo__handmade">
          @for (name of names; track name) {
            <lc-card><lc-card-header [title]="name" /><p>Rang pris d'après la position.</p></lc-card>
          }
        </div>
      }
    </section>`,
})
class CardAnimationDemoComponent {
  protected readonly names = ['Atlas', 'Boréal', 'Cèdre', 'Delta', 'Embruns', 'Falaise'];
  protected readonly grid = replayable();
  protected readonly handmade = replayable();
}

/**
 * Card: an elevated surface with an optional header (`lc-card-header`: title, subtitle, actions) and footer (`[lcCardFooter]`).
 * With `collapsible`, the header becomes a button that folds the content.
 *
 * Import: `import { LcCardComponent, LcCardHeaderComponent } from '@lionelcointot/ui-angular/layout';`
 */
const meta: Meta<LcCardComponent> = {
  title: 'Layout/Card',
  component: LcCardComponent,
  decorators: [moduleMetadata({
    imports: [LcCardComponent, LcCardHeaderComponent, LcGridComponent, LcGridItemComponent, LcButtonComponent, CardAnimationDemoComponent],
  })],
  args: { elevation: 1, padding: '5', collapsible: false, expanded: true },
  argTypes: {
    elevation: { control: 'inline-radio', options: [0, 1, 2] },
    padding: { control: 'select', options: ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16'] },
  },
};
export default meta;
type Story = StoryObj<LcCardComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['expanded'] } },
  render: (args) => ({
    props: args,
    template: `
      <lc-card style="max-width:24rem" [elevation]="elevation" [padding]="padding" [collapsible]="collapsible" [(expanded)]="expanded">
        <lc-card-header title="Projet Atlas" subtitle="Mis à jour il y a 2 min" />
        <p>Trois tâches restantes avant la prochaine revue.</p>
        <div lcCardFooter><button lcButton type="button" size="small">Ouvrir</button></div>
      </lc-card>`,
  }),
};

/** Header with an actions slot (`lcCardActions`) next to the title. */
export const WithActions: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <lc-card style="max-width:28rem">
        <lc-card-header title="Équipe design" subtitle="5 membres">
          <button lcCardActions lcButton type="button" size="small" fillMode="outline" themeColor="neutral">Inviter</button>
        </lc-card-header>
        <p>Prochaine réunion : jeudi à 10 h.</p>
      </lc-card>`,
  }),
};

/** Collapsible card: the header toggles the content and the footer. */
export const Collapsible: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <lc-card collapsible [expanded]="false" style="max-width:28rem">
        <lc-card-header title="Journal des modifications" subtitle="Cliquez pour déplier" />
        <p>12 modifications cette semaine.</p>
        <div lcCardFooter><button lcButton type="button" size="small" fillMode="flat">Tout voir</button></div>
      </lc-card>`,
  }),
};

/** A grid of cards, one per project. */
export const CardGrid: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { projects: [
      { name: 'Atlas', tasks: 3 }, { name: 'Boréal', tasks: 8 }, { name: 'Cèdre', tasks: 0 },
      { name: 'Delta', tasks: 5 }, { name: 'Embruns', tasks: 1 }, { name: 'Falaise', tasks: 12 },
    ] },
    template: `
      <lc-grid [columns]="{ sm: 1, md: 2, lg: 3 }" gap="4">
        @for (p of projects; track p.name) {
          <lc-grid-item>
            <lc-card>
              <lc-card-header [title]="'Projet ' + p.name" [subtitle]="p.tasks + ' tâche(s) ouverte(s)'" />
              <p>Dernière activité aujourd'hui.</p>
            </lc-card>
          </lc-grid-item>
        }
      </lc-grid>`,
  }),
};

const ANIMATION_CODE = `<!-- Nothing to write: a card enters by itself, one after the other. -->
<lc-grid [columns]="3">
  @for (project of projects; track project.id) {
    <lc-card><lc-card-header [title]="project.name" /></lc-card>
  }
</lc-grid>

<!-- Same in your own grid: the rank follows the position among siblings. -->
<div class="my-grid">
  @for (project of projects; track project.id) {
    <lc-card><lc-card-header [title]="project.name" /></lc-card>
  }
</div>`;

/** Each card rises 26 px with a slight scale in 800 ms, one every 60 ms, with no attribute to write: in an `lc-grid` and in a plain `div`. "Rejouer" shows them again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-card-animation-demo />' }),
};
