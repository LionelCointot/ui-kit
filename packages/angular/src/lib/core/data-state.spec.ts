import { lcDataState, type LcDataState } from './data-state';

describe('lcDataState', () => {
  it.each<[string, unknown, boolean | undefined, LcDataState]>([
    ['undefined', undefined, undefined, 'loading'],
    ['undefined avec loading = false', undefined, false, 'loading'],
    ['loading = true avec un tableau plein', [1], true, 'loading'],
    ['loading = true avec null', null, true, 'loading'],
    ['loading = true avec undefined', undefined, true, 'loading'],
    ['null', null, undefined, 'empty'],
    ['[]', [], undefined, 'empty'],
    ['0', 0, undefined, 'ready'],
    ["''", '', undefined, 'ready'],
    ['NaN', NaN, undefined, 'ready'],
    ['{}', {}, undefined, 'ready'],
    ['[0]', [0], undefined, 'ready'],
    ['un tableau non vide', [1, 2], undefined, 'ready'],
  ])('CA-1 : %s', (_label, data, loading, expected) => {
    expect(lcDataState(data, loading)).toBe(expected);
  });
});
