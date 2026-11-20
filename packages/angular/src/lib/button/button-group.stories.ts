import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcButtonGroupComponent, LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';

/**
 * Group of buttons (`role="group"`) with a required accessible name; with `attached`, the borders are joined.
 * Place `button[lcButton]` elements directly inside.
 *
 * Import: `import { LcButtonGroupComponent } from '@lionelcointot/ui-angular';`
 */
const meta: Meta<LcButtonGroupComponent> = {
  title: 'Buttons/Button group',
  component: LcButtonGroupComponent,
  decorators: [moduleMetadata({ imports: [LcButtonGroupComponent, LcButtonComponent, LcIconComponent] })],
  args: { ariaLabel: 'Affichage', attached: true },
};
export default meta;
type Story = StoryObj<LcButtonGroupComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-button-group [ariaLabel]="ariaLabel" [attached]="attached">
      <button lcButton fillMode="outline" themeColor="neutral">Liste</button>
      <button lcButton fillMode="outline" themeColor="neutral">Grille</button>
      <button lcButton fillMode="outline" themeColor="neutral">Tableau</button></lc-button-group>`,
  }),
};

/** Separate and attached groups of the same buttons. */
export const AttachedOrNot: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);justify-items:start">
      <lc-button-group ariaLabel="Groupe séparé">
        <button lcButton fillMode="outline">Jour</button><button lcButton fillMode="outline">Semaine</button><button lcButton fillMode="outline">Mois</button></lc-button-group>
      <lc-button-group ariaLabel="Groupe joint" [attached]="true">
        <button lcButton fillMode="outline">Jour</button><button lcButton fillMode="outline">Semaine</button><button lcButton fillMode="outline">Mois</button></lc-button-group></div>`,
  }),
};

/** Toggle buttons with `[pressed]`: the selected one is marked and exposes `aria-pressed`. */
export const WithPressedState: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { view: 'list' },
    template: `<lc-button-group ariaLabel="Mode d'affichage" [attached]="true">
      <button lcButton fillMode="outline" themeColor="neutral" [pressed]="view === 'list'" (click)="view = 'list'">Liste</button>
      <button lcButton fillMode="outline" themeColor="neutral" [pressed]="view === 'grid'" (click)="view = 'grid'">Grille</button></lc-button-group>`,
  }),
};

/** Icon-only buttons, each with its own accessible name. */
export const IconOnly: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<lc-button-group ariaLabel="Mise en forme" [attached]="true">
      <button lcButton iconOnly fillMode="outline" themeColor="neutral" aria-label="Copier"><lc-icon name="copy" /></button>
      <button lcButton iconOnly fillMode="outline" themeColor="neutral" aria-label="Modifier"><lc-icon name="pencil" /></button>
      <button lcButton iconOnly fillMode="outline" themeColor="neutral" aria-label="Supprimer"><lc-icon name="trash-2" /></button></lc-button-group>`,
  }),
};
