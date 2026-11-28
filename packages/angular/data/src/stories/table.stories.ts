import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcCellDirective, LcTableComponent, LcSort, LcTableColumn, sortRows } from '@lionelcointot/ui-angular/data';

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
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['sortMode', 'emptyMessage'] } },
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

/** Tones live in a plain stylesheet in <head>: a template `<style>` is emulated-encapsulated and would not reach the rows rendered inside `lc-table`. */
function installTones(): true {
  if (!document.getElementById('story-table-tones')) {
    const style = document.createElement('style');
    style.id = 'story-table-tones';
    style.textContent = `
      .story-tone { --lc-table-row-background: var(--_bg); color: var(--_fg); }
      .story-tone > :first-child { border-inline-start: var(--lc-sys-border-width-thick) solid var(--_bar); }
      .story-tone--success { --_bg: var(--lc-sys-color-success-container); --_fg: var(--lc-sys-color-on-success-container); --_bar: var(--lc-sys-color-success); }
      .story-tone--info { --_bg: var(--lc-sys-color-info-container); --_fg: var(--lc-sys-color-on-info-container); --_bar: var(--lc-sys-color-info); }
      .story-tone--error { --_bg: var(--lc-sys-color-error-container); --_fg: var(--lc-sys-color-on-error-container); --_bar: var(--lc-sys-color-error); }
      .story-tone--warning { --_bg: var(--lc-sys-color-warning-container); --_fg: var(--lc-sys-color-on-warning-container); --_bar: var(--lc-sys-color-warning); }`;
    document.head.appendChild(style);
  }
  return true;
}

/** Selection column (`[selectable]="{ … }"` settings, `[(selection)]`): Bob's row cannot be ticked (`isRowSelectable`), the header box is partial when only some rows are ticked, and The selection column and the first data column both stay sticky while the table scrolls sideways (narrow container). `rowClass` adds classes to data rows; here the story's own stylesheet tints them with `--lc-table-row-background` (kit tokens only; colour is never the only cue: the status column says it too). Check it in both themes. */
export const SelectionAndTones: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      data: orders.slice(0, 6), columns, trackBy, tonesInstalled: installTones(),
      selection: new Set<unknown>([1, 2]),
      selectable: { isRowSelectable: (row: Order) => row.id !== 3, selectAllHint: 'La case en haut du tableau agit sur toutes les commandes.' },
      tone: (row: Order) => (row.id <= 4 ? `story-tone story-tone--${['success', 'info', 'error', 'warning'][row.id - 1]}` : null),
    },
    template: `<div style="max-inline-size: 28rem"><lc-table caption="Commandes à traiter" [data]="data" [columns]="columns" [trackBy]="trackBy" [selectable]="selectable" [(selection)]="selection"
      [rowClass]="tone" /></div>
      <p>{{ selection.size }} sélectionnée(s)</p>`,
  }),
};

/** Data states: `undefined` shows the skeleton (real headers, 3 placeholder rows), `null` or `[]` the empty message, `stale` dims the rows during a reload. The last table has 3 rows, for comparison. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { columns, trackBy, three: orders.slice(0, 3) },
    template: `<div style="display:grid;gap:var(--lc-sys-space-6)">
      <section><h3>Chargement</h3><div data-qa-state="loading"><lc-table caption="Commandes en chargement" [data]="undefined" [columns]="columns" [trackBy]="trackBy" /></div></section>
      <section><h3>Vide</h3><div data-qa-state="empty"><lc-table caption="Commandes, aucune" [data]="null" [columns]="columns" [trackBy]="trackBy" /></div></section>
      <section><h3>Rechargement</h3><div data-qa-state="stale"><lc-table caption="Commandes en rechargement" [data]="three" [columns]="columns" [trackBy]="trackBy" [stale]="true" /></div></section>
      <section><h3>Trois lignes</h3><div data-qa-state="three"><lc-table caption="Commandes, trois lignes" [data]="three" [columns]="columns" [trackBy]="trackBy" /></div></section></div>`,
  }),
};
