import { describe, expect, it } from 'vitest';
import { SHEET_FLICK_SPEED, sheetShouldDismiss, sheetTranslation, type LcSheetSample } from './sheet-gesture';

const slow: LcSheetSample[] = [{ time: 0, offset: 0 }, { time: 100, offset: 50 }];

describe('sheetShouldDismiss', () => {
  it('ferme au-delà du tiers de la hauteur, même lentement', () => {
    expect(sheetShouldDismiss(267, 800, slow, 100)).toBe(true);
  });
  it('ne ferme pas en deçà du tiers à vitesse lente : retour (31 %)', () => {
    expect(sheetShouldDismiss(248, 800, slow, 100)).toBe(false);
  });
  it('ferme sur un geste vif (> 0,6 px/ms sur 100 ms, au moins 16 px)', () => {
    expect(SHEET_FLICK_SPEED).toBe(0.6);
    expect(sheetShouldDismiss(70, 800, [{ time: 0, offset: 0 }, { time: 100, offset: 70 }], 100)).toBe(true);
  });
  it('ne ferme pas à 0,45 px/ms', () => {
    expect(sheetShouldDismiss(45, 800, [{ time: 0, offset: 0 }, { time: 100, offset: 45 }], 100)).toBe(false);
  });
  it('ne ferme pas un geste vif de moins de 16 px', () => {
    expect(sheetShouldDismiss(10, 800, [{ time: 0, offset: 0 }, { time: 10, offset: 10 }], 10)).toBe(false);
  });
  it('ignore la vitesse d\'un doigt resté immobile avant le relâchement', () => {
    expect(sheetShouldDismiss(70, 800, [{ time: 0, offset: 0 }, { time: 20, offset: 70 }], 500)).toBe(false);
  });
  it('un toucher sans déplacement ne ferme rien', () => {
    expect(sheetShouldDismiss(0, 800, [], 0)).toBe(false);
  });
});

describe('sheetTranslation', () => {
  it('suit le doigt vers le bas, quasi rigide vers le haut (160 px : moins de 1 px)', () => {
    expect(sheetTranslation(250)).toBe(250);
    expect(Math.abs(sheetTranslation(-160))).toBeLessThan(1);
  });
});
