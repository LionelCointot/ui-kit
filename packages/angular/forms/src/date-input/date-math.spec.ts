import {
  addDays,
  addMonths,
  addYears,
  clampIso,
  clipInterval,
  compareIso,
  firstOfMonth,
  isValidIsoDate,
  lastDayOfMonth,
  lastDaysInterval,
  lastMonthInterval,
  lastOfMonth,
  monthGrid,
  thisMonthInterval,
  yearPage,
} from './date-math';

describe('date-math', () => {
  it('valide les dates ISO', () => {
    for (const ok of ['2026-11-19', '2024-02-29', '2000-02-29'])
      expect(isValidIsoDate(ok)).toBe(true);
    for (const ko of [
      '2026-02-29',
      '2100-02-29',
      '2026-04-31',
      '2026-13-01',
      '2026-00-10',
      '2026-1-1',
      '2026-11-19T00',
      '',
    ])
      expect(isValidIsoDate(ko)).toBe(false);
  });

  it('dernier jour du mois : 28, 29, 30, 31, bissextiles dont 2000 et 2100', () => {
    expect(lastDayOfMonth('2026-02-10')).toBe(28);
    expect(lastDayOfMonth('2024-02-10')).toBe(29);
    expect(lastDayOfMonth('2000-02-01')).toBe(29);
    expect(lastDayOfMonth('2100-02-01')).toBe(28);
    expect(lastDayOfMonth('2026-04-01')).toBe(30);
    expect(lastDayOfMonth('2026-12-01')).toBe(31);
    expect(firstOfMonth('2026-11-19')).toBe('2026-11-01');
    expect(lastOfMonth('2024-02-10')).toBe('2024-02-29');
  });

  it('ajoute des jours, au-delà des mois et des années', () => {
    expect(addDays('2026-11-19', 1)).toBe('2026-11-20');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-11-19', 0)).toBe('2026-11-19');
  });

  it('ajoute des mois : jour gardé ou ramené au dernier jour, passage d’année', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-05-31', 1)).toBe('2026-06-30');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2026-01-15', 14)).toBe('2027-03-15');
  });

  it('ajoute des années, le 29 février devient le 28', () => {
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
    expect(addYears('2024-02-29', 4)).toBe('2028-02-29');
    expect(addYears('2026-11-19', -1)).toBe('2025-11-19');
  });

  it('compare et borne', () => {
    expect(compareIso('2026-01-01', '2026-01-02')).toBeLessThan(0);
    expect(compareIso('2026-01-02', '2026-01-01')).toBeGreaterThan(0);
    expect(compareIso('2026-01-01', '2026-01-01')).toBe(0);
    expect(clampIso('2026-05-10', '2026-06-01', '2026-06-30')).toBe('2026-06-01');
    expect(clampIso('2026-08-10', '2026-06-01', '2026-06-30')).toBe('2026-06-30');
    expect(clampIso('2026-06-10', '2026-06-01', '2026-06-30')).toBe('2026-06-10');
    expect(clampIso('2026-06-10', null, undefined)).toBe('2026-06-10');
  });

  it('grille : février 2026 commence un dimanche, 4 semaines pleines plus 2 cases', () => {
    const grid = monthGrid('2026-02-14');
    expect(grid).toHaveLength(5);
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-02-01']);
    expect(grid[4]).toEqual([
      '2026-02-23',
      '2026-02-24',
      '2026-02-25',
      '2026-02-26',
      '2026-02-27',
      '2026-02-28',
      null,
    ]);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it('grille : un mois qui commence un lundi n’a aucune case vide avant le 1er', () => {
    const grid = monthGrid('2026-06-10');
    expect(grid[0][0]).toBe('2026-06-01');
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(grid[4]).toEqual(['2026-06-29', '2026-06-30', null, null, null, null, null]);
  });

  it('grille : février 2021 tient en quatre semaines exactes', () => {
    const grid = monthGrid('2021-02-01');
    expect(grid).toHaveLength(4);
    expect(grid.flat().includes(null)).toBe(false);
  });

  it('page d’années : 2026 donne 2019 à 2030', () => {
    const page = yearPage(2026);
    expect(page[0]).toBe(2019);
    expect(page[11]).toBe(2030);
    expect(page).toHaveLength(12);
  });

  it('raccourcis au 19 novembre 2026', () => {
    expect(lastDaysInterval('2026-11-19', 7)).toEqual({ from: '2026-11-13', to: '2026-11-19' });
    expect(lastDaysInterval('2026-11-19', 30)).toEqual({ from: '2026-10-21', to: '2026-11-19' });
    expect(thisMonthInterval('2026-11-19')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(lastMonthInterval('2026-11-19')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('raccourcis aux limites : 1er mars, 31 mars, 1er janvier', () => {
    expect(lastDaysInterval('2026-03-01', 7)).toEqual({ from: '2026-02-23', to: '2026-03-01' });
    expect(lastMonthInterval('2026-03-01')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(lastMonthInterval('2026-03-31')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(thisMonthInterval('2026-03-31')).toEqual({ from: '2026-03-01', to: '2026-03-31' });
    expect(lastDaysInterval('2026-01-01', 7)).toEqual({ from: '2025-12-26', to: '2026-01-01' });
    expect(lastMonthInterval('2026-01-01')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('rogne une période par min et max, vide si rien ne reste', () => {
    const period = { from: '2026-10-01', to: '2026-10-31' };
    expect(clipInterval(period, '2026-10-10', '2026-10-20')).toEqual({
      from: '2026-10-10',
      to: '2026-10-20',
    });
    expect(clipInterval(period, null, undefined)).toEqual(period);
    expect(clipInterval(period, '2026-11-01', undefined)).toBeNull();
    expect(clipInterval(period, undefined, '2026-09-30')).toBeNull();
    expect(clipInterval(period, '2026-10-31', '2026-10-31')).toEqual({
      from: '2026-10-31',
      to: '2026-10-31',
    });
  });
});
