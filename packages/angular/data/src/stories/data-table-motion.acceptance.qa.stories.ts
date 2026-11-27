import { Component, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcDataTableComponent, type LcDataColumn, type LcTableQuery } from '@lionelcointot/ui-angular/data';

interface Row { id: number; name: string; cat: string; zone: string; date: string }
const ROWS: readonly Row[] = Array.from({ length: 14 }, (_, i) => ({ id: i + 1, name: `Demande ${i + 1}`, cat: i % 4 === 0 ? 'Alpha' : 'Beta', zone: i % 2 === 0 ? 'Nord' : 'Sud', date: `2026-11-${String(i + 1).padStart(2, '0')}` }));
const COLUMNS: readonly LcDataColumn<Row>[] = [
  { key: 'name', label: 'Objet', sortable: true, value: (row) => row.name },
  { key: 'cat', label: 'Catégorie', value: (row) => row.cat, filter: { type: 'multi' } },
  { key: 'zone', label: 'Zone', value: (row) => row.zone, filter: { type: 'multi' } },
  { key: 'date', label: 'Reçue le', value: (row) => row.date, filter: { type: 'dateRange' } },
];

/** Preuve Chromium du mouvement (specs 2026-11-mouvement T6 et 2026-12-mouvement-v2 T7) : 14 lignes ; `place: bottom` pousse le tableau en bas de l'écran (menu au-dessus). Émissions dans `window.__emitted`.
 *  `#qa-remove` (T7, CA-26) retire « Demande 5 » de la source (nouveau tableau, liste immuable) ; le bouton est hors flux pour ne pas déplacer le tableau. */
@Component({
  selector: 'lc-qa-motion-table',
  imports: [LcDataTableComponent],
  template: `
    <button id="qa-remove" type="button" style="position: fixed; inset-block-start: 0; inset-inline-end: 0" (click)="remove()">Retirer la demande 5</button>
    @if (place() === 'bottom') { <div style="block-size: 75vh"></div> }
    <lc-data-table caption="Demandes" [source]="rows()" [columns]="columns" [trackBy]="trackBy" (queryChange)="emit($event)" />`,
})
class MotionTableComponent {
  readonly place = input<'top' | 'bottom'>('top');
  protected readonly rows = signal<readonly Row[]>(ROWS);
  protected remove(): void { this.rows.set(this.rows().filter((row) => row.id !== 5)); }
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
