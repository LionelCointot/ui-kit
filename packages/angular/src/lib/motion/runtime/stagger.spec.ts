import { describe, expect, it } from 'vitest';
import { LcStaggerBatch, staggerDelay } from './stagger';

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

describe('staggerDelay', () => {
  it('pas du jeton tant que le lot tient en 300 ms', () => {
    expect([0, 1, 2, 3].map((i) => staggerDelay(i, 4, 80))).toEqual([0, 80, 160, 240]);
  });
  it('lot de 5 à 80 ms : pas réduit à 75 ms, dernier à 300 ms', () => {
    expect([0, 1, 2, 3, 4].map((i) => staggerDelay(i, 5, 80))).toEqual([0, 75, 150, 225, 300]);
  });
  it('lot de 12 : jamais plus de 300 ms ; une seule arrivée : 0', () => {
    expect(staggerDelay(11, 12, 80)).toBeCloseTo(300);
    expect(staggerDelay(0, 1, 80)).toBe(0);
  });
});
