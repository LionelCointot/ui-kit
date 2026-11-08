import { parseLocaleNumber, roundTo } from './number-parsing';

describe('parseLocaleNumber', () => {
  it.each([
    ['250 000', 250000],
    ['250000,5', 250000.5],
    ['1.234,5', 1234.5],
    ['1,234.5', 1234.5],
    ['250 000,50 €', 250000.5],
    ['250 000,50 €', 250000.5],
    ['3,5 %', 3.5],
    ['-12,5', -12.5],
    ['12.', 12],
    ['0,05', 0.05],
  ])('analyse « %s » en %d', (text, expected) => {
    expect(parseLocaleNumber(text)).toBe(expected);
  });

  it('renvoie null pour une saisie vide ou blanche', () => {
    expect(parseLocaleNumber('')).toBeNull();
    expect(parseLocaleNumber('   ')).toBeNull();
  });

  it.each(['abc', '12a', '1,2,3', '--5', '€'])('refuse « %s » (NaN ou null)', (text) => {
    const result = parseLocaleNumber(text);
    expect(result === null || Number.isNaN(result)).toBe(true);
  });
});

describe('roundTo', () => {
  it.each([
    [1.005, 2, 1.01],
    [2.675, 2, 2.68],
    [-1.005, 2, -1.01],
    [3.14159, 3, 3.142],
    [250000.499, 0, 250000],
  ])('arrondit %d à %d décimales en %d', (value, decimals, expected) => {
    expect(roundTo(value, decimals)).toBe(expected);
  });
});
