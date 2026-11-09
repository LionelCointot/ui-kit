import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcCellDirective } from '../table/cell.directive';
import { LcTableComponent } from '../table/table.component';
import { LcTableColumn } from '../table/table-model';
import { LcDescriptionListComponent } from '../description-list/description-list.component';
import { LcKpiCardComponent } from '../kpi-card/kpi-card.component';

interface Payment { id: number; year: number; month: string; capital: number; interest: number; remaining: number; status: string }

const payments: Payment[] = Array.from({ length: 36 }, (_, index) => {
  const capital = 700 + index * 4;
  return {
    id: index + 1, year: 2026 + Math.floor(index / 12), month: `Mois ${(index % 12) + 1}`, capital,
    interest: 560 - index * 3, remaining: 250000 - capital * (index + 1), status: index < 3 ? 'payé' : 'à venir',
  };
});

const columns: LcTableColumn<Payment>[] = [
  { id: 'month', header: 'Échéance', value: (row) => `${row.month} ${row.year}`, sortable: true },
  { id: 'capital', header: 'Capital', value: (row) => row.capital, format: 'money', sortable: true },
  { id: 'interest', header: 'Intérêts', value: (row) => row.interest, format: 'money', sortable: true },
  { id: 'remaining', header: 'Capital restant dû', value: (row) => row.remaining, format: 'money', sortable: true },
  { id: 'status', header: 'Statut', value: (row) => row.status },
];

const sum = (rows: readonly Payment[], key: 'capital' | 'interest') => rows.reduce((total, row) => total + row[key], 0);

const meta: Meta<LcTableComponent<Payment>> = {
  title: 'Données/Tableau',
  component: LcTableComponent,
  decorators: [moduleMetadata({ imports: [LcTableComponent, LcCellDirective, LcDescriptionListComponent, LcKpiCardComponent] })],
};
export default meta;
type Story = StoryObj;

export const Defaut: Story = {
  render: () => ({
    props: { data: payments.slice(0, 12), columns, trackBy: (row: Payment) => row.id },
    template: `<lc-table caption="Échéancier" [data]="data" [columns]="columns" [trackBy]="trackBy" [stickyHeader]="true" />`,
  }),
};

export const GroupesEtTotaux: Story = {
  render: () => ({
    props: {
      data: payments, columns, trackBy: (row: Payment) => row.id,
      grouping: {
        key: (row: Payment) => String(row.year),
        label: (key: string) => `Année ${key}`,
        summary: (rows: readonly Payment[]) => ({ capital: sum(rows, 'capital'), interest: sum(rows, 'interest') }),
      },
      footer: { capital: sum(payments, 'capital'), interest: sum(payments, 'interest') },
    },
    template: `<lc-table caption="Échéancier par année" [data]="data" [columns]="columns" [trackBy]="trackBy" [groupBy]="grouping" [footer]="footer" [stickyHeader]="true">
      <ng-template lcCell="status" let-row><strong>{{ row.status }}</strong></ng-template></lc-table>`,
  }),
};

export const Vide: Story = {
  render: () => ({
    props: { columns, trackBy: (row: Payment) => row.id },
    template: `<lc-table caption="Échéancier" [data]="[]" [columns]="columns" [trackBy]="trackBy" />`,
  }),
};

export const ListeEtIndicateurs: Story = {
  render: () => ({
    template: `<div style="display:grid;gap:16px;max-width:30rem">
      <lc-kpi-card label="Mensualité" [value]="1159.92" format="money" hint="indicatif"
        [delta]="{ value: -2.5, format: 'percent', trend: 'down', sentiment: 'positive' }" />
      <lc-kpi-card label="Point d'équilibre" valueText="7 ans et 4 mois" hint="Dès cette date, acheter devient plus avantageux" />
      <lc-kpi-card label="Équilibre" valueText="Aucun" />
      <lc-description-list [items]="[
        { term: 'Capital emprunté', value: 250000, format: 'money' },
        { term: 'Taux', value: 3.5, format: 'percent', badge: 'estimation' },
        { term: 'Coût total', value: 300000, format: 'money', emphasis: true }]" /></div>`,
  }),
};
