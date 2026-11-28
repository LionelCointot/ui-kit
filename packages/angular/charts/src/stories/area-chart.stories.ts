import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcAreaChartComponent } from '@lionelcointot/ui-angular/charts';
import type { LcCartesianData } from '@lionelcointot/ui-angular/charts';

const months = Array.from({ length: 12 }, (_, index) => `2026-${String(index + 1).padStart(2, '0')}`);
const channels: LcCartesianData = {
  categories: months,
  categoryKind: 'month',
  series: [
    { id: 'web', label: 'Web', values: months.map((_, i) => 6000 + i * 450) },
    { id: 'store', label: 'Magasin', values: months.map((_, i) => 8000 - i * 280) },
    { id: 'partners', label: 'Partenaires', values: months.map(() => 900) },
  ],
};

const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const byRole: LcCartesianData = {
  categories: days,
  series: [
    { id: 'ok', label: 'Réussies', values: [42, 45, 39, 48, 44, 20, 18], colorRole: 'success', stack: 'runs' },
    { id: 'flaky', label: 'Intermittentes', values: [3, 2, 5, 1, 4, 2, 1], colorRole: 'highlight', stack: 'runs' },
    { id: 'slow', label: 'Dégradées', values: [2, 3, 2, 4, 2, 1, 1], colorRole: 'warning', stack: 'runs' },
    { id: 'ko', label: 'En échec', values: [1, 0, 4, 2, 1, 0, 2], colorRole: 'error', stack: 'runs' },
    { id: 'skipped', label: 'Ignorées', values: [2, 2, 1, 1, 3, 4, 4], colorRole: 'neutral', stack: 'runs' },
  ],
};

type AreaChartArgs = LcAreaChartComponent & { hasData: boolean };

/**
 * Stacked area chart (Apache ECharts) for the evolution of several series over ordered categories.
 * The axis always starts at 0. Series can take a semantic colour role (`colorRole`) or a fill pattern (`pattern`) so that meaning never relies on colour alone.
 * ECharts is an optional dependency: provide it with `provideLcCharts()`.
 *
 * Import: `import { LcAreaChartComponent, provideLcCharts } from '@lionelcointot/ui-angular/charts';`
 */
const meta: Meta<AreaChartArgs> = {
  title: 'Charts/Area chart',
  component: LcAreaChartComponent,
  decorators: [moduleMetadata({ imports: [LcAreaChartComponent] })],
  args: {
    title: 'Chiffre d\'affaires par canal',
    titleHidden: false,
    description: 'Par mois, en 2026',
    height: '280px',
    loading: false,
    stale: false,
    emptyMessage: 'Aucune donnée à afficher.',
    showDataTable: false,
    stacked: true,
    directLabels: 'auto',
    hasData: true,
  },
  argTypes: {
    directLabels: { control: 'inline-radio', options: ['auto', 'none'] },
    hasData: { control: 'boolean', description: 'Off: no data, so the empty message shows. Not an input of the component.' },
    data: { control: false }, yAxis: { control: false }, markers: { control: false }, annotations: { control: false },
  },
};
export default meta;
type Story = StoryObj<AreaChartArgs>;

const EMPTY: LcCartesianData = { categories: [], series: [] };

/** Every input is bound: change them in the Controls panel. Data and axis are fixed demo data. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['emptyMessage'] } },
  render: (args) => ({
    props: { ...args, data: args.hasData ? channels : EMPTY, yAxis: { format: 'money' } },
    template: `<lc-area-chart [title]="title" [titleHidden]="titleHidden" [description]="description" [height]="height" [loading]="loading" [stale]="stale"
      [emptyMessage]="emptyMessage" [(showDataTable)]="showDataTable" [stacked]="stacked" [directLabels]="directLabels" [data]="data" [yAxis]="yAxis" />`,
  }),
};

/** Data states: `undefined` shows the skeleton, `null` or no series the empty message, `stale` dims the plot during a reload. The last chart has its data, for comparison. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { channels },
    template: `<div style="display:grid;gap:var(--lc-sys-space-6);grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))">
      <section><h3>Chargement</h3><lc-area-chart title="Chiffre d'affaires par canal" height="180px" [data]="undefined" /></section>
      <section><h3>Vide</h3><lc-area-chart title="Chiffre d'affaires par canal" height="180px" [data]="null" /></section>
      <section><h3>Rechargement</h3><lc-area-chart title="Chiffre d'affaires par canal" height="180px" [data]="channels" [yAxis]="{ format: 'money' }" [stale]="true" /></section>
      <section><h3>Données</h3><lc-area-chart title="Chiffre d'affaires par canal" height="180px" [data]="channels" [yAxis]="{ format: 'money' }" /></section></div>`,
  }),
};

/** A vertical marker on the category axis. */
export const WithMarker: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { data: channels, markers: [{ id: 'mid', categoryIndex: 5, label: 'Mi-année' }] },
    template: `<lc-area-chart title="Chiffre d'affaires par canal" [data]="data" [yAxis]="{ format: 'money' }" [markers]="markers" />`,
  }),
};

/** Colour by role (`colorRole`): theme colour, pattern and icon specific to the role. Role patterns stay active even with `provideLcCharts({ patterns: 'never' })`. */
export const ByRole: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { data: byRole },
    template: `<lc-area-chart title="Volumes par état (aires)" [data]="data" [stacked]="true" />`,
  }),
};
