import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcTabComponent, LcTabContentDirective, LcTabsComponent } from '@lionelcointot/ui-angular/navigation';

/**
 * Tab list with automatic or manual activation. Panels are declared with `lc-tab`; heavy content goes in an
 * `ng-template[lcTabContent]` so it renders only when its tab is first selected.
 *
 * Import: `import { LcTabsComponent, LcTabComponent, LcTabContentDirective } from '@lionelcointot/ui-angular/navigation';`
 */
const meta: Meta<LcTabsComponent> = {
  title: 'Navigation/Tabs',
  component: LcTabsComponent,
  decorators: [moduleMetadata({ imports: [LcTabsComponent, LcTabComponent, LcTabContentDirective] })],
  argTypes: { activation: { control: 'inline-radio', options: ['automatic', 'manual'] }, selected: { control: 'select', options: [null, 'synthese', 'donnees', 'graphiques'] } },
  args: { ariaLabel: 'Résultats', activation: 'automatic', selected: null },
};
export default meta;
type Story = StoryObj<LcTabsComponent>;

/** Every input is bound: `selected` picks the active tab, `activation` changes how arrow keys behave. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['activation'] } },
  render: (args) => ({
    props: args,
    template: `
      <lc-tabs [ariaLabel]="ariaLabel" [activation]="activation" [selected]="selected">
        <lc-tab id="synthese" label="Synthèse"><p>Synthèse du projet</p></lc-tab>
        <lc-tab id="donnees" label="Données" icon="table"><ng-template lcTabContent><p>Tableau</p></ng-template></lc-tab>
        <lc-tab id="bloque" label="Bloqué" [disabled]="true"><p>Inaccessible</p></lc-tab>
        <lc-tab id="graphiques" label="Graphiques"><ng-template lcTabContent><p>Courbes</p></ng-template></lc-tab>
      </lc-tabs>`,
  }),
};

const MANY = `
  <lc-tab id="apercu" label="Aperçu"><p>Aperçu</p></lc-tab>
  <lc-tab id="runs" label="Exécutions récentes"><p>Exécutions</p></lc-tab>
  <lc-tab id="couverture" label="Couverture"><p>Couverture</p></lc-tab>
  <lc-tab id="anomalies" label="Anomalies ouvertes"><p>Anomalies</p></lc-tab>
  <lc-tab id="historique" label="Historique"><p>Historique</p></lc-tab>
  <lc-tab id="parametres" label="Paramètres"><p>Paramètres</p></lc-tab>`;

/** Many tabs in 360 px: the row scrolls horizontally, labels are not cut, an edge fade hints at hidden tabs and vanishes at the end. */
export const ManyTabs360px: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ariaLabel: 'Résultats', activation: 'automatic' },
    template: `<div style="inline-size:360px;max-inline-size:100%"><lc-tabs [ariaLabel]="ariaLabel" [activation]="activation">${MANY}</lc-tabs></div>`,
  }),
};

/** Active tab initially out of view: the row scrolls it back on screen (also by keyboard, arrows and End). */
export const ManyTabsActiveAtEnd360px: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ariaLabel: 'Résultats', activation: 'automatic' },
    template: `<div style="inline-size:360px;max-inline-size:100%"><lc-tabs [ariaLabel]="ariaLabel" [activation]="activation" selected="parametres">${MANY}</lc-tabs></div>`,
  }),
};
