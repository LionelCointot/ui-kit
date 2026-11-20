import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcCardComponent, LcCardHeaderComponent, LcGridComponent, LcGridItemComponent } from '@lionelcointot/ui-angular/layout';

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
    imports: [LcCardComponent, LcCardHeaderComponent, LcGridComponent, LcGridItemComponent, LcButtonComponent],
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
