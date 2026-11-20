import { Component, computed, signal } from '@angular/core';
import { fixedExample } from '@lc/storybook';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcPaginatorComponent } from '../paginator/paginator.component';
import { lcPageSlice } from '../paginator/page-slice';
import { LcTableComponent } from '../table/table.component';
import type { LcTableColumn } from '../table/table-model';

interface Entry { id: number; name: string; load: number }

const entries: Entry[] = Array.from({ length: 120 }, (_, index) => ({ id: index + 1, name: `Tâche ${index + 1}`, load: (index * 7) % 100 }));
const columns: LcTableColumn<Entry>[] = [
  { id: 'name', header: 'Nom', value: (row) => row.name },
  { id: 'load', header: 'Charge (%)', value: (row) => row.load, format: 'integer' },
];

/** 120 tasks sliced by `lcPageSlice`, with a page size choice. */
@Component({
  selector: 'lc-paginator-demo',
  imports: [LcPaginatorComponent, LcTableComponent],
  template: `
    <lc-table caption="Tâches" [data]="visible()" [columns]="columns" [trackBy]="trackBy" />
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

/**
 * Pagination bar: previous and next buttons, page position and an optional page size choice.
 * `page` and `pageSize` are two-way (`model`); the page is clamped to the valid range. Use `lcPageSlice` to cut a list for the current page.
 *
 * Import: `import { LcPaginatorComponent, lcPageSlice } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<LcPaginatorComponent> = {
  title: 'Data/Paginator',
  component: LcPaginatorComponent,
  decorators: [moduleMetadata({ imports: [LcPaginatorComponent, PaginatorDemoComponent] })],
  args: { total: 120, pageSize: 25, page: 1, pageSizes: [10, 25, 50], ariaLabel: 'Pagination des tâches' },
  argTypes: { pageSizes: { control: 'object' }, total: { control: { type: 'number', min: 0 } } },
};
export default meta;
type Story = StoryObj<LcPaginatorComponent>;

/** Every input is bound: change them in the Controls panel. An empty `pageSizes` hides the page size choice. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-paginator [total]="total" [(page)]="page" [(pageSize)]="pageSize" [pageSizes]="pageSizes" [ariaLabel]="ariaLabel" />`,
  }),
};

/** Without a page size choice: `pageSizes` left empty. */
export const WithoutPageSizes: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-paginator [total]="120" [pageSize]="25" />` }),
};

/** Positioned on the last page: the next button is disabled. */
export const LastPage: Story = {
  parameters: fixedExample,
  render: () => ({ props: { page: 5 }, template: `<lc-paginator [total]="120" [pageSize]="25" [(page)]="page" [pageSizes]="[10, 25, 50]" />` }),
};

/** No item: nothing to page through. */
export const Empty: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-paginator [total]="0" />` }),
};

/** Fewer items than a page: a single page. */
export const SinglePage: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-paginator [total]="12" />` }),
};

/** Real list: a table sliced by `lcPageSlice`, page clamped and focus kept at the bounds. */
export const WithTable: Story = {
  parameters: fixedExample,
  render: () => ({ template: '<lc-paginator-demo />' }),
};
