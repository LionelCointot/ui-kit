import {
  PAGE_BACK_ENGAGE_RATIO,
  PAGE_BACK_FLICK_MIN_DISTANCE_PX,
  PAGE_BACK_FLICK_SPEED,
  PAGE_BACK_FLICK_WINDOW_MS,
  PAGE_BACK_SETTLE_MIN_MS,
  pageBackSettleMs,
  pageBackShouldEngage,
  pageBackTranslation,
} from './page-gesture';

const WIDTH = 360;
/** Deux relevés qui donnent exactement `speed` px/ms sur la fenêtre, finissant à `offset`. */
const flick = (offset: number, speed: number) => [
  { time: 0, offset: offset - speed * PAGE_BACK_FLICK_WINDOW_MS },
  { time: PAGE_BACK_FLICK_WINDOW_MS, offset },
];

describe('geste de retour : décision au relâchement', () => {
  it('tirer de 20 % sans élan ne navigue pas ; au seuil de la moitié, si', () => {
    expect(pageBackShouldEngage(WIDTH * 0.2, WIDTH, [], 1000)).toBe(false);
    expect(pageBackShouldEngage(WIDTH * PAGE_BACK_ENGAGE_RATIO - 1, WIDTH, [], 1000)).toBe(false);
    expect(pageBackShouldEngage(WIDTH * PAGE_BACK_ENGAGE_RATIO, WIDTH, [], 1000)).toBe(true);
    expect(pageBackShouldEngage(WIDTH * 0.7, WIDTH, [], 1000)).toBe(true);
  });

  it('un geste vif navigue au-delà de 0,4 px/ms, pas à la vitesse seuil ni en dessous', () => {
    const offset = WIDTH * 0.2;
    expect(pageBackShouldEngage(offset, WIDTH, flick(offset, PAGE_BACK_FLICK_SPEED + 0.05), PAGE_BACK_FLICK_WINDOW_MS)).toBe(true);
    expect(pageBackShouldEngage(offset, WIDTH, flick(offset, PAGE_BACK_FLICK_SPEED), PAGE_BACK_FLICK_WINDOW_MS)).toBe(false);
    expect(pageBackShouldEngage(offset, WIDTH, flick(offset, 0.1), PAGE_BACK_FLICK_WINDOW_MS)).toBe(false);
  });

  it('borne : un geste vif au seuil de déplacement navigue, un pixel de moins non', () => {
    const at = PAGE_BACK_FLICK_MIN_DISTANCE_PX;
    expect(pageBackShouldEngage(at, WIDTH, flick(at, 2), PAGE_BACK_FLICK_WINDOW_MS)).toBe(true);
    expect(pageBackShouldEngage(at - 1, WIDTH, flick(at - 1, 2), PAGE_BACK_FLICK_WINDOW_MS)).toBe(false);
  });

  it('élan trop ancien, déplacement trop court, toucher immobile ou tirage vers la gauche : jamais', () => {
    expect(pageBackShouldEngage(WIDTH * 0.2, WIDTH, flick(WIDTH * 0.2, 2), PAGE_BACK_FLICK_WINDOW_MS * 3)).toBe(false);
    expect(pageBackShouldEngage(PAGE_BACK_FLICK_MIN_DISTANCE_PX - 1, WIDTH, flick(PAGE_BACK_FLICK_MIN_DISTANCE_PX - 1, 2), PAGE_BACK_FLICK_WINDOW_MS)).toBe(false);
    expect(pageBackShouldEngage(0, WIDTH, [], 0)).toBe(false);
    expect(pageBackShouldEngage(-100, WIDTH, flick(-100, 2), PAGE_BACK_FLICK_WINDOW_MS)).toBe(false);
  });
});

describe('geste de retour : déplacement et durée', () => {
  it('la page suit le doigt vers la droite, bornée à 0 et à la largeur', () => {
    expect([pageBackTranslation(-30, WIDTH), pageBackTranslation(120, WIDTH), pageBackTranslation(WIDTH + 50, WIDTH)]).toEqual([0, 120, WIDTH]);
  });

  it('durée proportionnelle à la distance restante, jamais sous le minimum', () => {
    expect(pageBackSettleMs(1, 500)).toBe(500);
    expect(pageBackSettleMs(0.5, 500)).toBe(250);
    expect(pageBackSettleMs(0.1, 500)).toBe(PAGE_BACK_SETTLE_MIN_MS);
    expect(pageBackSettleMs(0, 500)).toBe(PAGE_BACK_SETTLE_MIN_MS);
  });
});
