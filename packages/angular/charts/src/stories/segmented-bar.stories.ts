import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcSegmentedBarComponent } from '@lionelcointot/ui-angular/charts';
import type { LcPart } from '@lionelcointot/ui-angular/charts';

const BUDGET: LcPart[] = [
  { id: 'build', label: 'Développement', value: 250000 },
  { id: 'test', label: 'Tests', value: 52000 },
  { id: 'docs', label: 'Documentation', value: 12000 },
  { id: 'misc', label: 'Divers', value: 4000 },
];

const TASKS_BY_STATE: LcPart[] = [
  { id: 'new', label: 'Nouvelle', value: 4 },
  { id: 'acknowledged', label: 'Prise en compte', value: 7 },
  { id: 'planned', label: 'Planifiée', value: 5 },
  { id: 'in-progress', label: 'En cours', value: 9 },
  { id: 'review', label: 'À valider', value: 3 },
];

type SegmentedBarArgs = LcSegmentedBarComponent & { hasData: boolean };

/**
 * Single horizontal bar split into proportional parts, with a legend: a quick view of how a total is shared.
 * `tall` is the standard height, `thin` a compact bar. The `categorical` palette tells parts apart; the `sequential` palette
 * suits ordered states (one hue, from light to dark). The legend can show each part's value.
 *
 * Import: `import { LcSegmentedBarComponent } from '@lionelcointot/ui-angular/charts';`
 */
const meta: Meta<SegmentedBarArgs> = {
  title: 'Charts/Segmented bar',
  component: LcSegmentedBarComponent,
  decorators: [moduleMetadata({ imports: [LcSegmentedBarComponent] })],
  args: {
    title: 'Répartition du budget',
    titleHidden: false,
    description: 'Par poste de dépense',
    height: undefined,
    loading: false,
    stale: false,
    emptyMessage: 'Aucune donnée à afficher.',
    showDataTable: false,
    format: 'money',
    variant: 'tall',
    palette: 'categorical',
    legendPosition: 'top',
    legendValues: false,
    hasData: true,
  },
  argTypes: {
    format: { control: 'select', options: ['number', 'integer', 'money', 'percent'] },
    variant: { control: 'inline-radio', options: ['tall', 'thin'] },
    palette: { control: 'inline-radio', options: ['categorical', 'sequential'] },
    legendPosition: { control: 'inline-radio', options: ['top', 'bottom', 'none'] },
    height: { control: 'text' },
    hasData: { control: 'boolean', description: 'Off: no part, so the empty message shows. Not an input of the component.' },
    parts: { control: false }, total: { control: false },
  },
};
export default meta;
type Story = StoryObj<SegmentedBarArgs>;

/** Every input is bound: change them in the Controls panel. The parts are fixed demo data. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['emptyMessage'] } },
  render: (args) => ({
    props: { ...args, parts: args.hasData ? BUDGET : [] },
    template: `<lc-segmented-bar [title]="title" [titleHidden]="titleHidden" [description]="description" [height]="height || undefined" [loading]="loading" [stale]="stale"
      [emptyMessage]="emptyMessage" [(showDataTable)]="showDataTable" [format]="format" [variant]="variant" [palette]="palette"
      [legendPosition]="legendPosition" [legendValues]="legendValues" [parts]="parts" />`,
  }),
};

/** `tall` and `thin` variants. */
export const Variants: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { parts: BUDGET, shares: BUDGET.slice(0, 2) },
    template: `<div style="display:grid;gap:var(--lc-sys-space-6)">
      <lc-segmented-bar title="Répartition du budget" format="money" [parts]="parts" />
      <lc-segmented-bar title="Part des tests" variant="thin" format="money" [parts]="shares" /></div>`,
  }),
};

/** Ordered states: shades of a single hue (further along = darker), legend under the bar with the count of each state. */
export const OrderedStates: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { parts: TASKS_BY_STATE },
    template: `<lc-segmented-bar title="Tâches ouvertes, par état" variant="thin" format="integer" palette="sequential" legendPosition="bottom" [legendValues]="true" [parts]="parts" />`,
  }),
};
