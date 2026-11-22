import type { LcValueFormat } from '@lionelcointot/ui-angular';
import { LcTableColumn } from './table-model';
import { ariaSort, cellClass, cellText, sortDirection, sortIcon } from './table-shared';

const column: LcTableColumn<{ amount: number }> = {
  id: 'amount',
  header: 'Montant',
  value: (row) => row.amount,
  format: 'money',
  sortable: true,
};
const rows = [{ amount: 300 }];

describe('aides communes aux tableaux', () => {
  it('cellClass : alignement et colonne collée', () => {
    expect(cellClass(column)).toBe('lc-table__cell lc-table__cell--end');
    expect(cellClass({ ...column, format: 'text', sticky: 'start' })).toBe(
      'lc-table__cell lc-table__cell--start lc-table__cell--sticky-start',
    );
  });

  it('sortDirection : direction de la colonne triée seulement', () => {
    expect(sortDirection({ columnId: 'amount', direction: 'desc' }, 'amount')).toBe('desc');
    expect(sortDirection({ columnId: 'amount', direction: 'desc' }, 'other')).toBeNull();
    expect(sortDirection(null, 'amount')).toBeNull();
  });

  it('ariaSort : seulement pour la colonne triée', () => {
    expect(ariaSort(null)).toBeNull();
    expect(ariaSort('asc')).toBe('ascending');
    expect(ariaSort('desc')).toBe('descending');
  });

  it('sortIcon : une icône pour « sans tri », une paire pour croissant et décroissant', () => {
    expect([sortIcon(null), sortIcon('asc'), sortIcon('desc')]).toEqual([
      'arrow-up-down',
      'arrow-up',
      'arrow-down',
    ]);
  });

  it('cellText : formate la valeur de la colonne, vide sans accesseur', () => {
    const seen: unknown[] = [];
    const formatter = {
      format: (value: unknown, format?: LcValueFormat) => (
        seen.push(value),
        `${String(format)}:${value}`
      ),
    };
    expect(cellText(formatter, column, rows[0])).toBe('money:300');
    cellText(formatter, {}, rows[0]);
    expect(seen.at(-1)).toBeUndefined();
  });
});
