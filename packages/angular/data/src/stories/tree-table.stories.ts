import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcCellDirective } from '../table/cell.directive';
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

const meta: Meta<LcTreeTableComponent<Unit>> = {
  title: 'Données/Tableau hiérarchique',
  component: LcTreeTableComponent,
  decorators: [moduleMetadata({ imports: [LcTreeTableComponent, LcCellDirective] })],
};
export default meta;
type Story = StoryObj;

export const Defaut: Story = {
  render: () => ({
    props: base,
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" />`,
  }),
};

export const TousDeplies: Story = {
  render: () => ({
    props: base,
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" [expandAllInitially]="true" />`,
  }),
};

/** Le tri réordonne les frères de chaque niveau sans casser la hiérarchie. */
export const TriParmiLesFreres: Story = {
  render: () => ({
    props: { ...base, sort: { columnId: 'budget', direction: 'desc' } },
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children"
      [expandAllInitially]="true" [sort]="sort" />`,
  }),
};

/** Le filtre garde les ancêtres des résultats et les déplie. */
export const Filtre: Story = {
  render: () => ({
    props: { ...base, filter: (unit: Unit) => unit.name.includes('B2') },
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" [filter]="filter" />`,
  }),
};

export const FiltreSansResultat: Story = {
  render: () => ({
    props: { ...base, filter: () => false },
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" [filter]="filter"
      emptyMessage="Aucune entité ne correspond." />`,
  }),
};

export const CelluleAvecNiveau: Story = {
  render: () => ({
    props: base,
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" [expandAllInitially]="true">
      <ng-template lcCell="name" let-unit let-level="level"><strong>{{ unit.name }}</strong> <small>(niveau {{ level }})</small></ng-template>
    </lc-tree-table>`,
  }),
};

export const Compact: Story = {
  render: () => ({
    props: base,
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" density="compact" [expandAllInitially]="true" />`,
  }),
};

export const Vide: Story = {
  render: () => ({
    props: { ...base, data: [] },
    template: `<lc-tree-table caption="Organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children" />`,
  }),
};

/** Au-delà de 2 000 lignes visibles : troncature signalée. */
export const MilleCinqCentsNoeuds: Story = {
  render: () => ({
    props: { ...base, data: bigTree(1500) },
    template: `<lc-tree-table caption="Grande organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children"
      [expandAllInitially]="true" [stickyHeader]="true" />`,
  }),
};

export const TroncatureAuDelaDeDeuxMille: Story = {
  render: () => ({
    props: { ...base, data: bigTree(2600) },
    template: `<lc-tree-table caption="Très grande organisation" [data]="data" [columns]="columns" [trackBy]="trackBy" [children]="children"
      [expandAllInitially]="true" [stickyHeader]="true" />`,
  }),
};
