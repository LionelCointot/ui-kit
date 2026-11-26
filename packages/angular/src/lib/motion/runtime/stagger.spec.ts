import { describe, expect, it } from 'vitest';
import { LcStaggerBatch } from './stagger';

describe('LcStaggerBatch', () => {
  it('numérote le lot à partir de 0', () => {
    const batch = new LcStaggerBatch();
    expect([batch.next(8), batch.next(8), batch.next(8)]).toEqual([0, 1, 2]);
  });

  it('plafonne le rang', () => {
    const batch = new LcStaggerBatch();
    expect(Array.from({ length: 5 }, () => batch.next(2))).toEqual([0, 1, 2, 2, 2]);
  });

  it('repart de 0 à la microtâche suivante, une seule remise à zéro par lot', async () => {
    const batch = new LcStaggerBatch();
    batch.next(8);
    batch.next(8);
    await Promise.resolve();
    expect(batch.next(8)).toBe(0);
    expect(batch.next(8)).toBe(1);
  });
});
