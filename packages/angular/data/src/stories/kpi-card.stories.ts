import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcDescriptionListComponent, LcKpiCardComponent, type LcKpiDelta } from '@lionelcointot/ui-angular/data';

type KpiArgs = LcKpiCardComponent & { hasDelta: boolean };

const DELTA: LcKpiDelta = { value: 4.2, format: 'percent', trend: 'up', sentiment: 'positive' };

/**
 * Indicator card: label, main value (proportional digits), variation (trend icon, sign and text: never colour alone) and a hint.
 * The value is formatted by `format`, or replaced by free text (`valueText`) for results that are not a number.
 * Loading shows a skeleton; `stale` dims the value during a recalculation. The `[lcKpiVisual]` slot accepts a small visual such as a sparkline.
 *
 * Import: `import { LcKpiCardComponent } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<KpiArgs> = {
  title: 'Data/KPI card',
  component: LcKpiCardComponent,
  decorators: [moduleMetadata({ imports: [LcKpiCardComponent, LcDescriptionListComponent] })],
  args: { label: 'Commandes du jour', value: 1248, format: 'number', valueText: null, hint: 'Depuis minuit', loading: false, stale: false, hasDelta: true },
  argTypes: {
    format: { control: 'select', options: ['number', 'integer', 'money', 'percent', 'date', 'month', 'text'] },
    value: { control: 'number' },
    valueText: { control: 'text', description: 'Free text shown in place of the formatted value (empty: the value is formatted).' },
    hasDelta: { control: 'boolean', description: 'Shows a sample variation. Not an input of the component: `delta` is an object.' },
    delta: { control: false },
  },
};
export default meta;
type Story = StoryObj<KpiArgs>;

/** Every input is bound: change them in the Controls panel. The variation is a fixed sample. */
export const Playground: Story = {
  render: ({ hasDelta, ...args }) => ({
    props: { ...args, delta: hasDelta ? DELTA : undefined },
    template: `<div style="max-width:20rem"><lc-kpi-card [label]="label" [value]="value" [format]="format" [valueText]="valueText || null"
      [hint]="hint" [loading]="loading" [stale]="stale" [delta]="delta" /></div>`,
  }),
};

/** The same value with the numeric formats. */
export const Formats: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));max-width:48rem">
      <lc-kpi-card label="Nombre" [value]="1248.5" format="number" />
      <lc-kpi-card label="Entier" [value]="1248" format="integer" />
      <lc-kpi-card label="Montant" [value]="1248.5" format="money" />
      <lc-kpi-card label="Pourcentage" [value]="62.5" format="percent" /></div>`,
  }),
};

/** Variation: trend (`up`, `down`, `flat`) and sentiment (`positive`, `negative`, `neutral`) are independent; the icon and the sign carry the meaning. */
export const Deltas: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));max-width:48rem">
      <lc-kpi-card label="Commandes" [value]="1248" [delta]="{ value: 4.2, format: 'percent', trend: 'up', sentiment: 'positive' }" />
      <lc-kpi-card label="Temps de réponse (ms)" [value]="182" [delta]="{ value: -2.5, format: 'percent', trend: 'down', sentiment: 'positive' }" />
      <lc-kpi-card label="Retours" [value]="37" [delta]="{ value: 12, format: 'integer', trend: 'up', sentiment: 'negative' }" />
      <lc-kpi-card label="Stock" [value]="560" [delta]="{ value: 0, format: 'integer', trend: 'flat', sentiment: 'neutral' }" /></div>`,
  }),
};

/** Free text in place of the number (`valueText`); it also names the card for assistive technologies. */
export const FreeText: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);max-width:24rem">
      <lc-kpi-card label="Prochaine échéance de livraison" valueText="7 jours et 4 heures" hint="Dès la validation de la commande" />
      <lc-kpi-card label="Incidents ouverts" valueText="Aucun" /></div>`,
  }),
};

/** Loading (skeleton) and stale (dimmed value during a recalculation). */
export const LoadingAndStale: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));max-width:40rem">
      <lc-kpi-card label="Chargement" [loading]="true" />
      <lc-kpi-card label="Recalcul en cours" [value]="1248" [stale]="true" /></div>`,
  }),
};

/** Cards and a description list side by side, as in a summary panel. */
export const WithDescriptionList: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);max-width:30rem">
      <lc-kpi-card label="Temps de réponse moyen" [value]="182" format="integer" hint="Indicatif"
        [delta]="{ value: -2.5, format: 'percent', trend: 'down', sentiment: 'positive' }" />
      <lc-kpi-card label="Prochaine sauvegarde" valueText="Dans 3 heures" hint="Planifiée chaque nuit" />
      <lc-description-list [items]="[
        { term: 'Budget', value: 250000, format: 'money' },
        { term: 'Avancement', value: 62.5, format: 'percent', badge: 'estimation' },
        { term: 'Total engagé', value: 300000, format: 'money', emphasis: true }]" /></div>`,
  }),
};
