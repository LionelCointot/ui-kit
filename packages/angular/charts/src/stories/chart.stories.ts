import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcChartComponent } from '@lionelcointot/ui-angular/charts';
import type { LcChartTable } from '@lionelcointot/ui-angular/charts';

const months = ['Jan.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin'];
const tickets = [182, 205, 196, 240, 228, 251];
const resolution = [4.2, 3.8, 3.9, 3.1, 3.3, 2.9];

/** Barres (volume) et courbe (délai) sur deux axes : une combinaison que les graphiques spécialisés ne proposent pas. */
const mixed = {
  tooltip: { trigger: 'axis' },
  legend: { top: 0 },
  grid: { left: 48, right: 48, top: 40, bottom: 32 },
  xAxis: { type: 'category', data: months },
  yAxis: [
    { type: 'value', name: 'Demandes' },
    { type: 'value', name: 'Jours', splitLine: { show: false } },
  ],
  series: [
    { name: 'Demandes reçues', type: 'bar', data: tickets },
    { name: 'Délai moyen (jours)', type: 'line', yAxisIndex: 1, data: resolution, symbol: 'diamond', symbolSize: 8 },
  ],
};

const mixedTable: LcChartTable = {
  columns: ['Mois', 'Demandes reçues', 'Délai moyen (jours)'],
  rows: months.map((month, index) => [month, tickets[index], resolution[index]]),
};

const teams = ['Support', 'Produit', 'Design', 'Données', 'Infrastructure'];
const openTasks = [42, 31, 18, 25, 12];

const horizontal = {
  tooltip: { trigger: 'axis' },
  grid: { left: 112, right: 24, top: 8, bottom: 24 },
  xAxis: { type: 'value' },
  yAxis: { type: 'category', data: teams, inverse: true },
  series: [{ name: 'Tâches ouvertes', type: 'bar', data: openTasks, label: { show: true, position: 'right' } }],
};

const horizontalTable: LcChartTable = {
  columns: ['Équipe', 'Tâches ouvertes'],
  rows: teams.map((team, index) => [team, openTasks[index]]),
};

type ChartArgs = LcChartComponent & { hasData: boolean };

/**
 * Escape hatch for charts the specialised components do not cover: pass raw Apache ECharts options and the kit
 * applies its theme (categorical palette, font, transparent background, reduced motion, ARIA description, patterns).
 * Only `line` and `bar` series are registered. Always provide `table` so the values stay accessible, and never put
 * unescaped HTML in the options. ECharts is an optional dependency: provide it with `provideLcCharts()`.
 *
 * Import: `import { LcChartComponent, provideLcCharts } from '@lionelcointot/ui-angular/charts';`
 */
const meta: Meta<ChartArgs> = {
  title: 'Charts/Custom chart',
  component: LcChartComponent,
  decorators: [moduleMetadata({ imports: [LcChartComponent] })],
  args: {
    ariaLabel: 'Demandes reçues et délai moyen de traitement par mois',
    title: 'Demandes et délai de traitement',
    description: 'Premier semestre 2026',
    height: '320px',
    loading: false,
    stale: false,
    showDataTable: false,
    hasData: true,
  },
  argTypes: {
    hasData: { control: 'boolean', description: 'Off: `options` is null, so the empty state shows. Not an input of the component.' },
    options: { control: false },
    table: { control: false },
  },
};
export default meta;
type Story = StoryObj<ChartArgs>;

/** Every input is bound: change them in the Controls panel. The ECharts options are fixed demo data. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, options: args.hasData ? mixed : null, table: mixedTable },
    template: `<lc-chart [options]="options" [ariaLabel]="ariaLabel" [table]="table" [title]="title" [description]="description"
      [height]="height" [loading]="loading" [stale]="stale" [(showDataTable)]="showDataTable" />`,
  }),
};

/** Horizontal bars with value labels, for long category names. */
export const HorizontalBars: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { options: horizontal, table: horizontalTable },
    template: `<lc-chart [options]="options" [table]="table" ariaLabel="Tâches ouvertes par équipe" title="Tâches ouvertes par équipe" height="260px" />`,
  }),
};

/** Data table view: the same values as an accessible table (button under the chart). */
export const DataTableView: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { options: mixed, table: mixedTable },
    template: `<lc-chart [options]="options" [table]="table" ariaLabel="Demandes reçues et délai moyen" title="Vue tableau" [showDataTable]="true" />`,
  }),
};
