import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcCardComponent, LcCardHeaderComponent, LcGridComponent, LcGridItemComponent, LcPageComponent } from '@lionelcointot/ui-angular/layout';

/**
 * Page layout: `<h1>` title, description, actions (`[lcPageActions]`), toolbar (`[lcPageToolbar]`) and content.
 *
 * Import: `import { LcPageComponent } from '@lionelcointot/ui-angular/layout';`
 */
const meta: Meta<LcPageComponent> = {
  title: 'Layout/Page',
  component: LcPageComponent,
  decorators: [moduleMetadata({
    imports: [LcPageComponent, LcButtonComponent, LcCardComponent, LcCardHeaderComponent, LcGridComponent, LcGridItemComponent],
  })],
  args: { title: 'Projets', description: 'Tous les projets de votre équipe.' },
  argTypes: { title: { control: 'text' }, description: { control: 'text' } },
};
export default meta;
type Story = StoryObj<LcPageComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `
      <lc-page [title]="title" [description]="description">
        <button lcPageActions lcButton type="button">Nouveau projet</button>
        <p>Contenu de la page.</p>
      </lc-page>`,
  }),
};

/** Header actions, a toolbar slot and a card grid as content. */
export const WithActionsAndToolbar: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { projects: ['Atlas', 'Boréal', 'Cèdre'] },
    template: `
      <lc-page title="Projets" description="Tous les projets de votre équipe.">
        <button lcPageActions lcButton type="button" fillMode="outline" themeColor="neutral">Exporter</button>
        <button lcPageActions lcButton type="button">Nouveau projet</button>
        <div lcPageToolbar style="display:flex;gap:var(--lc-sys-space-2)">
          <button lcButton type="button" size="small" fillMode="flat" themeColor="neutral">Tous</button>
          <button lcButton type="button" size="small" fillMode="flat" themeColor="neutral">Actifs</button>
          <button lcButton type="button" size="small" fillMode="flat" themeColor="neutral">Archivés</button>
        </div>
        <lc-grid [columns]="{ sm: 1, md: 3 }" gap="4">
          @for (p of projects; track p) {
            <lc-grid-item><lc-card><lc-card-header [title]="'Projet ' + p" /><p>Dernière activité aujourd'hui.</p></lc-card></lc-grid-item>
          }
        </lc-grid>
      </lc-page>`,
  }),
};

/** Title only: no description, actions or toolbar. */
export const TitleOnly: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-page title="Paramètres"><p>Contenu de la page.</p></lc-page>` }),
};
