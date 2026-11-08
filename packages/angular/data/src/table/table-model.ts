import type { LcValueFormat } from '@lionelcointot/ui-angular';

/** Nombre maximal de lignes affichées sans virtualisation (ADR-0004). */
export const LC_TABLE_MAX_ROWS = 2000;

export interface LcTableColumn<T> {
  readonly id: string;
  readonly header: string;
  readonly value: (row: T) => unknown;
  /** Défaut 'text'. */
  readonly format?: LcValueFormat;
  /** Défaut 'end' pour money, percent, number et integer, sinon 'start'. */
  readonly align?: 'start' | 'center' | 'end';
  readonly sortable?: boolean;
  /** Largeur CSS, ex. '8rem'. */
  readonly width?: string;
  readonly sticky?: 'start' | 'end';
}

export interface LcTableGrouping<T> {
  readonly key: (row: T) => string;
  readonly label: (key: string, rows: readonly T[]) => string;
  /** Valeurs de la ligne de sous-total, par identifiant de colonne. */
  readonly summary?: (rows: readonly T[]) => Readonly<Record<string, unknown>>;
  /** Défaut false. */
  readonly initiallyExpanded?: boolean;
}

export interface LcSort {
  readonly columnId: string;
  readonly direction: 'asc' | 'desc';
}

export interface LcTableGroupItem {
  readonly kind: 'group';
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly expanded: boolean;
  readonly summary: Readonly<Record<string, unknown>>;
}

export interface LcTableRowItem<T> {
  readonly kind: 'row';
  readonly id: string;
  readonly row: T;
}

export type LcTableItem<T> = LcTableGroupItem | LcTableRowItem<T>;

export interface LcTableModel<T> {
  readonly items: readonly LcTableItem<T>[];
  /** Nombre de lignes de données affichées. */
  readonly shownRows: number;
  /** Vrai si l'affichage a été limité à `LC_TABLE_MAX_ROWS` lignes. */
  readonly truncated: boolean;
}

/** Alignement effectif d'une colonne. */
export function columnAlign<T>(column: LcTableColumn<T>): 'start' | 'center' | 'end' {
  if (column.align) return column.align;
  return column.format === 'money' || column.format === 'percent' || column.format === 'number' || column.format === 'integer' ? 'end' : 'start';
}

/** Comparaison de deux valeurs de cellule : valeurs absentes en dernier, nombres et dates ISO par ordre naturel, texte selon la locale. */
export function compareValues(a: unknown, b: unknown): number {
  const aMissing = a === null || a === undefined || a === '' || (typeof a === 'number' && Number.isNaN(a));
  const bMissing = b === null || b === undefined || b === '' || (typeof b === 'number' && Number.isNaN(b));
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/** Tri stable (copie) : à valeurs égales, l'ordre d'origine est conservé ; les valeurs absentes restent en dernier dans les deux sens. */
export function sortRows<T>(rows: readonly T[], columns: readonly LcTableColumn<T>[], sort: LcSort | null): readonly T[] {
  const column = sort ? columns.find((candidate) => candidate.id === sort.columnId) : undefined;
  if (!sort || !column) return rows;
  const factor = sort.direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: column.value(row) }))
    .sort((left, right) => {
      const leftMissing = left.value === null || left.value === undefined || left.value === '';
      const rightMissing = right.value === null || right.value === undefined || right.value === '';
      const result = leftMissing || rightMissing ? compareValues(left.value, right.value) : factor * compareValues(left.value, right.value);
      return result || left.index - right.index;
    })
    .map((entry) => entry.row);
}

export interface BuildTableModelArgs<T> {
  readonly data: readonly T[];
  readonly columns: readonly LcTableColumn<T>[];
  readonly trackBy: (row: T) => unknown;
  readonly sort: LcSort | null;
  readonly grouping?: LcTableGrouping<T> | null;
  /** Groupes dont l'état diffère de `initiallyExpanded` : clé → déplié. */
  readonly expandedOverrides?: ReadonlyMap<string, boolean>;
  readonly limit?: number;
}

/**
 * Construit la liste ordonnée des lignes à afficher : tri, regroupement (groupes dans l'ordre de première apparition,
 * lignes triées à l'intérieur de chaque groupe), sous-totaux, repli et limite d'affichage.
 */
export function buildTableModel<T>(args: BuildTableModelArgs<T>): LcTableModel<T> {
  const limit = args.limit ?? LC_TABLE_MAX_ROWS;
  const items: LcTableItem<T>[] = [];
  let shown = 0;
  let truncated = false;

  const pushRows = (rows: readonly T[]): void => {
    for (const row of rows) {
      if (shown >= limit) {
        truncated = true;
        return;
      }
      items.push({ kind: 'row', id: `r:${String(args.trackBy(row))}`, row });
      shown += 1;
    }
  };

  const grouping = args.grouping;
  if (!grouping) {
    pushRows(sortRows(args.data, args.columns, args.sort));
    return { items, shownRows: shown, truncated };
  }

  const groups = new Map<string, T[]>();
  for (const row of args.data) {
    const key = grouping.key(row);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  for (const [key, rows] of groups) {
    const expanded = args.expandedOverrides?.get(key) ?? grouping.initiallyExpanded ?? false;
    items.push({
      kind: 'group', id: `g:${key}`, key, label: grouping.label(key, rows), count: rows.length, expanded,
      summary: grouping.summary?.(rows) ?? {},
    });
    if (expanded) pushRows(sortRows(rows, args.columns, args.sort));
  }
  return { items, shownRows: shown, truncated };
}

/** Sens suivant au clic sur un en-tête : croissant, décroissant, puis aucun tri. */
export function nextSort(current: LcSort | null, columnId: string): LcSort | null {
  if (current?.columnId !== columnId) return { columnId, direction: 'asc' };
  return current.direction === 'asc' ? { columnId, direction: 'desc' } : null;
}
