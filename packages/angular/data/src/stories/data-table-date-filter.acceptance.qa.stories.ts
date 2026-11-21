import { Component } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcDataTableComponent, type LcDataColumn, type LcTableQuery } from '@lionelcointot/ui-angular/data';

interface Row { id: number; name: string; date: string }
const ROWS: readonly Row[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Demande ${i + 1}`, date: `2026-11-${String(i + 1).padStart(2, '0')}` }));
const COLUMNS: readonly LcDataColumn<Row>[] = [
  { key: 'name', label: 'Objet', value: (row) => row.name },
  { key: 'date', label: 'Reçue le', value: (row) => row.date, filter: { type: 'dateRange' } },
];

/** Preuve Chromium (CA-P5, CA-P10b) : mode `auto` du kit (aucun LC_DATE_PICKER fourni) ; les émissions sont lues dans `window.__emitted`. */
@Component({
  selector: 'lc-qa-filter-date',
  imports: [LcDataTableComponent],
  template: `<lc-data-table caption="Demandes" [source]="rows" [columns]="columns" [trackBy]="trackBy" (queryChange)="emit($event)" />`,
})
class FilterDateComponent {
  protected readonly rows = ROWS;
  protected readonly columns = COLUMNS;
  protected readonly trackBy = (row: Row) => row.id;
  protected emit(query: LcTableQuery): void {
    ((window as unknown as { __emitted?: LcTableQuery[] }).__emitted ??= []).push(query);
  }
}

const meta: Meta = {
  title: 'QA/Data/Date filter of the table',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [FilterDateComponent] })],
  render: () => ({ template: '<lc-qa-filter-date />' }),
};
export default meta;

export const FiltreDePeriode: StoryObj = {};
