import { ArrivalTracker, DEFAULT_PAGE_SIZE, normalizePageSize, staggerDelay } from './message-thread-motion';

describe('ArrivalTracker', () => {
  it('premier rendu non vide : tout est vu, aucune arrivée', () => {
    expect(new ArrivalTracker().next(['1', '2', '3'])).toEqual([]);
  });

  it('liste d\'abord vide puis remplie : aucune arrivée, puis les identifiants nouveaux', () => {
    const tracker = new ArrivalTracker();
    expect(tracker.next([])).toEqual([]);
    expect(tracker.hasStarted).toBe(false);
    expect(tracker.next(['1', '2'])).toEqual([]);
    expect(tracker.hasStarted).toBe(true);
    expect(tracker.next(['1', '2', '3', '4'])).toEqual(['3', '4']);
  });

  it('remplacement de liste sans identifiant nouveau, retrait puis retour : aucune arrivée', () => {
    const tracker = new ArrivalTracker();
    tracker.next(['1', '2']);
    expect(tracker.next(['2', '1'])).toEqual([]);
    expect(tracker.next(['1'])).toEqual([]);
    expect(tracker.next(['1', '2'])).toEqual([]);
  });

  it('un identifiant en double dans un lot compte une fois ; une arrivée n\'est annoncée qu\'une fois', () => {
    const tracker = new ArrivalTracker();
    tracker.next(['1']);
    expect(tracker.next(['1', '2', '2'])).toEqual(['2']);
    expect(tracker.next(['1', '2'])).toEqual([]);
  });
});

describe('normalizePageSize', () => {
  it.each([[10, 10], [1, 1], [0, 30], [-5, 30], [2.5, 30], [NaN, 30], [Infinity, 30], ['12', 30], [undefined, 30]])('%s -> %s', (input, expected) => {
    expect(normalizePageSize(input)).toBe(expected);
  });
  it('défaut 30', () => expect(DEFAULT_PAGE_SIZE).toBe(30));
});

describe('staggerDelay', () => {
  it('croît par pas puis plafonne à 300 ms', () => {
    expect([0, 1, 4, 6, 12].map((i) => staggerDelay(i, 50))).toEqual([0, 50, 200, 300, 300]);
  });
});
