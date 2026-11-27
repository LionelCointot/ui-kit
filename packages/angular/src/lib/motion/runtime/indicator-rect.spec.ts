import { lcIndicatorRect, lcPlaceIndicator } from './indicator-rect';

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

describe('lcPlaceIndicator', () => {
  const place = (indicator: HTMLElement, start: number, end: number, bound = 300, axis: 'x' | 'y' = 'x') => lcPlaceIndicator(indicator, axis, start, end, bound);

  it('axe x : left et width vont du bord de départ au bord fixe, le bord de fin est rogné', () => {
    const indicator = document.createElement('span');
    place(indicator, 100, 160);
    expect(indicator.style.left).toBe('100px');
    expect(indicator.style.width).toBe('200px');
    expect(indicator.style.clipPath).toContain('inset(0 140px 0 0');
  });
  it('axe y : top, height et rognage du bas', () => {
    const indicator = document.createElement('span');
    place(indicator, 10, 50, 120, 'y');
    expect([indicator.style.top, indicator.style.height]).toEqual(['10px', '110px']);
    expect(indicator.style.clipPath).toContain('inset(0 0 70px 0');
  });
  it('le sens vient du milieu : forward vers les coordonnées croissantes, backward sinon, inchangé à milieu égal', () => {
    const indicator = document.createElement('span');
    place(indicator, 0, 100);
    expect(indicator.dataset['direction']).toBeUndefined();
    place(indicator, 100, 160);
    expect(indicator.dataset['direction']).toBe('forward');
    place(indicator, 0, 100);
    expect(indicator.dataset['direction']).toBe('backward');
    place(indicator, 0, 100);
    expect(indicator.dataset['direction']).toBe('backward');
  });
  it('un bord de fin au-delà de la borne ne produit aucune valeur négative', () => {
    const indicator = document.createElement('span');
    place(indicator, 250, 400, 300);
    expect(indicator.style.width).toBe('50px');
    expect(indicator.style.clipPath).toContain('inset(0 0px 0 0');
  });
});
