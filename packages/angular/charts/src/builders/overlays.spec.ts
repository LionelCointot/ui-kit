import { TestBed } from '@angular/core/testing';
import { LC_LABELS_EN, LC_LABELS_FR, LcFormatService } from '@lionelcointot/ui-angular';
import type { LcChartTheme, LcResolvedSeries } from '../types';
import { MAX_MARKERS, resolveOverlays } from './annotations';
import { buildAreaOption } from './area.builder';
import { buildLineOption } from './line.builder';
import { describeOverlays } from './summary';
import { buildCartesianTable, buildOverlayRows } from './table';

const theme: LcChartTheme = {
  categorical: ['#2a78d6', '#eb6834'],
  sequential: [], sequentialWarm: [], diverging: { negative: '', neutral: '', positive: '' },
  status: { good: '', warning: '', serious: '', critical: '' },
  surface: '#fcfcfb', gridline: '#e1e0d9', axis: '#c3c2b7',
  ink: { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781' }, markerColor: '#777777',
  fontFamily: 'sans-serif', fontSize: 14, reducedMotion: false, patterns: false,
};

function resolved(id: string, values: (number | null)[], color: string, extra: Partial<LcResolvedSeries> = {}): LcResolvedSeries {
  return { id, label: id, values, color, slot: null, patternIndex: 0, ...extra };
}

type AnyOption = Record<string, any>;

describe('repères, annotations, style de trait et symbole', () => {
  let format: LcFormatService;
  beforeEach(() => {
    format = TestBed.inject(LcFormatService);
  });

  const categories = ['2026', '2027', '2028', '2029'];
  const rent = resolved('rent', [100, 110, 120, 130], '#2a78d6', { lineStyle: 'dashed', symbol: 'square' });
  const buy = resolved('buy', [90, 105, 125, 150], '#eb6834', { symbol: 'diamond' });
  const base = (series: LcResolvedSeries[], overlays?: AnyOption) => ({
    categories, series, summary: 'Résumé', theme, format, seriesCount: series.length, directLabels: 'none' as const,
    yAxis: { format: 'money' as const }, overlays: overlays as never,
  });

  describe('lineStyle et symbol', () => {
    it('trait en tirets et forme de point par série', () => {
      const option = buildLineOption({ ...base([rent, buy]), showPoints: 'always' }) as AnyOption;
      expect(option['series'][0].lineStyle.type).toEqual([6, 4]);
      expect(option['series'][1].lineStyle.type).toBe('solid');
      expect(option['series'][0].symbol).toBe('square');
      expect(option['series'][1].symbol).toBe('diamond');
    });

    it('sans symbole demandé : rond (comportement existant) ; points masqués : aucun symbole', () => {
      const plain = resolved('p', [1, 2, 3, 4], '#111');
      expect((buildLineOption({ ...base([plain]), showPoints: 'always' }) as AnyOption)['series'][0].symbol).toBe('circle');
      expect((buildLineOption({ ...base([rent]), showPoints: 'never' }) as AnyOption)['series'][0].symbol).toBe('none');
    });

    it('une aire ignore les tirets', () => {
      const option = buildAreaOption({ ...base([rent]), stacked: false }) as AnyOption;
      expect(option['series'][0].lineStyle.type).toBe('solid');
    });
  });

  describe('repères', () => {
    const overlays = resolveOverlays([{ id: 'eq', categoryIndex: 2, label: 'Point d\'équilibre' }], [], [rent, buy], 4, false);

    it('ligne verticale fine de la couleur de repère, étiquette en encre principale, portée par la première série', () => {
      const option = buildLineOption({ ...base([rent, buy], overlays), showPoints: 'auto' }) as AnyOption;
      const markLine = option['series'][0].markLine;
      expect(option['series'][1].markLine).toBeUndefined();
      expect(markLine.data[0].xAxis).toBe(2);
      expect(markLine.data[0].label.formatter()).toBe('Point d\'équilibre');
      expect(markLine.lineStyle).toMatchObject({ width: 1, color: theme.markerColor });
      expect(markLine.label.color).toBe(theme.ink.primary);
      expect(markLine.silent).toBe(true);
    });

    it('réserve de la place en haut de la zone de tracé pour l\'étiquette', () => {
      const withMarker = buildLineOption({ ...base([rent], overlays), showPoints: 'auto' }) as AnyOption;
      const without = buildLineOption({ ...base([rent]), showPoints: 'auto' }) as AnyOption;
      expect(withMarker['grid'].top).toBeGreaterThan(without['grid'].top);
      expect(without['series'][0].markLine).toBeUndefined();
    });

    it('fonctionne aussi sur une aire', () => {
      const option = buildAreaOption({ ...base([rent, buy], overlays), stacked: true }) as AnyOption;
      expect(option['series'][0].markLine.data).toHaveLength(1);
    });

    it('au plus 3 repères, categoryIndex hors limites ignoré, avec avertissements', () => {
      const markers = [0, 1, 2, 3, 9, -1].map((categoryIndex) => ({ id: `m${categoryIndex}`, categoryIndex, label: `M${categoryIndex}` }));
      const result = resolveOverlays(markers, [], [rent], 4, false);
      expect(result.markers.map((marker) => marker.id)).toEqual(['m0', 'm1', 'm2']);
      expect(MAX_MARKERS).toBe(3);
      expect(result.warnings.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('points annotés', () => {
    it('primary : point plein ≥ 8 px avec étiquette ; secondary : rond creux sans étiquette', () => {
      const overlays = resolveOverlays([], [
        { seriesId: 'buy', categoryIndex: 2, label: 'Équilibre', emphasis: 'primary' },
        { seriesId: 'buy', categoryIndex: 0, label: 'Achat', emphasis: 'secondary' },
      ], [rent, buy], 4, false);
      const option = buildLineOption({ ...base([rent, buy], overlays), showPoints: 'auto' }) as AnyOption;
      expect(option['series'][0].markPoint).toBeUndefined();
      const [primary, secondary] = option['series'][1].markPoint.data;
      expect(primary.coord).toEqual([2, 125]);
      expect(primary.symbolSize).toBeGreaterThanOrEqual(8);
      expect(primary.itemStyle.color).toBe('#eb6834');
      expect(primary.label.show).toBe(true);
      expect(primary.label.formatter()).toBe('Équilibre');
      expect(secondary.itemStyle.color).toBe(theme.surface);
      expect(secondary.itemStyle.borderColor).toBe('#eb6834');
      expect(secondary.label.show).toBe(false);
    });

    it('aire empilée : le point se place au sommet de sa bande', () => {
      const overlays = resolveOverlays([], [{ seriesId: 'buy', categoryIndex: 1, label: 'x', emphasis: 'primary' }], [rent, buy], 4, true);
      expect(overlays.annotations[0].y).toBe(110 + 105);
    });

    it('série inconnue, catégorie hors limites ou valeur absente : ignoré avec avertissement', () => {
      const gap = resolved('gap', [1, null, 3, 4], '#111');
      const overlays = resolveOverlays([], [
        { seriesId: 'zzz', categoryIndex: 1, label: 'a', emphasis: 'primary' },
        { seriesId: 'rent', categoryIndex: 8, label: 'b', emphasis: 'primary' },
        { seriesId: 'gap', categoryIndex: 1, label: 'c', emphasis: 'primary' },
      ], [rent, gap], 4, false);
      expect(overlays.annotations).toEqual([]);
      expect(overlays.warnings).toHaveLength(3);
    });
  });

  describe('accessibilité : description et vue tableau', () => {
    const overlays = resolveOverlays(
      [{ id: 'eq', categoryIndex: 2, label: 'Point d\'équilibre' }],
      [{ seriesId: 'buy', categoryIndex: 2, label: 'Gain', emphasis: 'primary' }],
      [rent, buy], 4, false,
    );

    it('la description accessible contient « Repère : {label} »', () => {
      expect(describeOverlays(overlays, categories, LC_LABELS_FR)).toContain('Repère : Point d\'équilibre (2028).');
      expect(describeOverlays(overlays, categories, LC_LABELS_EN)).toContain('Marker : Point d\'équilibre (2028).');
    });

    it('la vue tableau a une ligne dédiée « Repère » avec la valeur de chaque série, et une ligne par point annoté', () => {
      const table = buildCartesianTable(categories, [rent, buy], 'money', format, LC_LABELS_FR);
      const rows = buildOverlayRows(overlays, categories, [rent, buy], 'money', format, LC_LABELS_FR);
      expect(rows).toHaveLength(2);
      expect(rows[0][0]).toBe('Repère : Point d\'équilibre (2028)');
      expect(rows[0]).toHaveLength(table.columns.length);
      expect(String(rows[0][1])).toBe(String(table.rows[2][1]));
      expect(String(rows[0][2])).toBe(String(table.rows[2][2]));
      expect(rows[1][0]).toBe('Point annoté : Gain (2028)');
      expect(rows[1][1]).toBe('');
      expect(String(rows[1][2])).toBe(String(table.rows[2][2]));
    });
  });
});
