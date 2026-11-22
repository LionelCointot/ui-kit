import type { LcValueFormat } from '@lionelcointot/ui-angular';
import { LcSort, LcTableColumn, columnAlign } from './table-model';

// Aides communes à lc-table, lc-tree-table et lc-data-table ; hors API publique.
/** Direction du tri d'une colonne, ou `null` si la colonne n'est pas la colonne triée. */
export function sortDirection(sort: LcSort | null, columnId: string): LcSort['direction'] | null {
  return sort?.columnId === columnId ? sort.direction : null;
}

/** Valeur de `aria-sort` pour la direction de tri d'une colonne. */
export function ariaSort(direction: LcSort['direction'] | null): 'ascending' | 'descending' | null {
  return direction === null ? null : direction === 'asc' ? 'ascending' : 'descending';
}

/** Icône de tri commune aux trois tableaux : une pour « sans tri », une paire croissant / décroissant. */
export function sortIcon(direction: LcSort['direction'] | null): 'arrow-up-down' | 'arrow-up' | 'arrow-down' {
  return direction === null ? 'arrow-up-down' : direction === 'asc' ? 'arrow-up' : 'arrow-down';
}

/** Classes d'une cellule (alignement, colonne collée). */
export function cellClass(column: Pick<LcTableColumn<unknown>, 'format' | 'align' | 'sticky'>): string {
  const sticky = column.sticky ? ` lc-table__cell--sticky-${column.sticky}` : '';
  return `lc-table__cell lc-table__cell--${columnAlign(column)}${sticky}`;
}

/** Texte affiché d'une cellule : valeur de la colonne formatée. */
export function cellText<T>(
  formatter: { format(value: unknown, format?: LcValueFormat): string },
  column: { readonly value?: (row: T) => unknown; readonly format?: LcValueFormat },
  row: T,
): string {
  return formatter.format(column.value?.(row), column.format);
}
