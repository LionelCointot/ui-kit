import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { fixedExample } from '@lc/storybook';
import { LcEmptyStateComponent } from '@lionelcointot/ui-angular/feedback';

/**
 * Empty state: optional icon, title, description and actions (`[lcEmptyActions]` slot).
 * Use it when a list, a search or a screen has nothing to show yet.
 *
 * Import: `import { LcEmptyStateComponent } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<LcEmptyStateComponent> = {
  title: 'Feedback/Empty state',
  component: LcEmptyStateComponent,
  decorators: [moduleMetadata({ imports: [LcEmptyStateComponent, LcButtonComponent, LcIconComponent] })],
  args: { icon: 'inbox', title: 'Aucun projet', description: 'Créez votre premier projet pour commencer.' },
  argTypes: { icon: { control: 'text' } },
};
export default meta;
type Story = StoryObj<LcEmptyStateComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-empty-state [icon]="icon" [title]="title" [description]="description">
      <button lcEmptyActions lcButton><lc-icon name="plus" /> Nouveau projet</button></lc-empty-state>`,
  }),
};

/** An empty list with a primary and a secondary action. */
export const WithActions: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<lc-empty-state icon="folder-open" title="Aucun document" description="Importez un fichier ou créez un document vide.">
      <div lcEmptyActions style="display:flex;gap:var(--lc-sys-space-2)">
        <button lcButton><lc-icon name="upload" /> Importer</button>
        <button lcButton fillMode="outline" themeColor="neutral">Créer un document vide</button></div></lc-empty-state>`,
  }),
};

/** Search without result: the action clears the filters. */
export const NoSearchResult: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<lc-empty-state icon="search-x" title="Aucun résultat" description="Aucune ville ne correspond à « Xyz ».">
      <button lcEmptyActions lcButton fillMode="outline" themeColor="neutral"><lc-icon name="funnel-x" /> Effacer les filtres</button></lc-empty-state>`,
  }),
};

/** Minimal: a title only, no icon, description or action. */
export const TitleOnly: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-empty-state title="Rien à afficher pour le moment" />` }),
};
