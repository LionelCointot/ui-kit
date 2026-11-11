import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcAreaChartComponent } from '../components/area-chart.component';
import { LcBarChartComponent } from '../components/bar-chart.component';
import { LcLineChartComponent } from '../components/line-chart.component';
import { LcSegmentedBarComponent } from '../components/segmented-bar.component';
import { LcSparklineComponent } from '../components/sparkline.component';
import type { LcCartesianData } from '../types';

const years = Array.from({ length: 20 }, (_, index) => String(2026 + index));
const cartesian: LcCartesianData = {
  categories: years,
  categoryKind: 'year',
  series: [
    { id: 'capital', label: 'Capital', values: years.map((_, i) => 6000 + i * 450) },
    { id: 'interest', label: 'Intérêts', values: years.map((_, i) => 8000 - i * 380) },
    { id: 'insurance', label: 'Assurance', values: years.map(() => 900) },
  ],
};

const meta: Meta = {
  title: 'Graphiques/Graphiques',
  decorators: [moduleMetadata({ imports: [LcLineChartComponent, LcAreaChartComponent, LcBarChartComponent, LcSegmentedBarComponent, LcSparklineComponent] })],
  args: { data: cartesian },
};
export default meta;
type Story = StoryObj;

export const Courbes: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-line-chart title="Capital restant dû" description="Par année" [data]="data" [yAxis]="{ format: 'money' }" />`,
  }),
};

export const AiresEmpilees: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-area-chart title="Répartition annuelle" [data]="data" [yAxis]="{ format: 'money' }" />`,
  }),
};

export const BarresEmpilees: Story = {
  render: (args) => ({
    props: { ...args, bars: { ...cartesian, categories: years.slice(0, 8), series: cartesian.series.map((s) => ({ ...s, values: s.values.slice(0, 8) })) } },
    template: `<lc-bar-chart title="Intérêts, capital et assurance" [data]="bars" [stacked]="true" [yAxis]="{ format: 'money' }" />`,
  }),
};

export const BarreSegmentee: Story = {
  render: () => ({
    template: `<div style="display:grid;gap:24px">
      <lc-segmented-bar title="Coût de l'opération" format="money" [parts]="[
        { id: 'capital', label: 'Capital', value: 250000 }, { id: 'interest', label: 'Intérêts', value: 52000 },
        { id: 'insurance', label: 'Assurance', value: 12000 }, { id: 'fees', label: 'Frais', value: 4000 }]" />
      <lc-segmented-bar title="Part des intérêts" variant="thin" format="money" [parts]="[
        { id: 'capital', label: 'Capital', value: 250000 }, { id: 'interest', label: 'Intérêts', value: 52000 }]" /></div>`,
  }),
};

export const Sparkline: Story = {
  render: () => ({
    template: `<div style="width:160px"><lc-sparkline ariaLabel="Capital restant dû sur 12 mois, en baisse" [values]="[10,9.6,9.2,8.7,8.5,8,7.4,7,6.5,6,5.2,4.9]" [showEndPoint]="true" /></div>`,
  }),
};

export const Rafraichissement: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-line-chart title="Recalcul en cours" [stale]="true" [data]="data" [yAxis]="{ format: 'money' }" />`,
  }),
};

const patrimony: LcCartesianData = {
  categories: years,
  categoryKind: 'year',
  series: [
    { id: 'buy', label: 'Acheter', values: years.map((_, i) => 40000 + i * i * 900), symbol: 'diamond' },
    { id: 'rent', label: 'Louer', values: years.map((_, i) => 60000 + i * 14000), lineStyle: 'dashed', symbol: 'square' },
  ],
};

/** Repère vertical (3 au plus) et point annoté ; `lineStyle` et `symbol` distinguent les séries sans la couleur seule. */
export const RepereEtAnnotations: Story = {
  render: () => ({
    props: {
      data: patrimony,
      markers: [{ id: 'equilibrium', categoryIndex: 10, label: 'Point d\'équilibre' }],
      annotations: [
        { seriesId: 'buy', categoryIndex: 10, label: 'Achat rattrape la location', emphasis: 'primary' },
        { seriesId: 'rent', categoryIndex: 3, label: 'Année 4', emphasis: 'secondary' },
      ],
    },
    template: `<lc-line-chart title="Patrimoine net" description="Un repère et deux points annotés" [data]="data" [yAxis]="{ format: 'money' }"
      [markers]="markers" [annotations]="annotations" [showDataTable]="true" />`,
  }),
};

export const AireAvecRepere: Story = {
  render: () => ({
    props: { data: cartesian, markers: [{ id: 'mid', categoryIndex: 9, label: 'Mi-parcours' }] },
    template: `<lc-area-chart title="Répartition annuelle" [data]="data" [yAxis]="{ format: 'money' }" [markers]="markers" />`,
  }),
};

const months = Array.from({ length: 480 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 5 + index, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
});

/** 480 mois (40 ans) : une graduation par année (ou moins si dense), jamais une étiquette par mois. */
export const MensuelSurQuaranteAns: Story = {
  render: () => ({
    props: {
      data: {
        categories: months,
        categoryKind: 'month',
        series: [
          { id: 'buy', label: 'Acheter', values: months.map((_, i) => 40000 + i * 650 + i * i * 2), symbol: 'diamond' },
          { id: 'rent', label: 'Louer', values: months.map((_, i) => 60000 + i * 900), lineStyle: 'dashed' },
        ],
      } satisfies LcCartesianData,
    },
    template: `<lc-line-chart title="Patrimoine net sur 40 ans" [data]="data" [yAxis]="{ format: 'money' }" />`,
  }),
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

/** Couleur par rôle (`colorRole`) : couleur du thème, décalque et icône propres au rôle, indépendants du rang. */
export const BarresParRole: Story = {
  render: () => ({
    props: { data: byRole },
    template: `<lc-bar-chart title="Volumes par état" description="Par jour de la semaine" [data]="data" [stacked]="true" />`,
  }),
};

/** Les décalques de rôle restent actifs même avec `provideLcCharts({ patterns: 'never' })`. */
export const AiresParRole: Story = {
  render: () => ({
    props: { data: byRole },
    template: `<lc-area-chart title="Volumes par état (aires)" [data]="data" [stacked]="true" />`,
  }),
};
