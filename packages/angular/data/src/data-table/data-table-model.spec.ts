import { firstValueFrom } from 'rxjs';
import {
  LcDataColumn, LcTableQuery, cleanFilterValue, filterRows, fromDateInterval, isDateRangeInverted, isFilterActive, lcLocalSource, toDateInterval,
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

const ids = (rows: readonly Ticket[]) => rows.map((row) => row.id);
const query = (filters: LcTableQuery['filters']): LcTableQuery => ({ filters, sort: null });

describe('data-table-model : filtrage local par type', () => {
  it('CA-5 multi : garde les lignes dont la valeur est cochée, valeur vide comprise', () => {
    expect(ids(filterRows(tickets, columns, { state: ['Nouvelle'] }, undefined))).toEqual([1, 3]);
    expect(ids(filterRows(tickets, columns, { state: ['Close', ''] }, undefined))).toEqual([4, 5]);
  });

  it('CA-9 text : inclusion sans accents ni casse, espaces de bord ignorés', () => {
    expect(ids(filterRows(tickets, columns, { name: '  électricité ' }, undefined))).toEqual([4]);
    expect(ids(filterRows(tickets, columns, { name: 'ECLAIR' }, undefined))).toEqual([2]);
    expect(ids(filterRows(tickets, columns, { name: 'E' }, undefined))).toEqual([1, 2, 3, 4, 5]);
  });

  it('CA-10 single : `match` de l\'option, sinon égalité de valeur', () => {
    expect(ids(filterRows(tickets, columns, { urgent: 'urgent' }, undefined))).toEqual([1, 4]);
    expect(ids(filterRows(tickets, columns, { urgent: 'non' }, undefined))).toEqual([2, 3, 5]);
  });

  it('CA-8 dateRange : bornes incluses, borne absente non limitante', () => {
    expect(ids(filterRows(tickets, columns, { date: { from: '2026-11-10', to: '2026-11-11' } }, undefined))).toEqual([2, 3]);
    expect(ids(filterRows(tickets, columns, { date: { from: '2026-11-11' } }, undefined))).toEqual([1, 2]);
    expect(ids(filterRows(tickets, columns, { date: { to: '2026-10-19' } }, undefined))).toEqual([4, 5]);
  });

  it('filtres combinés : intersection ; filtre inactif ignoré', () => {
    expect(ids(filterRows(tickets, columns, { state: ['Nouvelle', 'Close'], urgent: 'urgent' }, undefined))).toEqual([1, 4]);
    expect(ids(filterRows(tickets, columns, { state: [], name: '  ' }, undefined))).toEqual([1, 2, 3, 4, 5]);
  });

  it('CA-8 période inversée détectée', () => {
    expect(isDateRangeInverted({ from: '2026-11-10', to: '2026-11-01' })).toBe(true);
    expect(isDateRangeInverted({ from: '2026-11-01', to: '2026-11-10' })).toBe(false);
    expect(isDateRangeInverted({ from: '2026-11-10' })).toBe(false);
  });
});

describe('data-table-model : valeurs distinctes', () => {
  it('CA-5 : `distinct` ignore le filtre de sa propre colonne mais applique les autres', () => {
    const q = query({ state: ['Close'], urgent: 'non' });
    // Non urgentes : 2 Qualifiée, 3 Nouvelle, 5 vide ; le filtre État (Close) n'est pas appliqué.
    const values = localDistinct(tickets, columns, 'state', q);
    expect([...values].sort((a, b) => a.value.localeCompare(b.value))).toEqual([
      { value: '', count: 1 }, { value: 'Nouvelle', count: 1 }, { value: 'Qualifiée', count: 1 },
    ]);
  });

  it('CA-5 : comptes sans autre filtre', async () => {
    const values = await firstValueFrom(lcLocalSource(tickets, columns).distinct('state', query({ state: ['Close'] })));
    const counts = Object.fromEntries(values.map((entry) => [entry.value, entry.count]));
    expect(counts).toEqual({ Nouvelle: 2, Qualifiée: 1, Close: 1, '': 1 });
  });

  it('colonne inconnue : liste vide ; `format` fournit le libellé', () => {
    expect(localDistinct(tickets, columns, 'nope', query({}))).toEqual([]);
    const formatted: LcDataColumn<Ticket>[] = [{ key: 'state', label: 'État', value: (row) => row.state, filter: { type: 'multi', format: (v) => v.toUpperCase() } }];
    expect(localDistinct(tickets, formatted, 'state', query({})).find((entry) => entry.value === 'Close')?.label).toBe('CLOSE');
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
    expect(isFilterActive({ to: '2026-01-01' })).toBe(true);
  });

  it('cleanFilterValue : texte rogné, bornes vides retirées', () => {
    expect(cleanFilterValue('  abc ')).toBe('abc');
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
    const page = await firstValueFrom(lcLocalSource(tickets, columns).rows({ filters: { urgent: 'non' }, sort: { columnId: 'date', direction: 'asc' } }));
    expect(ids(page.rows)).toEqual([5, 3, 2]);
    expect(page.total).toBe(5);
  });
});

describe('data-table-model : adaptateur LcDateRange <-> LcDateInterval', () => {
  it('toDateInterval : vide, début seul, fin seule, complète', () => {
    expect(toDateInterval({})).toEqual({ from: null, to: null });
    expect(toDateInterval({ from: '2026-11-03' })).toEqual({ from: '2026-11-03', to: null });
    expect(toDateInterval({ to: '2026-11-04' })).toEqual({ from: null, to: '2026-11-04' });
    expect(toDateInterval({ from: '2026-11-03', to: '2026-11-04' })).toEqual({ from: '2026-11-03', to: '2026-11-04' });
  });

  it('fromDateInterval : sans clé `null`, deux dates effacées donnent {}', () => {
    expect(fromDateInterval({ from: '2026-11-03', to: null })).toEqual({ from: '2026-11-03' });
    expect(fromDateInterval({ from: null, to: '2026-11-04' })).toEqual({ to: '2026-11-04' });
    expect(fromDateInterval({ from: '2026-11-03', to: '2026-11-04' })).toEqual({ from: '2026-11-03', to: '2026-11-04' });
    expect(fromDateInterval({ from: null, to: null })).toEqual({});
    expect(cleanFilterValue(fromDateInterval({ from: null, to: null }))).toBeUndefined();
  });

  it('pas de boucle d\'écho : saisie, écho de la valeur, saisie rend le même objet au champ', () => {
    const typed = { from: '2026-11-03', to: null };
    const echoed = toDateInterval(fromDateInterval(typed), typed);
    expect(echoed).toBe(typed);
    const next = { from: '2026-11-03', to: '2026-11-04' };
    expect(toDateInterval(fromDateInterval(next), echoed)).not.toBe(echoed);
    expect(toDateInterval(fromDateInterval(next), next)).toBe(next);
  });
});
