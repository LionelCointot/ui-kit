import { LC_TABLE_MAX_ROWS, LcSort, LcTableColumn, sortRows } from '../table/table-model';

/** Nombre maximal de lignes visibles (comme `lc-table`, ADR-0004). */
export const LC_TREE_TABLE_MAX_ROWS = LC_TABLE_MAX_ROWS;

/** Ligne visible d'un tableau hiérarchique : nœud, position dans l'arbre et état de dépliage. */
export interface LcTreeTableRow<T> {
  /** Clé de rendu stable, dérivée de l'identité du nœud. */
  readonly key: string;
  /** Identité du nœud (résultat de `trackBy`), celle qui figure dans l'ensemble `expanded`. */
  readonly id: unknown;
  readonly node: T;
  /** Niveau, 1 pour une racine (`aria-level`). */
  readonly level: number;
  /** Position parmi les frères affichés, à partir de 1 (`aria-posinset`). */
  readonly position: number;
  /** Nombre de frères affichés (`aria-setsize`). */
  readonly setSize: number;
  /** Index de la ligne parente dans la liste des lignes visibles, -1 pour une racine. */
  readonly parentIndex: number;
  /** A au moins un enfant affiché : la ligne porte `aria-expanded`. */
  readonly hasChildren: boolean;
  readonly expanded: boolean;
}

export interface LcTreeTableModel<T> {
  readonly rows: readonly LcTreeTableRow<T>[];
  /** Vrai si l'affichage a été limité à `LC_TREE_TABLE_MAX_ROWS` lignes. */
  readonly truncated: boolean;
  /** Identités de tous les nœuds qui ont des enfants affichés (dépliage complet). */
  readonly parentIds: ReadonlySet<unknown>;
}

export interface BuildTreeTableModelArgs<T> {
  readonly data: readonly T[];
  readonly children: (node: T) => readonly T[] | null | undefined;
  readonly columns: readonly LcTableColumn<T>[];
  readonly trackBy: (node: T) => unknown;
  readonly sort: LcSort | null;
  readonly isExpanded: (identity: unknown) => boolean;
  /** Un nœud est affiché si lui ou un descendant passe le filtre. */
  readonly filter?: ((node: T) => boolean) | null;
  readonly limit?: number;
}

const rowKey = (identity: unknown): string => `n:${String(identity)}`;

/** Mémorise « le nœud ou un de ses descendants passe le filtre » ; un cycle ne compte pas comme descendant. */
function createMatcher<T>(args: BuildTreeTableModelArgs<T>): (node: T) => boolean {
  const filter = args.filter;
  if (!filter) return () => true;
  const cache = new Map<T, boolean>();
  const visiting = new Set<T>();
  const matches = (node: T): boolean => {
    const known = cache.get(node);
    if (known !== undefined) return known;
    if (visiting.has(node)) return false;
    visiting.add(node);
    const result = filter(node) || (args.children(node) ?? []).some(matches);
    visiting.delete(node);
    cache.set(node, result);
    return result;
  };
  return matches;
}

/**
 * Construit la liste ordonnée des lignes visibles : tri des frères à chaque niveau (la hiérarchie est conservée),
 * filtre (un nœud reste affiché si un descendant passe), repli et limite d'affichage.
 */
export function buildTreeTableModel<T>(args: BuildTreeTableModelArgs<T>): LcTreeTableModel<T> {
  const limit = args.limit ?? LC_TREE_TABLE_MAX_ROWS;
  const matches = createMatcher(args);
  const rows: LcTreeTableRow<T>[] = [];
  const parentIds = new Set<unknown>();
  let truncated = false;

  const shownChildren = (node: T): readonly T[] => (args.children(node) ?? []).filter(matches);

  const walk = (nodes: readonly T[], level: number, parentIndex: number, path: ReadonlySet<unknown>): void => {
    const siblings = sortRows(nodes.filter(matches), args.columns, args.sort);
    for (const [index, node] of siblings.entries()) {
      if (rows.length >= limit) {
        truncated = true;
        return;
      }
      const id = args.trackBy(node);
      if (path.has(id)) continue; // cycle : le nœud est son propre ancêtre
      const children = shownChildren(node);
      const hasChildren = children.length > 0;
      const expanded = hasChildren && args.isExpanded(id);
      if (hasChildren) parentIds.add(id);
      const rowIndex = rows.length;
      rows.push({ key: rowKey(id), id, node, level, position: index + 1, setSize: siblings.length, parentIndex, hasChildren, expanded });
      if (expanded) walk(children, level + 1, rowIndex, new Set(path).add(id));
    }
  };
  walk(args.data, 1, -1, new Set());
  return { rows, truncated, parentIds: collectParentIds(args, matches, parentIds) };
}

/** Complète `parentIds` avec les parents des branches repliées (non parcourues par `walk`). */
function collectParentIds<T>(args: BuildTreeTableModelArgs<T>, matches: (node: T) => boolean, known: Set<unknown>): ReadonlySet<unknown> {
  const visit = (nodes: readonly T[], path: ReadonlySet<unknown>): void => {
    for (const node of nodes.filter(matches)) {
      const id = args.trackBy(node);
      if (path.has(id)) continue;
      const children = (args.children(node) ?? []).filter(matches);
      if (children.length === 0) continue;
      known.add(id);
      visit(children, new Set(path).add(id));
    }
  };
  visit(args.data, new Set());
  return known;
}
