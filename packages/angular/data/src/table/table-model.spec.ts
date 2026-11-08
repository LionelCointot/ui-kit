import { LcTableColumn, buildTableModel, columnAlign, compareValues, nextSort, sortRows } from './table-model';

interface Row { id: number; year: number; label: string; amount: number | null }

const rows: readonly Row[] = [
  { id: 1, year: 2026, label: 'Janvier', amount: 300 },
  { id: 2, year: 2026, label: 'Février', amount: 100 },
  { id: 3, year: 2027, label: 'Mars', amount: null },
  { id: 4, year: 2027, label: 'Avril', amount: 100 },
  { id: 5, year: 2028, label: 'Mai', amount: 250 },
];

const columns: readonly LcTableColumn<Row>[] = [
  { id: 'label', header: 'Mois', value: (row) => row.label, sortable: true },
  { id: 'amount', header: 'Montant', value: (row) => row.amount, format: 'money', sortable: true },
];

const ids = (items: readonly { kind: string; id: string }[]) => items.map((item) => item.id);

describe('compareValues', () => {
  it('compare nombres, textes selon la locale et place les valeurs absentes en dernier', () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues('item 2', 'item 10')).toBeLessThan(0);
    expect(compareValues('Écart', 'zèbre')).toBeLessThan(0);
    expect(compareValues(null, 1)).toBeGreaterThan(0);
    expect(compareValues(1, undefined)).toBeLessThan(0);
    expect(compareValues(null, null)).toBe(0);
  });
});

describe('sortRows', () => {
  it('trie sans modifier la source, de façon stable', () => {
    const sorted = sortRows(rows, columns, { columnId: 'amount', direction: 'asc' });
    expect(sorted.map((row) => row.id)).toEqual([2, 4, 5, 1, 3]);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('garde les valeurs absentes en dernier dans le sens décroissant', () => {
    const sorted = sortRows(rows, columns, { columnId: 'amount', direction: 'desc' });
    expect(sorted.map((row) => row.id)).toEqual([1, 5, 2, 4, 3]);
  });

  it('renvoie les lignes telles quelles sans tri ou pour une colonne inconnue', () => {
    expect(sortRows(rows, columns, null)).toBe(rows);
    expect(sortRows(rows, columns, { columnId: 'inconnue', direction: 'asc' })).toBe(rows);
  });
});

describe('nextSort', () => {
  it('cycle croissant, décroissant, aucun', () => {
    const first = nextSort(null, 'label');
    expect(first).toEqual({ columnId: 'label', direction: 'asc' });
    const second = nextSort(first, 'label');
    expect(second).toEqual({ columnId: 'label', direction: 'desc' });
    expect(nextSort(second, 'label')).toBeNull();
    expect(nextSort(second, 'amount')).toEqual({ columnId: 'amount', direction: 'asc' });
  });
});

describe('columnAlign', () => {
  it('aligne à droite les formats numériques, sauf indication contraire', () => {
    expect(columnAlign(columns[1])).toBe('end');
    expect(columnAlign(columns[0])).toBe('start');
    expect(columnAlign({ ...columns[1], align: 'center' })).toBe('center');
  });
});

describe('buildTableModel', () => {
  const grouping = {
    key: (row: Row) => String(row.year),
    label: (key: string) => `Année ${key}`,
    summary: (group: readonly Row[]) => ({ amount: group.reduce((sum, row) => sum + (row.amount ?? 0), 0) }),
  };

  it('sans groupe : une ligne par donnée, triée', () => {
    const model = buildTableModel({ data: rows, columns, trackBy: (row) => row.id, sort: { columnId: 'label', direction: 'asc' } });
    expect(ids(model.items)).toEqual(['r:4', 'r:2', 'r:1', 'r:5', 'r:3']);
    expect(model.truncated).toBe(false);
    expect(model.shownRows).toBe(5);
  });

  it('groupes repliés par défaut avec sous-totaux, dans l\'ordre de première apparition', () => {
    const model = buildTableModel({ data: rows, columns, trackBy: (row) => row.id, sort: null, grouping });
    expect(ids(model.items)).toEqual(['g:2026', 'g:2027', 'g:2028']);
    const first = model.items[0];
    expect(first.kind === 'group' && first.summary['amount']).toBe(400);
    expect(first.kind === 'group' && first.label).toBe('Année 2026');
    expect(first.kind === 'group' && first.count).toBe(2);
    expect(model.shownRows).toBe(0);
  });

  it('déplie un groupe selon initiallyExpanded ou les bascules, et trie à l\'intérieur des groupes', () => {
    const expandedByDefault = buildTableModel({
      data: rows, columns, trackBy: (row) => row.id, sort: { columnId: 'amount', direction: 'asc' },
      grouping: { ...grouping, initiallyExpanded: true },
    });
    expect(ids(expandedByDefault.items)).toEqual(['g:2026', 'r:2', 'r:1', 'g:2027', 'r:4', 'r:3', 'g:2028', 'r:5']);

    const toggled = buildTableModel({
      data: rows, columns, trackBy: (row) => row.id, sort: null, grouping,
      expandedOverrides: new Map([['2027', true]]),
    });
    expect(ids(toggled.items)).toEqual(['g:2026', 'g:2027', 'r:3', 'r:4', 'g:2028']);

    const collapsed = buildTableModel({
      data: rows, columns, trackBy: (row) => row.id, sort: null,
      grouping: { ...grouping, initiallyExpanded: true }, expandedOverrides: new Map([['2026', false]]),
    });
    expect(ids(collapsed.items).slice(0, 2)).toEqual(['g:2026', 'g:2027']);
  });

  it('limite l\'affichage et le signale', () => {
    const model = buildTableModel({ data: rows, columns, trackBy: (row) => row.id, sort: null, limit: 3 });
    expect(model.items.length).toBe(3);
    expect(model.truncated).toBe(true);
  });
});
