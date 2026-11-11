import { LcTableColumn } from '../table/table-model';
import { LC_TREE_TABLE_MAX_ROWS, buildTreeTableModel } from './tree-table-model';

interface Item {
  readonly id: string;
  readonly value: number;
  readonly kids?: readonly Item[] | null;
}

const item = (id: string, value: number, kids?: readonly Item[] | null): Item => ({ id, value, kids });
const columns: readonly LcTableColumn<Item>[] = [
  { id: 'id', header: 'Id', value: (row) => row.id, sortable: true },
  { id: 'value', header: 'Valeur', value: (row) => row.value, sortable: true },
];

const build = (data: readonly Item[], extra: Partial<Parameters<typeof buildTreeTableModel<Item>>[0]> = {}) =>
  buildTreeTableModel<Item>({
    data, children: (row) => row.kids, columns, trackBy: (row) => row.id, sort: null, isExpanded: () => true, ...extra,
  });

describe('buildTreeTableModel', () => {
  const tree = [item('a', 3, [item('a1', 2), item('a2', 1)]), item('b', 1)];

  it('aplatit l\'arbre déplié avec niveau, position, effectif des frères et index du parent', () => {
    const { rows } = build(tree);
    expect(rows.map((row) => [row.id, row.level, row.position, row.setSize, row.parentIndex, row.hasChildren, row.expanded])).toEqual([
      ['a', 1, 1, 2, -1, true, true],
      ['a1', 2, 1, 2, 0, false, false],
      ['a2', 2, 2, 2, 0, false, false],
      ['b', 1, 2, 2, -1, false, false],
    ]);
  });

  it('un parent replié cache ses descendants mais reste parent (parentIds complet)', () => {
    const { rows, parentIds } = build(tree, { isExpanded: () => false });
    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
    expect(rows[0]).toMatchObject({ hasChildren: true, expanded: false });
    expect([...parentIds]).toEqual(['a']);
  });

  it('parentIds contient aussi les parents des branches repliées profondes', () => {
    const deep = [item('r', 1, [item('m', 1, [item('leaf', 1)])])];
    expect([...build(deep, { isExpanded: () => false }).parentIds].sort()).toEqual(['m', 'r']);
  });

  it('trie les frères à chaque niveau sans casser la hiérarchie', () => {
    const { rows } = build(tree, { sort: { columnId: 'value', direction: 'asc' } });
    expect(rows.map((row) => row.id)).toEqual(['b', 'a', 'a2', 'a1']);
    expect(rows.map((row) => row.parentIndex)).toEqual([-1, -1, 1, 1]);
  });

  it('filtre : conserve les ancêtres d\'un résultat ; ne compte pas les frères non retenus dans setSize', () => {
    const { rows } = build(tree, { filter: (row) => row.id === 'a2' });
    expect(rows.map((row) => [row.id, row.setSize])).toEqual([['a', 1], ['a2', 1]]);
  });

  it('filtre sans résultat : aucune ligne, pas de troncature', () => {
    expect(build(tree, { filter: () => false })).toMatchObject({ rows: [], truncated: false });
  });

  it('children null ou undefined : feuille', () => {
    const { rows } = build([item('x', 1, null), item('y', 1, undefined)]);
    expect(rows.every((row) => !row.hasChildren)).toBe(true);
  });

  it('limite : troncature signalée à la limite fournie, jamais au-delà', () => {
    const many = Array.from({ length: 10 }, (_, index) => item(`n${index}`, index));
    expect(build(many, { limit: 10 })).toMatchObject({ truncated: false });
    const cut = build(many, { limit: 4 });
    expect(cut.truncated).toBe(true);
    expect(cut.rows.length).toBe(4);
  });

  it('limite par défaut : 2 000 lignes', () => {
    expect(LC_TREE_TABLE_MAX_ROWS).toBe(2000);
    const many = Array.from({ length: 2500 }, (_, index) => item(`n${index}`, index));
    const model = build(many);
    expect(model.rows.length).toBe(2000);
    expect(model.truncated).toBe(true);
  });

  it('la troncature coupe aussi à l\'intérieur d\'une branche dépliée', () => {
    const wide = [item('r', 1, Array.from({ length: 20 }, (_, index) => item(`c${index}`, index))), item('z', 1)];
    const model = build(wide, { limit: 5 });
    expect(model.rows.map((row) => row.id)).toEqual(['r', 'c0', 'c1', 'c2', 'c3']);
    expect(model.truncated).toBe(true);
  });

  it('2 000 nœuds sur 3 niveaux se construisent en moins de 500 ms (CA-K3.5, calcul du modèle)', () => {
    const big = Array.from({ length: 20 }, (_, a) => item(`a${a}`, a, Array.from({ length: 10 }, (__, b) => item(`a${a}b${b}`, b, Array.from({ length: 9 }, (___, c) => item(`a${a}b${b}c${c}`, c))))));
    const start = performance.now();
    const model = build(big, { sort: { columnId: 'value', direction: 'desc' }, filter: (row) => row.value >= 0 });
    const elapsed = performance.now() - start;
    expect(model.rows.length).toBe(2000);
    expect(elapsed).toBeLessThan(500);
  });

  describe('cycles et identités', () => {
    it('un cycle (b contient a) ne boucle pas', () => {
      const a: { id: string; value: number; kids: Item[] } = { id: 'a', value: 1, kids: [] };
      const b: Item = item('b', 1, [a]);
      a.kids.push(b);
      expect(build([a]).rows.map((row) => row.id)).toEqual(['a', 'b']);
    });

    it('un cycle avec filtre : le résultat est retrouvé sans boucle infinie ; le nœud répété n\'est pas compté comme descendant', () => {
      const a: { id: string; value: number; kids: Item[] } = { id: 'a', value: 1, kids: [] };
      const b: Item = item('b', 2, [a]);
      a.kids.push(b);
      expect(build([a], { filter: (row) => row.id === 'b' }).rows.map((row) => row.id)).toEqual(['a', 'b']);
      expect(build([a], { filter: () => false }).rows).toEqual([]);
    });

    it('identités dupliquées entre frères : chaque nœud donne une ligne (clés identiques)', () => {
      const { rows } = build([item('d', 1), item('d', 2)]);
      expect(rows.length).toBe(2);
      expect(rows[0].key).toBe(rows[1].key);
    });
  });
});
