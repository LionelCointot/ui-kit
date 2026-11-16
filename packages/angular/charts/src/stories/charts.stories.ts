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

/** États ordonnés : nuances d'une seule teinte (plus avancé = plus marqué), légende sous la barre avec le nombre de chaque état. */
export const EtatsOrdonnes: Story = {
  render: () => ({
    template: `<lc-segmented-bar title="Tâches ouvertes, par état" variant="thin" format="integer" palette="sequential" legendPosition="bottom" [legendValues]="true" [parts]="[
      { id: 'new', label: 'Nouvelle', value: 4 }, { id: 'acknowledged', label: 'Prise en compte', value: 7 },
      { id: 'planned', label: 'Planifiée', value: 5 }, { id: 'in-progress', label: 'En cours', value: 9 },
      { id: 'review', label: 'À valider', value: 3 }]" />`,
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

/** Repère vertical (3 au plus) et point annoté (`labelPosition` : côté de l'étiquette, `left` sur la dernière catégorie) ; `lineStyle` et `symbol` distinguent les séries sans la couleur seule. */
export const RepereEtAnnotations: Story = {
  render: () => ({
    props: {
      data: patrimony,
      markers: [{ id: 'equilibrium', categoryIndex: 10, label: 'Point d\'équilibre' }],
      annotations: [
        { seriesId: 'buy', categoryIndex: 10, label: 'Achat rattrape la location', emphasis: 'primary' },
        { seriesId: 'rent', categoryIndex: 3, label: 'Année 4', emphasis: 'secondary' },
        { seriesId: 'rent', categoryIndex: years.length - 1, label: 'Fin de projection', emphasis: 'primary', labelPosition: 'left' },
      ],
    },
    template: `<lc-line-chart title="Patrimoine net" description="Un repère et trois points annotés" [data]="data" [yAxis]="{ format: 'money' }"
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

const paid: LcCartesianData = {
  categories: ['5 ans', '10 ans', '15 ans', '20 ans'],
  series: [
    { id: 'buy', label: 'En achetant', values: [58000, 96000, 131000, 160000], colorSlot: 1, pattern: 'solid' },
    { id: 'rent', label: 'En louant', values: [42000, 88000, 140000, 198000], colorSlot: 2, pattern: 'hatch' },
  ],
};

/**
 * Motif par série (`pattern`) : « En achetant » plein, « En louant » hachuré à 45°, à l'écran comme à l'impression
 * (même avec `patterns: 'never'`). La pastille de la légende reprend le motif.
 */
export const BarresParMotif: Story = {
  render: () => ({
    props: { data: paid },
    template: `<lc-bar-chart title="Ce que vous payez" description="Cumul par durée" [data]="data" [yAxis]="{ format: 'money' }" />`,
  }),
};

/** Les quatre motifs : aplat, hachures à 45°, hachures à 135°, pointillé. */
export const QuatreMotifs: Story = {
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

/** `yAxis.format: 'integer'` : les graduations restent entières (pas minimal de 1), même sur de petits comptes. */
export const AxeEnEntiers: Story = {
  render: () => ({
    props: { data: { categories: days, series: [{ id: 'ko', label: 'En échec', values: [1, 0, 2, 1, 0, 1, 2] }] } satisfies LcCartesianData },
    template: `<lc-bar-chart title="Échecs par jour" [data]="data" [yAxis]="{ format: 'integer' }" />`,
  }),
};
