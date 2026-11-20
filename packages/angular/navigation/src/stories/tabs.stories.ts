import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcTabComponent, LcTabContentDirective } from '../tabs/tab.component';
import { LcTabsComponent } from '../tabs/tabs.component';

const meta: Meta<LcTabsComponent> = {
  title: 'Navigation/Tabs',
  component: LcTabsComponent,
  decorators: [moduleMetadata({ imports: [LcTabsComponent, LcTabComponent, LcTabContentDirective] })],
  argTypes: { activation: { control: 'inline-radio', options: ['automatic', 'manual'] } },
  args: { ariaLabel: 'Résultats', activation: 'automatic' },
  render: (args) => ({
    props: args,
    template: `
      <lc-tabs [ariaLabel]="ariaLabel" [activation]="activation">
        <lc-tab id="synthese" label="Synthèse"><p>Synthèse du prêt</p></lc-tab>
        <lc-tab id="echeances" label="Échéances" icon="table"><ng-template lcTabContent><p>Tableau</p></ng-template></lc-tab>
        <lc-tab id="bloque" label="Bloqué" [disabled]="true"><p>Inaccessible</p></lc-tab>
        <lc-tab id="graphiques" label="Graphiques"><ng-template lcTabContent><p>Courbes</p></ng-template></lc-tab>
      </lc-tabs>`,
  }),
};
export default meta;
type Story = StoryObj<LcTabsComponent>;

export const Defaut: Story = {};

const MANY = `
  <lc-tab id="apercu" label="Aperçu"><p>Aperçu</p></lc-tab>
  <lc-tab id="runs" label="Exécutions récentes"><p>Exécutions</p></lc-tab>
  <lc-tab id="couverture" label="Couverture"><p>Couverture</p></lc-tab>
  <lc-tab id="anomalies" label="Anomalies ouvertes"><p>Anomalies</p></lc-tab>
  <lc-tab id="historique" label="Historique"><p>Historique</p></lc-tab>
  <lc-tab id="parametres" label="Paramètres"><p>Paramètres</p></lc-tab>`;

/**
 * Nombreux onglets dans 360 px : la rangée défile horizontalement, les libellés ne sont pas coupés,
 * un fondu de bord signale les onglets cachés et disparaît en bout de course. La page ne défile pas.
 */
export const NombreuxOnglets360px: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="inline-size:360px;max-inline-size:100%"><lc-tabs [ariaLabel]="ariaLabel" [activation]="activation">${MANY}</lc-tabs></div>`,
  }),
};

/** Onglet actif hors de la zone visible au départ : la rangée le ramène à l'écran (au clavier aussi, flèches et Fin). */
export const NombreuxOnglets360pxActifALaFin: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="inline-size:360px;max-inline-size:100%"><lc-tabs [ariaLabel]="ariaLabel" [activation]="activation" selected="parametres">${MANY}</lc-tabs></div>`,
  }),
};
