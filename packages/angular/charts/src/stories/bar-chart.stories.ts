import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcBarChartComponent } from '../components/bar-chart.component';
import type { LcCartesianData } from '../types';

const months = Array.from({ length: 8 }, (_, index) => `2026-${String(index + 1).padStart(2, '0')}`);
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

const cumulative: LcCartesianData = {
  categories: ['5 ans', '10 ans', '15 ans', '20 ans'],
  series: [
    { id: 'a', label: 'Scénario A', values: [58000, 96000, 131000, 160000], colorSlot: 1, pattern: 'solid' },
    { id: 'b', label: 'Scénario B', values: [42000, 88000, 140000, 198000], colorSlot: 2, pattern: 'hatch' },
  ],
};

type BarChartArgs = LcBarChartComponent & { hasData: boolean };

/**
 * Bar chart (Apache ECharts), vertical or horizontal, grouped or stacked, with an optional total above each stack.
 * Colour comes from colour slots or semantic roles (`colorRole`), and each series can take a fill pattern (`pattern`), so meaning never relies on colour alone.
 * ECharts is an optional dependency: provide it with `provideLcCharts()`.
 *
 * Import: `import { LcBarChartComponent, provideLcCharts } from '@lionelcointot/ui-angular/charts';`
 */
const meta: Meta<BarChartArgs> = {
  title: 'Charts/Bar chart',
  component: LcBarChartComponent,
  decorators: [moduleMetadata({ imports: [LcBarChartComponent] })],
  args: {
    title: 'Chiffre d\'affaires par canal',
    titleHidden: false,
    description: 'Par mois, en 2026',
    height: '280px',
    loading: false,
    stale: false,
    emptyMessage: 'Aucune donnée à afficher.',
    showDataTable: false,
    orientation: 'vertical',
    stacked: true,
    totals: true,
    hasData: true,
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    hasData: { control: 'boolean', description: 'Off: no data, so the empty message shows. Not an input of the component.' },
    data: { control: false }, yAxis: { control: false },
  },
};
export default meta;
type Story = StoryObj<BarChartArgs>;

const EMPTY: LcCartesianData = { categories: [], series: [] };

/** Every input is bound: change them in the Controls panel. Data and axis are fixed demo data. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, data: args.hasData ? channels : EMPTY, yAxis: { format: 'money' } },
    template: `<lc-bar-chart [title]="title" [titleHidden]="titleHidden" [description]="description" [height]="height" [loading]="loading" [stale]="stale"
      [emptyMessage]="emptyMessage" [(showDataTable)]="showDataTable" [orientation]="orientation" [stacked]="stacked" [totals]="totals" [data]="data" [yAxis]="yAxis" />`,
  }),
};

/** Colour by role (`colorRole`): theme colour, pattern and icon specific to the role, independent of the rank. */
export const ByRole: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { data: byRole },
    template: `<lc-bar-chart title="Volumes par état" description="Par jour de la semaine" [data]="data" [stacked]="true" />`,
  }),
};

/**
 * Pattern per series (`pattern`): "Scénario A" solid, "Scénario B" hatched at 45°, on screen and in print
 * (even with `patterns: 'never'`). The legend swatch repeats the pattern.
 */
export const ByPattern: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { data: cumulative },
    template: `<lc-bar-chart title="Cumul par scénario" description="Par durée" [data]="data" [yAxis]="{ format: 'money' }" />`,
  }),
};

/** The four patterns: solid, hatch at 45°, hatch at 135°, dots. */
export const FourPatterns: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      data: {
        categories: ['A', 'B', 'C'],
        series: [
          { id: 'a', label: 'Plein', values: [4, 6, 5], colorSlot: 1, pattern: 'solid' },
          { id: 'b', label: 'Hachures 45°', values: [3, 5, 6], colorSlot: 2, pattern: 'hatch' },
          { id: 'c', label: 'Hachures 135°', values: [5, 4, 3], colorSlot: 3, pattern: 'hatch-reverse' },
          { id: 'd', label: 'Pointillé', values: [2, 3, 4], colorSlot: 4, pattern: 'dots' },
        ],
      } satisfies LcCartesianData,
    },
    template: `<lc-bar-chart title="Quatre motifs" [data]="data" />`,
  }),
};

/** `yAxis.format: 'integer'`: ticks stay whole numbers (minimum step of 1), even on small counts. */
export const IntegerAxis: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { data: { categories: days, series: [{ id: 'ko', label: 'En échec', values: [1, 0, 2, 1, 0, 1, 2] }] } satisfies LcCartesianData },
    template: `<lc-bar-chart title="Échecs par jour" [data]="data" [yAxis]="{ format: 'integer' }" />`,
  }),
};
