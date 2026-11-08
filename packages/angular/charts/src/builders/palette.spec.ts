import type { LcChartSeries, LcChartTheme, LcColorSlot } from '../types';
import { LC_OTHER_SERIES_ID, assignColorSlots, foldExtraSeries, prepareSeries } from './palette';

const series = (id: string, values: (number | null)[] = [1, 2], extra: Partial<LcChartSeries> = {}): LcChartSeries => ({ id, label: id, values, ...extra });

const theme = {
  categorical: ['#c1', '#c2', '#c3', '#c4', '#c5', '#c6', '#c7', '#c8'],
  ink: { primary: '#000', secondary: '#111', muted: '#999' },
} as unknown as LcChartTheme;

describe('assignColorSlots', () => {
  it('attribue les emplacements 1, 2, 3… dans l\'ordre de première apparition', () => {
    const slots = assignColorSlots([series('a'), series('b'), series('c')], new Map());
    expect([...slots.entries()]).toEqual([['a', 1], ['b', 2], ['c', 3]]);
  });

  it('respecte un colorSlot explicite et évite de le réattribuer', () => {
    const slots = assignColorSlots([series('a'), series('b', [1], { colorSlot: 1 })], new Map());
    expect(slots.get('b')).toBe(1);
    expect(slots.get('a')).toBe(2);
  });

  it('mémorise : une série retirée ne repeint pas les autres, et retrouve sa couleur à son retour', () => {
    const memory = new Map<string, LcColorSlot>();
    assignColorSlots([series('a'), series('b'), series('c')], memory);
    const withoutB = assignColorSlots([series('a'), series('c')], memory);
    expect(withoutB.get('a')).toBe(1);
    expect(withoutB.get('c')).toBe(3);
    const withNew = assignColorSlots([series('a'), series('c'), series('d')], memory);
    expect(withNew.get('d')).toBe(4);
    const back = assignColorSlots([series('a'), series('b'), series('c'), series('d')], memory);
    expect(back.get('b')).toBe(2);
  });

  it('ne boucle jamais : huit séries occupent huit emplacements distincts', () => {
    const many = Array.from({ length: 8 }, (_, index) => series(`s${index}`));
    const slots = assignColorSlots(many, new Map());
    expect(new Set(slots.values()).size).toBe(8);
  });
});

describe('foldExtraSeries', () => {
  it('ne change rien jusqu\'à 8 séries', () => {
    const eight = Array.from({ length: 8 }, (_, index) => series(`s${index}`));
    expect(foldExtraSeries(eight, 8, 'Autres')).toBe(eight);
  });

  it('regroupe les séries au-delà de la 7e en « Autres », somme par catégorie, trou si tout est absent', () => {
    const ten = Array.from({ length: 10 }, (_, index) => series(`s${index}`, index === 9 ? [null, 5] : [1, null]));
    const folded = foldExtraSeries(ten, 8, 'Autres');
    expect(folded.length).toBe(8);
    expect(folded.slice(0, 7).map((item) => item.id)).toEqual(['s0', 's1', 's2', 's3', 's4', 's5', 's6']);
    const other = folded[7];
    expect(other.id).toBe(LC_OTHER_SERIES_ID);
    expect(other.label).toBe('Autres');
    expect(other.values).toEqual([2, 5]);
  });
});

describe('prepareSeries', () => {
  it('masquer une série garde les couleurs des autres et laisse la légende complète', () => {
    const memory = new Map<string, LcColorSlot>();
    const input = [series('a'), series('b'), series('c')];
    const shown = prepareSeries(input, memory, theme, 'Autres', new Set());
    const hiddenB = prepareSeries(input, memory, theme, 'Autres', new Set(['b']));
    expect(hiddenB.visible.map((item) => item.id)).toEqual(['a', 'c']);
    expect(hiddenB.all.length).toBe(3);
    expect(hiddenB.visible.map((item) => item.color)).toEqual([shown.all[0].color, shown.all[2].color]);
  });

  it('colore « Autres » en encre neutre', () => {
    const ten = Array.from({ length: 10 }, (_, index) => series(`s${index}`));
    const prepared = prepareSeries(ten, new Map(), theme, 'Autres', new Set());
    expect(prepared.all[7].color).toBe('#999');
    expect(prepared.all[0].color).toBe('#c1');
    expect(prepared.all[6].color).toBe('#c7');
  });
});
