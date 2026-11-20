import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcCellDirective } from '../table/cell.directive';
import { LcTableComponent } from '../table/table.component';
import { LcSort, LcTableColumn, sortRows } from '../table/table-model';

interface Order { id: number; quarter: number; week: string; orders: number; revenue: number; returns: number; status: string }

const orders: Order[] = Array.from({ length: 36 }, (_, index) => ({
  id: index + 1,
  quarter: Math.floor(index / 12) + 1,
  week: `Semaine ${index + 1}`,
  orders: 120 + index * 4,
  revenue: 8400 + index * 95,
  returns: 6 + (index % 5),
  status: index < 3 ? 'clôturée' : 'en cours',
}));

const columns: LcTableColumn<Order>[] = [
  { id: 'week', header: 'Période', value: (row) => row.week, sortable: true },
  { id: 'orders', header: 'Commandes', value: (row) => row.orders, format: 'integer', sortable: true },
  { id: 'revenue', header: 'Chiffre d\'affaires', value: (row) => row.revenue, format: 'money', sortable: true },
  { id: 'returns', header: 'Retours', value: (row) => row.returns, format: 'integer', sortable: true },
  { id: 'status', header: 'Statut', value: (row) => row.status },
];

const sum = (rows: readonly Order[], key: 'orders' | 'revenue' | 'returns') => rows.reduce((total, row) => total + row[key], 0);
const trackBy = (row: Order) => row.id;

/** Memoised: a template binding must return the same reference while its arguments are unchanged. */
function memo<A extends readonly unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let last: { args: A; result: R } | undefined;
  return (...args) => (last && last.args.every((arg, index) => arg === args[index]) ? last.result : (last = { args, result: fn(...args) }).result);
}

type TableArgs = LcTableComponent<Order> & { rowCount: number };

/**
 * Accessible data table: sortable columns, row groups with sub-totals, a totals row, sticky header and two densities.
 * Client-side sorting by default; `sortMode="external"` only reports the requested sort so the data can be sorted elsewhere (server).
 * Up to 2,000 rows are rendered; beyond, the display is truncated with a notice.
 *
 * Import: `import { LcTableComponent, LcCellDirective } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<TableArgs> = {
  title: 'Data/Table',
  component: LcTableComponent,
  decorators: [moduleMetadata({ imports: [LcTableComponent, LcCellDirective] })],
  args: {
    caption: 'Commandes par semaine',
    captionHidden: false,
    sortMode: 'client',
    stickyHeader: false,
    density: 'comfortable',
    emptyMessage: 'Aucune commande à afficher.',
    rowCount: 12,
  },
  argTypes: {
    sortMode: { control: 'inline-radio', options: ['client', 'external'] },
    density: { control: 'inline-radio', options: ['comfortable', 'compact'] },
    rowCount: { control: { type: 'number', min: 0, max: 36 }, description: 'Number of demo rows (0 shows the empty message). Not an input of the component.' },
    data: { control: false }, columns: { control: false }, trackBy: { control: false },
    groupBy: { control: false }, footer: { control: false }, sort: { control: false },
  },
};
export default meta;
type Story = StoryObj<TableArgs>;

/** Every input is bound: change them in the Controls panel. Click a header to sort (`sortMode="external"` leaves the order to the story, which sorts like a server). */
export const Playground: Story = {
  render: (args) => ({
    props: {
      ...args,
      columns, trackBy, sort: null as LcSort | null,
      data: orders.slice(0, args.rowCount),
      serverSorted: memo((rows: readonly Order[], sort: LcSort | null) => sortRows(rows, columns, sort)),
    },
    template: `<lc-table [caption]="caption" [captionHidden]="captionHidden" [sortMode]="sortMode" [stickyHeader]="stickyHeader" [density]="density"
      [emptyMessage]="emptyMessage" [columns]="columns" [trackBy]="trackBy" [(sort)]="sort"
      [data]="sortMode === 'external' ? serverSorted(data, sort) : data" />`,
  }),
};

/** Many columns in a fixed width: `--lc-table-cell-padding-inline` tunes the horizontal cell spacing (no `::ng-deep`). */
export const TightSpacing: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { data: orders.slice(0, 12), columns, trackBy },
    template: `<lc-table caption="Commandes par semaine, resserré" style="--lc-table-cell-padding-inline: var(--lc-sys-space-1)" [data]="data" [columns]="columns" [trackBy]="trackBy" />`,
  }),
};

/** Rows grouped by quarter with a sub-total per group, a grand-total footer and a custom cell template (`lcCell`). */
export const GroupsAndTotals: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      data: orders, columns, trackBy,
      grouping: {
        key: (row: Order) => String(row.quarter),
        label: (key: string) => `Trimestre ${key}`,
        summary: (rows: readonly Order[]) => ({ orders: sum(rows, 'orders'), revenue: sum(rows, 'revenue'), returns: sum(rows, 'returns') }),
      },
      footer: { orders: sum(orders, 'orders'), revenue: sum(orders, 'revenue'), returns: sum(orders, 'returns') },
    },
    template: `<lc-table caption="Commandes par trimestre" [data]="data" [columns]="columns" [trackBy]="trackBy" [groupBy]="grouping" [footer]="footer" [stickyHeader]="true">
      <ng-template lcCell="status" let-row><strong>{{ row.status }}</strong></ng-template></lc-table>`,
  }),
};

/** Sort by column: click or Enter/Space on the header; ascending, descending, then back to the original order. `[(sort)]` binds both ways. */
export const Sorting: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { data: orders.slice(0, 12), columns, trackBy, sort: { columnId: 'orders', direction: 'desc' } as LcSort | null },
    template: `<lc-table caption="Commandes triables" [data]="data" [columns]="columns" [trackBy]="trackBy" [(sort)]="sort" />
      <p>Tri demandé : {{ sort ? sort.columnId + ' ' + sort.direction : 'aucun' }}</p>`,
  }),
};

/** Sorting done elsewhere (server): `sortMode="external"` only emits the requested sort; here `sortRows` plays the server. */
export const ExternalSorting: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      source: orders.slice(0, 12), columns, trackBy, sort: null as LcSort | null,
      serverSorted: memo((source: readonly Order[], sort: LcSort | null) => sortRows(source, columns, sort)),
    },
    template: `<lc-table caption="Commandes triées par le serveur" sortMode="external" [data]="serverSorted(source, sort)"
      [columns]="columns" [trackBy]="trackBy" [(sort)]="sort" />`,
  }),
};

/** No row: the table shows its empty message. */
export const Empty: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { columns, trackBy },
    template: `<lc-table caption="Commandes par semaine" [data]="[]" [columns]="columns" [trackBy]="trackBy" />`,
  }),
};
