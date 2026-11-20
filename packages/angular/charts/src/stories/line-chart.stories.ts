import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcLineChartComponent } from '@lionelcointot/ui-angular/charts';
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

const years = Array.from({ length: 20 }, (_, index) => String(2026 + index));
const scenarios: LcCartesianData = {
  categories: years,
  categoryKind: 'year',
  series: [
    { id: 'a', label: 'Scénario A', values: years.map((_, i) => 40000 + i * i * 900), symbol: 'diamond' },
    { id: 'b', label: 'Scénario B', values: years.map((_, i) => 60000 + i * 14000), lineStyle: 'dashed', symbol: 'square' },
  ],
};

type LineChartArgs = LcLineChartComponent & { hasData: boolean };

/**
 * Line chart (Apache ECharts) for one or several series over ordered categories (dates, months, years or labels).
 * Series are told apart by colour, line style (`lineStyle`) and point shape (`symbol`), never by colour alone.
 * Supports vertical markers, annotated points, a data table view and a stale state during recalculation.
 * ECharts is an optional dependency: provide it with `provideLcCharts()`.
 *
 * Import: `import { LcLineChartComponent, provideLcCharts } from '@lionelcointot/ui-angular/charts';`
 */
const meta: Meta<LineChartArgs> = {
  title: 'Charts/Line chart',
  component: LcLineChartComponent,
  decorators: [moduleMetadata({ imports: [LcLineChartComponent] })],
  args: {
    title: 'Chiffre d\'affaires par canal',
    titleHidden: false,
    description: 'Par mois, en 2026',
    height: '280px',
    loading: false,
    stale: false,
    emptyMessage: 'Aucune donnée à afficher.',
    showDataTable: false,
    showPoints: 'auto',
    directLabels: 'auto',
    hasData: true,
  },
  argTypes: {
    showPoints: { control: 'inline-radio', options: ['auto', 'always', 'never'] },
    directLabels: { control: 'inline-radio', options: ['auto', 'none'] },
    hasData: { control: 'boolean', description: 'Off: no data, so the empty message shows. Not an input of the component.' },
    data: { control: false }, yAxis: { control: false }, markers: { control: false }, annotations: { control: false },
  },
};
export default meta;
type Story = StoryObj<LineChartArgs>;

const EMPTY: LcCartesianData = { categories: [], series: [] };

/** Every input is bound: change them in the Controls panel. Data and axis are fixed demo data. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['emptyMessage'] } },
  render: (args) => ({
    props: { ...args, data: args.hasData ? channels : EMPTY, yAxis: { format: 'money' } },
    template: `<lc-line-chart [title]="title" [titleHidden]="titleHidden" [description]="description" [height]="height" [loading]="loading" [stale]="stale"
      [emptyMessage]="emptyMessage" [(showDataTable)]="showDataTable" [showPoints]="showPoints" [directLabels]="directLabels" [data]="data" [yAxis]="yAxis" />`,
  }),
};

/** Dimmed while a recalculation is under way (`stale`). */
export const Stale: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { data: channels },
    template: `<lc-line-chart title="Recalcul en cours" [stale]="true" [data]="data" [yAxis]="{ format: 'money' }" />`,
  }),
};

/** Vertical marker (3 at most) and annotated points (`labelPosition`: side of the label, `left` on the last category); `lineStyle` and `symbol` tell series apart without colour alone. */
export const MarkersAndAnnotations: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      data: scenarios,
      markers: [{ id: 'crossing', categoryIndex: 10, label: 'Point de croisement' }],
      annotations: [
        { seriesId: 'a', categoryIndex: 10, label: 'A rattrape B', emphasis: 'primary' },
        { seriesId: 'b', categoryIndex: 3, label: 'Année 4', emphasis: 'secondary' },
        { seriesId: 'b', categoryIndex: years.length - 1, label: 'Fin de projection', emphasis: 'primary', labelPosition: 'left' },
      ],
    },
    template: `<lc-line-chart title="Cumul par scénario" description="Un repère et trois points annotés" [data]="data" [yAxis]="{ format: 'money' }"
      [markers]="markers" [annotations]="annotations" [showDataTable]="true" />`,
  }),
};

const longMonths = Array.from({ length: 480 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 5 + index, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
});

/** 480 months (40 years): one tick per year (or fewer when dense), never one label per month. */
export const MonthlyOverFortyYears: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      data: {
        categories: longMonths,
        categoryKind: 'month',
        series: [
          { id: 'a', label: 'Scénario A', values: longMonths.map((_, i) => 40000 + i * 650 + i * i * 2), symbol: 'diamond' },
          { id: 'b', label: 'Scénario B', values: longMonths.map((_, i) => 60000 + i * 900), lineStyle: 'dashed' },
        ],
      } satisfies LcCartesianData,
    },
    template: `<lc-line-chart title="Cumul sur 40 ans" [data]="data" [yAxis]="{ format: 'money' }" />`,
  }),
};
