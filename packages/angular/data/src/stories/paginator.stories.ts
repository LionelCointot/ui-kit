import { Component, computed, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcPaginatorComponent } from '../paginator/paginator.component';
import { lcPageSlice } from '../paginator/page-slice';
import { LcTableComponent } from '../table/table.component';
import type { LcTableColumn } from '../table/table-model';

interface Entry { id: number; name: string; load: number }

const entries: Entry[] = Array.from({ length: 120 }, (_, index) => ({ id: index + 1, name: `Élément ${index + 1}`, load: (index * 7) % 100 }));
const columns: LcTableColumn<Entry>[] = [
  { id: 'name', header: 'Nom', value: (row) => row.name },
  { id: 'load', header: 'Charge (%)', value: (row) => row.load, format: 'integer' },
];

/** Liste de 120 éléments découpée par `lcPageSlice`, avec choix de la taille de page. */
@Component({
  selector: 'lc-paginator-demo',
  imports: [LcPaginatorComponent, LcTableComponent],
  template: `
    <lc-table caption="Éléments" [data]="visible()" [columns]="columns" [trackBy]="trackBy" />
    <lc-paginator [total]="entries.length" [(page)]="page" [(pageSize)]="pageSize" [pageSizes]="[10, 25, 50]" />
  `,
})
class PaginatorDemoComponent {
  protected readonly entries = entries;
  protected readonly columns = columns;
  protected readonly trackBy = (row: Entry) => row.id;
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly visible = computed(() => lcPageSlice(entries, this.page(), this.pageSize()));
}

const meta: Meta<LcPaginatorComponent> = {
  title: 'Données/Pagination',
  component: LcPaginatorComponent,
  decorators: [moduleMetadata({ imports: [LcPaginatorComponent, PaginatorDemoComponent] })],
  args: { total: 120, pageSize: 25, page: 1, pageSizes: [] },
};
export default meta;
type Story = StoryObj<LcPaginatorComponent>;

export const Defaut: Story = {};

export const AvecTaillesDePage: Story = {
  args: { pageSizes: [10, 25, 50] },
};

export const DernierePage: Story = {
  args: { page: 5 },
};

export const Vide: Story = {
  args: { total: 0 },
};

export const PageUnique: Story = {
  args: { total: 12 },
};

/** Liste réelle : tableau découpé par `lcPageSlice`, page recadrée et focus conservé aux bornes. */
export const AvecTableau: Story = {
  render: () => ({ template: '<lc-paginator-demo />' }),
};
