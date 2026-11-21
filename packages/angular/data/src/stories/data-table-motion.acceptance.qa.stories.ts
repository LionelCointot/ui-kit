import { Component, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcDataTableComponent, type LcDataColumn, type LcTableQuery } from '@lionelcointot/ui-angular/data';

interface Row { id: number; name: string; cat: string; zone: string; date: string }
const ROWS: readonly Row[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Demande ${i + 1}`, cat: i % 3 === 0 ? 'Alpha' : 'Beta', zone: i % 2 === 0 ? 'Nord' : 'Sud', date: `2026-11-${String(i + 1).padStart(2, '0')}` }));
const COLUMNS: readonly LcDataColumn<Row>[] = [
  { key: 'name', label: 'Objet', sortable: true, value: (row) => row.name },
  { key: 'cat', label: 'Catégorie', value: (row) => row.cat, filter: { type: 'multi' } },
  { key: 'zone', label: 'Zone', value: (row) => row.zone, filter: { type: 'multi' } },
  { key: 'date', label: 'Reçue le', value: (row) => row.date, filter: { type: 'dateRange' } },
];

/** Preuve Chromium du mouvement (spec 2026-11-mouvement, T6) : 12 lignes (cascade 1 à 8, puis rien) ; `place: bottom` pousse le tableau en bas de l'écran (menu au-dessus). Émissions dans `window.__emitted`. */
@Component({
  selector: 'lc-qa-motion-table',
  imports: [LcDataTableComponent],
  template: `
    @if (place() === 'bottom') { <div style="block-size: 75vh"></div> }
    <lc-data-table caption="Demandes" [source]="rows" [columns]="columns" [trackBy]="trackBy" (queryChange)="emit($event)" />`,
})
class MotionTableComponent {
  readonly place = input<'top' | 'bottom'>('top');
  protected readonly rows = ROWS;
  protected readonly columns = COLUMNS;
  protected readonly trackBy = (row: Row) => row.id;
  protected emit(query: LcTableQuery): void {
    ((window as unknown as { __emitted?: LcTableQuery[] }).__emitted ??= []).push(query);
  }
}

const meta: Meta = {
  title: 'QA/Motion/Data table',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [MotionTableComponent] })],
  argTypes: { place: { control: 'inline-radio', options: ['top', 'bottom'] } },
  args: { place: 'top' },
  render: (args) => ({ props: args, template: '<lc-qa-motion-table [place]="place" />' }),
};
export default meta;

export const Table: StoryObj = {};
