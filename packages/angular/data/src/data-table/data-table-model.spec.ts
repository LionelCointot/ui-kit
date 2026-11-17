import { firstValueFrom } from 'rxjs';
import {
  LcDataColumn, LcTableQuery, cleanFilterValue, dateRangeBounds, filterRows, isDateRangeInverted, isFilterActive, lcLocalSource,
  localDistinct, orderDistinct, withFilter,
} from './data-table-model';

interface Ticket { id: number; state: string; name: string; date: string; urgent: boolean }

const tickets: readonly Ticket[] = [
  { id: 1, state: 'Nouvelle', name: 'Fuite d\'eau', date: '2026-11-17', urgent: true },
  { id: 2, state: 'Qualifiée', name: 'Éclairage du hall', date: '2026-11-11', urgent: false },
  { id: 3, state: 'Nouvelle', name: 'Porte de garage', date: '2026-11-10', urgent: false },
  { id: 4, state: 'Close', name: 'ELECTRICITE cave', date: '2026-10-19', urgent: true },
  { id: 5, state: '', name: 'Interphone', date: '2026-10-18', urgent: false },
];

const columns: readonly LcDataColumn<Ticket>[] = [
  { key: 'name', label: 'Objet', value: (row) => row.name, filter: { type: 'text', label: 'Contient' } },
  { key: 'state', label: 'État', value: (row) => row.state, filter: { type: 'multi' } },
  { key: 'date', label: 'Reçue le', value: (row) => row.date, filter: { type: 'dateRange' } },
  {
    key: 'urgent', label: 'Urgence', value: (row) => (row.urgent ? 'oui' : 'non'),
    filter: { type: 'single', options: [{ value: 'urgent', label: 'Urgentes', match: (row) => row.urgent }, { value: 'non', label: 'Non urgentes' }] },
  },
];

/** Mardi 17 novembre 2026, midi heure locale. */
const TODAY = new Date(2026, 10, 17, 12);
const ids = (rows: readonly Ticket[]) => rows.map((row) => row.id);
const query = (filters: LcTableQuery['filters']): LcTableQuery => ({ filters, sort: null });

describe('data-table-model : filtrage local par type', () => {
  it('CA-5 multi : garde les lignes dont la valeur est cochée, valeur vide comprise', () => {
    expect(ids(filterRows(tickets, columns, { state: ['Nouvelle'] }, undefined, TODAY))).toEqual([1, 3]);
    expect(ids(filterRows(tickets, columns, { state: ['Close', ''] }, undefined, TODAY))).toEqual([4, 5]);
  });

  it('CA-9 text : inclusion sans accents ni casse, espaces de bord ignorés', () => {
    expect(ids(filterRows(tickets, columns, { name: '  électricité ' }, undefined, TODAY))).toEqual([4]);
    expect(ids(filterRows(tickets, columns, { name: 'ECLAIR' }, undefined, TODAY))).toEqual([2]);
    expect(ids(filterRows(tickets, columns, { name: 'E' }, undefined, TODAY))).toEqual([1, 2, 3, 4, 5]);
  });

  it('CA-10 single : `match` de l\'option, sinon égalité de valeur', () => {
    expect(ids(filterRows(tickets, columns, { urgent: 'urgent' }, undefined, TODAY))).toEqual([1, 4]);
    expect(ids(filterRows(tickets, columns, { urgent: 'non' }, undefined, TODAY))).toEqual([2, 3, 5]);
  });

  it('CA-8 dateRange : bornes incluses, borne absente non limitante', () => {
    expect(ids(filterRows(tickets, columns, { date: { from: '2026-11-10', to: '2026-11-11' } }, undefined, TODAY))).toEqual([2, 3]);
    expect(ids(filterRows(tickets, columns, { date: { from: '2026-11-11' } }, undefined, TODAY))).toEqual([1, 2]);
    expect(ids(filterRows(tickets, columns, { date: { to: '2026-10-19' } }, undefined, TODAY))).toEqual([4, 5]);
  });

  it('CA-8 raccourcis : 7 jours = du 11 au 17 novembre, 30 jours = du 19 octobre au 17 novembre (aujourd\'hui compris)', () => {
    expect(dateRangeBounds({ preset: 7 }, TODAY)).toEqual({ from: '2026-11-11', to: '2026-11-17' });
    expect(dateRangeBounds({ preset: 30 }, TODAY)).toEqual({ from: '2026-10-19', to: '2026-11-17' });
    expect(ids(filterRows(tickets, columns, { date: { preset: 7 } }, undefined, TODAY))).toEqual([1, 2]);
    expect(ids(filterRows(tickets, columns, { date: { preset: 30 } }, undefined, TODAY))).toEqual([1, 2, 3, 4]);
  });

  it('CA-8 raccourcis avec l\'horloge simulée (source locale, date du jour par défaut)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 12, 9));
    try {
      const page = await firstValueFrom(lcLocalSource(tickets, columns).rows(query({ date: { preset: 7 } })));
      // Du 6 au 12 novembre : seules les demandes du 10 et du 11.
      expect(ids(page.rows)).toEqual([2, 3]);
      expect(page.total).toBe(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it('filtres combinés : intersection ; filtre inactif ignoré', () => {
    expect(ids(filterRows(tickets, columns, { state: ['Nouvelle', 'Close'], urgent: 'urgent' }, undefined, TODAY))).toEqual([1, 4]);
    expect(ids(filterRows(tickets, columns, { state: [], name: '  ' }, undefined, TODAY))).toEqual([1, 2, 3, 4, 5]);
  });

  it('CA-8 période inversée détectée (pas pour un raccourci)', () => {
    expect(isDateRangeInverted({ from: '2026-11-10', to: '2026-11-01' })).toBe(true);
    expect(isDateRangeInverted({ from: '2026-11-01', to: '2026-11-10' })).toBe(false);
    expect(isDateRangeInverted({ from: '2026-11-10' })).toBe(false);
    expect(isDateRangeInverted({ preset: 7, from: '2026-11-10', to: '2026-11-01' })).toBe(false);
  });
});

describe('data-table-model : valeurs distinctes', () => {
  it('CA-5 : `distinct` ignore le filtre de sa propre colonne mais applique les autres', () => {
    const q = query({ state: ['Close'], urgent: 'non' });
    // Non urgentes : 2 Qualifiée, 3 Nouvelle, 5 vide ; le filtre État (Close) n'est pas appliqué.
    const values = localDistinct(tickets, columns, 'state', q, TODAY);
    expect([...values].sort((a, b) => a.value.localeCompare(b.value))).toEqual([
      { value: '', count: 1 }, { value: 'Nouvelle', count: 1 }, { value: 'Qualifiée', count: 1 },
    ]);
  });

  it('CA-5 : comptes sans autre filtre', async () => {
    const values = await firstValueFrom(lcLocalSource(tickets, columns, () => TODAY).distinct('state', query({ state: ['Close'] })));
    const counts = Object.fromEntries(values.map((entry) => [entry.value, entry.count]));
    expect(counts).toEqual({ Nouvelle: 2, Qualifiée: 1, Close: 1, '': 1 });
  });

  it('colonne inconnue : liste vide ; `format` fournit le libellé', () => {
    expect(localDistinct(tickets, columns, 'nope', query({}), TODAY)).toEqual([]);
    const formatted: LcDataColumn<Ticket>[] = [{ key: 'state', label: 'État', value: (row) => row.state, filter: { type: 'multi', format: (v) => v.toUpperCase() } }];
    expect(localDistinct(tickets, formatted, 'state', query({}), TODAY).find((entry) => entry.value === 'Close')?.label).toBe('CLOSE');
  });

  it('ordre : vide d\'abord puis alphabétique des libellés (accents, casse, nombres)', () => {
    const ordered = orderDistinct([
      { value: 'b', label: 'Zèbre', count: 1 }, { value: 'x10', count: 1 }, { value: '', count: 2 }, { value: 'a', label: 'éclair', count: 1 }, { value: 'x9', count: 1 },
    ]);
    expect(ordered.map((entry) => entry.value)).toEqual(['', 'a', 'x9', 'x10', 'b']);
  });

  it('ordre imposé par `order`, valeurs inconnues à la fin', () => {
    const ordered = orderDistinct([{ value: 'Close', count: 1 }, { value: 'Zz', count: 1 }, { value: 'Nouvelle', count: 1 }, { value: 'Aa', count: 1 }], ['Nouvelle', 'Close']);
    expect(ordered.map((entry) => entry.value)).toEqual(['Nouvelle', 'Close', 'Aa', 'Zz']);
  });
});

describe('data-table-model : requête', () => {
  it('isFilterActive : vide, blanc, période sans borne inactifs', () => {
    expect(isFilterActive(undefined)).toBe(false);
    expect(isFilterActive([])).toBe(false);
    expect(isFilterActive('   ')).toBe(false);
    expect(isFilterActive({})).toBe(false);
    expect(isFilterActive({ from: '', to: '' })).toBe(false);
    expect(isFilterActive(['a'])).toBe(true);
    expect(isFilterActive('a')).toBe(true);
    expect(isFilterActive({ preset: 7 })).toBe(true);
    expect(isFilterActive({ to: '2026-01-01' })).toBe(true);
  });

  it('cleanFilterValue : texte rogné, raccourci réduit à `preset`, bornes vides retirées', () => {
    expect(cleanFilterValue('  abc ')).toBe('abc');
    expect(cleanFilterValue({ preset: 30, from: '2026-01-01', to: '2026-01-30' })).toEqual({ preset: 30 });
    expect(cleanFilterValue({ from: '2026-01-01', to: '' })).toEqual({ from: '2026-01-01' });
    expect(cleanFilterValue([])).toBeUndefined();
  });

  it('withFilter : remplace, retire une valeur vide, ne modifie pas la requête d\'origine', () => {
    const start: LcTableQuery = { filters: { state: ['Close'], name: 'x' }, sort: { columnId: 'date', direction: 'desc' } };
    const next = withFilter(start, 'state', ['Nouvelle']);
    expect(next).toEqual({ filters: { state: ['Nouvelle'], name: 'x' }, sort: { columnId: 'date', direction: 'desc' } });
    expect(withFilter(next, 'name', '  ').filters).toEqual({ state: ['Nouvelle'] });
    expect(withFilter(next, 'state', undefined).filters).toEqual({ name: 'x' });
    expect(start.filters).toEqual({ state: ['Close'], name: 'x' });
  });

  it('source locale : tri après filtrage, total sans filtre', async () => {
    const page = await firstValueFrom(lcLocalSource(tickets, columns, () => TODAY).rows({ filters: { urgent: 'non' }, sort: { columnId: 'date', direction: 'asc' } }));
    expect(ids(page.rows)).toEqual([5, 3, 2]);
    expect(page.total).toBe(5);
  });
});
