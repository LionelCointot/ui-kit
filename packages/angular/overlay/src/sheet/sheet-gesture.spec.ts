import { describe, expect, it } from 'vitest';
import { sheetShouldDismiss, type LcSheetSample } from './sheet-gesture';

const slow: LcSheetSample[] = [{ time: 0, offset: 0 }, { time: 100, offset: 50 }];

describe('sheetShouldDismiss', () => {
  it('ferme au-delà du quart de la hauteur, même lentement', () => {
    expect(sheetShouldDismiss(201, 800, 0.25, slow, 100)).toBe(true);
  });
  it('ne ferme pas en deçà du quart à vitesse lente : retour', () => {
    expect(sheetShouldDismiss(100, 800, 0.25, slow, 100)).toBe(false);
  });
  it('ferme sur un geste vif (> 0,5 px/ms sur 100 ms, au moins 16 px)', () => {
    expect(sheetShouldDismiss(60, 800, 0.25, [{ time: 0, offset: 0 }, { time: 100, offset: 60 }], 100)).toBe(true);
  });
  it('ne ferme pas un geste vif de moins de 16 px', () => {
    expect(sheetShouldDismiss(10, 800, 0.25, [{ time: 0, offset: 0 }, { time: 10, offset: 10 }], 10)).toBe(false);
  });
  it('ignore la vitesse d\'un doigt resté immobile avant le relâchement', () => {
    expect(sheetShouldDismiss(60, 800, 0.25, [{ time: 0, offset: 0 }, { time: 20, offset: 60 }], 500)).toBe(false);
  });
  it('un toucher sans déplacement ne ferme rien', () => {
    expect(sheetShouldDismiss(0, 800, 0.25, [], 0)).toBe(false);
  });
});
