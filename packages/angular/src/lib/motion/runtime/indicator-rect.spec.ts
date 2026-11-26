import { lcIndicatorRect } from './indicator-rect';

describe('lcIndicatorRect', () => {
  const rects = [{ left: 0, width: 100 }, { left: 100, width: 60 }, { left: 160, width: 140 }];

  it('renvoie null sans élément', () => expect(lcIndicatorRect([], 0)).toBeNull());
  it('valeurs entières : le rectangle de l’élément', () => expect(lcIndicatorRect(rects, 1)).toEqual(rects[1]));
  it('valeur réelle : interpolation de la position et de la largeur', () => expect(lcIndicatorRect(rects, 0.5)).toEqual({ left: 50, width: 80 }));
  it('bornes : ramené dans 0 à n - 1, NaN compris', () => {
    expect(lcIndicatorRect(rects, -3)).toEqual(rects[0]);
    expect(lcIndicatorRect(rects, 9)).toEqual(rects[2]);
    expect(lcIndicatorRect(rects, Number.NaN)).toEqual(rects[0]);
  });
  it('rtl : les rectangles vont de droite à gauche, l’interpolation reste valable', () => {
    expect(lcIndicatorRect([{ left: 200, width: 100 }, { left: 100, width: 100 }], 0.5)).toEqual({ left: 150, width: 100 });
  });
});
