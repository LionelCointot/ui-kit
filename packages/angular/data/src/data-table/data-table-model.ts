import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { localDateToIso, type LcValueFormat } from '@lionelcointot/ui-angular';
import { LcSort, LcTableColumn, sortRows } from '../table/table-model';

/** Période (dates ISO « AAAA-MM-JJ », incluses) ou raccourci « N derniers jours » (aujourd'hui compris). */
export interface LcDateRange {
  readonly preset?: number;
  readonly from?: string;
  readonly to?: string;
}

/** Valeur d'un filtre : liste (`multi`), texte (`text`, `single`) ou période (`dateRange`). */
export type LcFilterValue = readonly string[] | string | LcDateRange;

export interface LcTableQuery {
  readonly filters: Readonly<Record<string, LcFilterValue>>;
  readonly sort: LcSort | null;
}

export interface LcFilterOption<T> {
  readonly value: string;
  readonly label: string;
  /** Données locales : la ligne correspond-elle à ce choix ? Défaut : valeur de la colonne égale à `value`. */
  readonly match?: (row: T) => boolean;
}

export type LcColumnFilter<T> =
  | { readonly type: 'multi'; readonly format?: (value: string) => string; readonly icon?: (value: string) => string | null; readonly order?: readonly string[] }
  | { readonly type: 'dateRange'; readonly presets?: readonly number[] }
  | { readonly type: 'text'; readonly label: string; readonly hint?: string }
  | { readonly type: 'single'; readonly options: readonly LcFilterOption<T>[] };

export interface LcDataColumn<T> {
  readonly key: string;
  readonly label: string;
  /** Valeur de la cellule : texte par défaut, tri et filtres des données locales. */
  readonly value?: (row: T) => unknown;
  readonly format?: LcValueFormat;
  readonly align?: 'start' | 'center' | 'end';
  /** Largeur fixe (ex. '7rem'). La colonne sans `width` prend le reste. */
  readonly width?: string;
  /** Largeur minimale d'une colonne sans `width` : sous la somme des largeurs, le tableau défile dans sa zone. */
  readonly minWidth?: string;
  /** Colonne affichée seulement en cartes (sous 768 px), sans étiquette : pour une action (« Voir la demande »). */
  readonly cardOnly?: boolean;
  readonly sortable?: boolean;
  /** Libellé court de la pastille (défaut `label`). */
  readonly chipLabel?: string;
  readonly filter?: LcColumnFilter<T>;
}

export interface LcDistinctValue {
  readonly value: string;
  readonly label?: string;
  readonly count: number;
}

export interface LcPage<T> {
  readonly rows: readonly T[];
  /** Nombre de lignes sans aucun filtre (« 5 sur 22 »). */
  readonly total: number;
}

/** Source de données serveur : une fonction pour les lignes, une pour les valeurs distinctes d'une colonne. */
export interface LcDataSource<T> {
  rows(query: LcTableQuery): Observable<LcPage<T>>;
  /** Valeurs distinctes de `column` et leur nombre ; `query` ne contient pas le filtre de `column`. */
  distinct(column: string, query: LcTableQuery): Observable<readonly LcDistinctValue[]>;
}

export const LC_EMPTY_QUERY: LcTableQuery = { filters: {}, sort: null };
export const LC_DEFAULT_DATE_PRESETS: readonly number[] = [7, 30];

export function isDateRange(value: LcFilterValue | undefined): value is LcDateRange {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Vrai si le filtre restreint réellement les lignes. */
export function isFilterActive(value: LcFilterValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (isDateRange(value)) return !!(value.preset || value.from || value.to);
  return value.length > 0;
}

/** Bornes ISO d'une période ; un raccourci de N jours finit aujourd'hui et commence N - 1 jours avant. */
export function dateRangeBounds(range: LcDateRange, today: Date = new Date()): { from: string; to: string } {
  if (range.preset) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (range.preset - 1));
    return { from: localDateToIso(start), to: localDateToIso(today) };
  }
  return { from: range.from ?? '', to: range.to ?? '' };
}

/** Vrai si la fin de la période est avant son début. */
export function isDateRangeInverted(range: LcDateRange | undefined): boolean {
  return !!range && !range.preset && !!range.from && !!range.to && range.to < range.from;
}

/** Texte sans accents ni casse, pour les recherches. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Valeur de filtre normalisée : `undefined` si elle ne filtre rien ; un raccourci de dates ne garde que `preset`. */
export function cleanFilterValue(value: LcFilterValue | undefined): LcFilterValue | undefined {
  if (!isFilterActive(value)) return undefined;
  if (typeof value === 'string') return value.trim();
  if (isDateRange(value)) {
    if (value.preset) return { preset: value.preset };
    return { ...(value.from ? { from: value.from } : {}), ...(value.to ? { to: value.to } : {}) };
  }
  return value;
}

/** Requête avec un filtre remplacé (ou retiré si `value` ne filtre rien). */
export function withFilter(query: LcTableQuery, key: string, value: LcFilterValue | undefined): LcTableQuery {
  const filters = { ...query.filters };
  const clean = cleanFilterValue(value);
  if (clean === undefined) delete filters[key];
  else filters[key] = clean;
  return { ...query, filters };
}

const cellString = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

function cellIsoDate(value: unknown): string {
  if (value instanceof Date) return localDateToIso(value);
  return cellString(value).slice(0, 10);
}

/** Données locales : la ligne passe-t-elle le filtre de cette colonne ? */
export function matchesFilter<T>(row: T, column: LcDataColumn<T>, value: LcFilterValue, today: Date = new Date()): boolean {
  const filter = column.filter;
  if (!filter || !isFilterActive(value)) return true;
  const cell = column.value?.(row);
  switch (filter.type) {
    case 'multi':
      return (value as readonly string[]).includes(cellString(cell));
    case 'text':
      return normalizeText(cellString(cell)).includes(normalizeText(value as string));
    case 'single': {
      const option = filter.options.find((candidate) => candidate.value === value);
      return option?.match ? option.match(row) : cellString(cell) === value;
    }
    case 'dateRange': {
      const { from, to } = dateRangeBounds(value as LcDateRange, today);
      const date = cellIsoDate(cell);
      return !!date && (!from || date >= from) && (!to || date <= to);
    }
  }
}

/** Données locales : lignes qui passent tous les filtres (sauf celui de `except`). */
export function filterRows<T>(
  rows: readonly T[], columns: readonly LcDataColumn<T>[], filters: LcTableQuery['filters'], except?: string, today: Date = new Date(),
): readonly T[] {
  const active = columns.filter((column) => column.key !== except && column.filter && isFilterActive(filters[column.key]));
  if (!active.length) return rows;
  return rows.filter((row) => active.every((column) => matchesFilter(row, column, filters[column.key], today)));
}

/** Tri des lignes selon une colonne (valeurs absentes en dernier, ordre d'origine à égalité). */
export function sortDataRows<T>(rows: readonly T[], columns: readonly LcDataColumn<T>[], sort: LcSort | null): readonly T[] {
  const tableColumns: LcTableColumn<T>[] = columns.map((column) => ({ id: column.key, header: column.label, value: column.value ?? (() => undefined) }));
  return sortRows(rows, tableColumns, sort);
}

/**
 * Ordre d'affichage des valeurs distinctes : `order` de la colonne s'il est fourni (valeurs inconnues à la fin),
 * sinon valeur vide d'abord, puis ordre alphabétique des libellés.
 */
export function orderDistinct(values: readonly LcDistinctValue[], order?: readonly string[]): readonly LcDistinctValue[] {
  const rank = (value: string) => {
    const index = order?.indexOf(value) ?? -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...values].sort((a, b) => {
    if (order) return rank(a.value) - rank(b.value) || a.value.localeCompare(b.value);
    if (a.value === '' || b.value === '') return a.value === '' ? (b.value === '' ? 0 : -1) : 1;
    return (a.label ?? a.value).localeCompare(b.label ?? b.value, undefined, { sensitivity: 'base', numeric: true });
  });
}

/** Données locales : valeurs distinctes d'une colonne et leur nombre, compte tenu des autres filtres seulement. */
export function localDistinct<T>(
  rows: readonly T[], columns: readonly LcDataColumn<T>[], key: string, query: LcTableQuery, today: Date = new Date(),
): readonly LcDistinctValue[] {
  const column = columns.find((candidate) => candidate.key === key);
  if (!column) return [];
  const counts = new Map<string, number>();
  for (const row of filterRows(rows, columns, query.filters, key, today)) {
    const value = cellString(column.value?.(row));
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const format = column.filter?.type === 'multi' ? column.filter.format : undefined;
  return [...counts].map(([value, count]) => ({ value, count, ...(format ? { label: format(value) } : {}) }));
}

/** Source locale : filtre, trie et compte en mémoire. */
export function lcLocalSource<T>(rows: readonly T[], columns: readonly LcDataColumn<T>[], today: () => Date = () => new Date()): LcDataSource<T> {
  return {
    rows: (query) => of({ rows: sortDataRows(filterRows(rows, columns, query.filters, undefined, today()), columns, query.sort), total: rows.length }),
    distinct: (key, query) => of(localDistinct(rows, columns, key, query, today())),
  };
}
