import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcCellDirective } from '../table/cell.directive';
import { fixedExample } from '@lc/storybook';
import type { LcTableColumn } from '../table/table-model';
import { LcTreeTableComponent } from '../tree-table/tree-table.component';

interface Unit { id: string; name: string; members: number; budget: number; subUnits?: Unit[] }

const units: Unit[] = [
  {
    id: 'north', name: 'Région Nord', members: 120, budget: 480000, subUnits: [
      { id: 'north-a', name: 'Agence A', members: 40, budget: 150000, subUnits: [
        { id: 'north-a-1', name: 'Équipe A1', members: 18, budget: 70000 },
        { id: 'north-a-2', name: 'Équipe A2', members: 22, budget: 80000 },
      ] },
      { id: 'north-b', name: 'Agence B', members: 80, budget: 330000, subUnits: [
        { id: 'north-b-1', name: 'Équipe B1', members: 35, budget: 140000 },
        { id: 'north-b-2', name: 'Équipe B2', members: 45, budget: 190000 },
      ] },
    ],
  },
  {
    id: 'south', name: 'Région Sud', members: 75, budget: 310000, subUnits: [
      { id: 'south-a', name: 'Agence C', members: 75, budget: 310000, subUnits: [
        { id: 'south-a-1', name: 'Équipe C1', members: 75, budget: 310000 },
      ] },
    ],
  },
  { id: 'hq', name: 'Siège', members: 12, budget: 95000 },
];

const columns: LcTableColumn<Unit>[] = [
  { id: 'name', header: 'Entité', value: (unit) => unit.name, sortable: true },
  { id: 'members', header: 'Effectif', value: (unit) => unit.members, format: 'integer', sortable: true },
  { id: 'budget', header: 'Budget', value: (unit) => unit.budget, format: 'money', sortable: true },
];

/** Génère un arbre de `count` nœuds visibles (région > agences > équipes) pour la limite d'affichage. */
function bigTree(count: number): Unit[] {
  const roots: Unit[] = [];
  let total = 0;
  for (let r = 0; total < count; r++) {
    const root: Unit = { id: `r${r}`, name: `Région ${r + 1}`, members: 10, budget: 1000, subUnits: [] };
    total += 1;
    for (let a = 0; a < 20 && total < count; a++) {
      const agency: Unit = { id: `r${r}a${a}`, name: `Agence ${r + 1}.${a + 1}`, members: 5, budget: 500, subUnits: [] };
      total += 1;
      for (let t = 0; t < 20 && total < count; t++) {
        agency.subUnits!.push({ id: `r${r}a${a}t${t}`, name: `Équipe ${r + 1}.${a + 1}.${t + 1}`, members: t + 1, budget: 100 * (t + 1) });
        total += 1;
      }
      root.subUnits!.push(agency);
    }
    roots.push(root);
  }
  return roots;
}

const base = { data: units, columns, trackBy: (unit: Unit) => unit.id, children: (unit: Unit) => unit.subUnits };

type TreeTableArgs = LcTreeTableComponent<Unit> & { hasData: boolean };

/**
 * Hierarchical table (ARIA treegrid): rows expand and collapse, sorting reorders the siblings of each level without breaking the hierarchy,
 * and a filter keeps the ancestors of the matches. Up to 2,000 visible rows are rendered; beyond, the display is truncated with a notice.
 * Keyboard: arrows move between rows, Right and Left expand and collapse.
 *
 * Import: `import { LcTreeTableComponent, LcCellDirective } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<TreeTableArgs> = {
  title: 'Data/Tree table',
  component: LcTreeTableComponent,
  decorators: [moduleMetadata({ imports: [LcTreeTableComponent, LcCellDirective] })],
  args: {
    caption: 'Organisation',
    captionHidden: false,
    expandAllInitially: false,
    stickyHeader: false,
    density: 'comfortable',
    emptyMessage: 'Aucune entité à afficher.',
    hasData: true,
  },
  argTypes: {
    density: { control: 'inline-radio', options: ['comfortable', 'compact'] },
    hasData: { control: 'boolean', description: 'Off: no data, so the empty message shows. Not an input of the component.' },
    data: { control: false }, columns: { control: false }, trackBy: { control: false }, children: { control: false },
    filter: { control: false }, sort: { control: false }, expanded: { control: false },
  },
};
export default meta;
type Story = StoryObj<TreeTableArgs>;

/** Every input is bound: change them in the Controls panel. Click a row's chevron to expand it. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, columns, trackBy: base.trackBy, children: base.children, units },
    template: `<lc-tree-table [caption]="caption" [captionHidden]="captionHidden" [expandAllInitially]="expandAllInitially"
      [stickyHeader]="stickyHeader" [density]="density" [emptyMessage]="emptyMessage"
      [data]="hasData ? units : []" [columns]="columns" [trackBy]="trackBy" [children]="children" />`,
  }),
};

/** Every node expanded from the start (`expandAllInitially`). */
export const AllExpanded: Story = {
  parameters: fixedExample,
  render: () => ({
    props: base,
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" [expandAllInitially]="true" />`,
  }),
};

/** Sorting reorders the siblings of each level without breaking the hierarchy. */
export const SortAmongSiblings: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ...base, sort: { columnId: 'budget', direction: 'desc' } },
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children"
      [expandAllInitially]="true" [sort]="sort" />`,
  }),
};

/** The filter keeps the ancestors of the results and expands them. */
export const Filter: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ...base, filter: (unit: Unit) => unit.name.includes('B2') },
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" [filter]="filter" />`,
  }),
};

/** A filter that matches nothing shows the empty message. */
export const FilterWithoutResult: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ...base, filter: () => false },
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" [filter]="filter"
      emptyMessage="Aucune entité ne correspond." />`,
  }),
};

/** A custom cell template (`lcCell`) receives the node and its `level`. */
export const CellWithLevel: Story = {
  parameters: fixedExample,
  render: () => ({
    props: base,
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" [expandAllInitially]="true">
      <ng-template lcCell="name" let-unit let-level="level"><strong>{{ unit.name }}</strong> <small>(niveau {{ level }})</small></ng-template>
    </lc-tree-table>`,
  }),
};

/** Compact density with every node expanded. */
export const CompactDensity: Story = {
  parameters: fixedExample,
  render: () => ({
    props: base,
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" density="compact" [expandAllInitially]="true" />`,
  }),
};

/** Below 600 px: sticky first column and whole-column scrolling (`--lc-table-sticky-start-size` = width of the first column). */
export const SmallScreen: Story = {
  parameters: { ...fixedExample, viewport: { defaultViewport: 'mobile1' } },
  render: () => ({
    props: base,
    template: `<div style="--lc-table-sticky-start-size: 9rem"><lc-tree-table caption="Organisation" [data]="data" [columns]="columns"
      [trackBy]="trackBy" [children]="children" [expandAllInitially]="true" /></div>`,
  }),
};

/** No data: the table shows its empty message. */
export const Empty: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ...base, data: [] },
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" />`,
  }),
};

/** 1,500 visible nodes: under the 2,000-row display limit. */
export const FifteenHundredNodes: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ...base, data: bigTree(1500) },
    template: `<lc-tree-table caption="Grande organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children"
      [expandAllInitially]="true" [stickyHeader]="true" />`,
  }),
};

/** 2,600 visible nodes: the display is truncated at 2,000 rows and a notice says so. */
export const TruncatedBeyondTwoThousand: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ...base, data: bigTree(2600) },
    template: `<lc-tree-table caption="Très grande organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children"
      [expandAllInitially]="true" [stickyHeader]="true" />`,
  }),
};
