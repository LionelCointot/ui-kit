import { lcPageCount, lcPageSlice } from './page-slice';

const items = Array.from({ length: 120 }, (_, index) => index + 1);

describe('lcPageCount', () => {
  it.each([
    [120, 25, 5],
    [125, 25, 5],
    [126, 25, 6],
    [25, 25, 1],
    [1, 25, 1],
    [0, 25, 1],
    [-5, 25, 1],
  ])('%i éléments par %i : %i page(s)', (total, size, expected) => {
    expect(lcPageCount(total, size)).toBe(expected);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('refuse la taille de page %s par une RangeError', (size) => {
    expect(() => lcPageCount(10, size)).toThrow(RangeError);
  });
});

describe('lcPageSlice', () => {
  // CA-K4.4
  it('CA-K4.4 : première, intermédiaire et dernière page (valeurs de référence)', () => {
    expect(lcPageSlice(items, 1, 25)).toEqual(items.slice(0, 25));
    expect(lcPageSlice(items, 2, 25)[0]).toBe(26);
    expect(lcPageSlice(items, 5, 25)).toEqual([101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]);
  });

  it('CA-K4.4 : page 0 ou négative → première page ; au-delà → dernière page', () => {
    expect(lcPageSlice(items, 0, 25)).toEqual(lcPageSlice(items, 1, 25));
    expect(lcPageSlice(items, -3, 25)).toEqual(lcPageSlice(items, 1, 25));
    expect(lcPageSlice(items, 6, 25)).toEqual(lcPageSlice(items, 5, 25));
    expect(lcPageSlice(items, 999, 25)).toEqual(lcPageSlice(items, 5, 25));
  });

  it('page non finie ou décimale : première page, partie entière', () => {
    expect(lcPageSlice(items, Number.NaN, 25)).toEqual(lcPageSlice(items, 1, 25));
    expect(lcPageSlice(items, Number.POSITIVE_INFINITY, 25)).toEqual(lcPageSlice(items, 1, 25));
    expect(lcPageSlice(items, 2.9, 25)).toEqual(lcPageSlice(items, 2, 25));
  });

  it('CA-K4.4 : taille de page 0, négative, décimale ou non finie → RangeError', () => {
    for (const size of [0, -25, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => lcPageSlice(items, 1, size), String(size)).toThrow(RangeError);
    }
  });

  it('liste vide → liste vide, y compris pour une page hors bornes', () => {
    expect(lcPageSlice([], 1, 25)).toEqual([]);
    expect(lcPageSlice([], 7, 25)).toEqual([]);
  });

  it('ne modifie pas la liste source', () => {
    const source = Object.freeze([1, 2, 3]);
    expect(lcPageSlice(source, 1, 2)).toEqual([1, 2]);
    expect(source).toEqual([1, 2, 3]);
  });
});
