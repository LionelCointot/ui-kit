import { TestBed } from '@angular/core/testing';
import { LC_DEFAULT_ICONS, LcFormatService } from '@lionelcointot/ui-angular';
import type { LcChartRole, LcChartSeries, LcChartTheme, LcColorSlot } from '../types';
import { buildAreaOption } from './area.builder';
import { axisTooltip, buildLineOption } from './line.builder';
import { barTooltip, buildBarOption } from './bar.builder';
import { LC_CHART_ROLE_ICONS, roleColor, roleDecal, roleOutline, roleSymbol } from './series-roles';
import { assignColorSlots, prepareSeries } from './palette';

const ROLES: readonly LcChartRole[] = ['success', 'warning', 'error', 'info', 'neutral', 'highlight'];

const roleColors: Record<LcChartRole, string> = {
  success: '#008300', warning: '#eda100', error: '#e34948', info: '#2a78d6', neutral: '#898781', highlight: '#6250d6',
};

const theme: LcChartTheme = {
  categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  sequential: [], sequentialWarm: [], diverging: { negative: '', neutral: '', positive: '' },
  status: { good: '', warning: '', serious: '', critical: '' },
  roles: roleColors,
  surface: '#fcfcfb', gridline: '#e1e0d9', axis: '#c3c2b7',
  ink: { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781' }, markerColor: '#898781',
  fontFamily: 'sans-serif', fontSize: 14, reducedMotion: false, patterns: false,
};

const series = (id: string, extra: Partial<LcChartSeries> = {}): LcChartSeries => ({ id, label: id, values: [1, 2, 3], ...extra });
type AnyOption = Record<string, any>;

describe('couleur de série par rôle (K6)', () => {
  describe('palette (CA-K6.3, CA-K6.4)', () => {
    it.each(ROLES)('CA-K6.1 : colorRole="%s" prend la couleur du rôle du thème, pas un emplacement', (role) => {
      const prepared = prepareSeries([series('a', { colorRole: role })], new Map(), theme, 'Autres', new Set());
      expect(prepared.all[0].color).toBe(roleColors[role]);
      expect(prepared.all[0].slot).toBeNull();
      expect(prepared.all[0].role).toBe(role);
    });

    it('colorRole est prioritaire sur colorSlot', () => {
      const prepared = prepareSeries([series('a', { colorRole: 'error', colorSlot: 3 })], new Map(), theme, 'Autres', new Set());
      expect(prepared.all[0].color).toBe(roleColors.error);
      expect(prepared.all[0].slot).toBeNull();
    });

    it('CA-K6.3 : la couleur suit le rôle, pas le rang (ordre inversé, même couleur)', () => {
      const input = [series('ok', { colorRole: 'success' }), series('ko', { colorRole: 'error' })];
      const memory = new Map<string, LcColorSlot>();
      const forward = prepareSeries(input, memory, theme, 'Autres', new Set());
      const backward = prepareSeries([...input].reverse(), memory, theme, 'Autres', new Set());
      const colorOf = (prepared: typeof forward, id: string) => prepared.all.find((item) => item.id === id)!.color;
      expect(colorOf(backward, 'ok')).toBe(colorOf(forward, 'ok'));
      expect(colorOf(backward, 'ko')).toBe(colorOf(forward, 'ko'));
    });

    it('CA-K6.3 : masquer une série (par la légende) ne repeint ni les séries à rôle ni les séries à emplacement', () => {
      const input = [series('a'), series('ko', { colorRole: 'error' }), series('b'), series('hl', { colorRole: 'highlight' })];
      const memory = new Map<string, LcColorSlot>();
      const shown = prepareSeries(input, memory, theme, 'Autres', new Set());
      const hidden = prepareSeries(input, memory, theme, 'Autres', new Set(['ko']));
      expect(hidden.visible.map((item) => item.id)).toEqual(['a', 'b', 'hl']);
      expect(hidden.all.map((item) => item.color)).toEqual(shown.all.map((item) => item.color));
      const hiddenFirst = prepareSeries(input, memory, theme, 'Autres', new Set(['a']));
      expect(hiddenFirst.visible.map((item) => item.color)).toEqual([roleColors.error, theme.categorical[1], roleColors.highlight]);
    });

    it('une série à rôle ne consomme aucun emplacement : les autres séries gardent les emplacements 1, 2…', () => {
      const slots = assignColorSlots([series('ko', { colorRole: 'error' }), series('a'), series('ok', { colorRole: 'success' }), series('b')], new Map());
      expect([...slots.entries()]).toEqual([['a', 1], ['b', 2]]);
    });

    it('CA-K6.4 : les séries sans colorRole sont inchangées (couleur d\'emplacement, rôle absent, style inchangé)', () => {
      const prepared = prepareSeries([series('a'), series('b', { lineStyle: 'dashed', symbol: 'square' })], new Map(), theme, 'Autres', new Set());
      expect(prepared.all.map((item) => [item.color, item.slot, item.role, item.lineStyle, item.symbol])).toEqual([
        [theme.categorical[0], 1, undefined, undefined, undefined],
        [theme.categorical[1], 2, undefined, 'dashed', 'square'],
      ]);
    });

    it('neutral : trait en tirets par défaut, un lineStyle explicite l\'emporte ; chaque rôle a une forme de point stable', () => {
      const prepared = prepareSeries([series('n', { colorRole: 'neutral' }), series('m', { colorRole: 'neutral', lineStyle: 'solid' })], new Map(), theme, 'Autres', new Set());
      expect(prepared.all.map((item) => item.lineStyle)).toEqual(['dashed', 'solid']);
      expect(ROLES.map((role) => roleSymbol(role))).toEqual(['circle', 'triangle', 'square', 'circle', 'circle', 'diamond']);
    });

    it('sans token de rôle dans le thème : repli sur l\'encre atténuée (jamais de couleur vide)', () => {
      const bare = { ...theme, roles: undefined } as LcChartTheme;
      expect(roleColor('error', bare)).toBe('#898781');
    });

    it('chaque rôle a une icône du jeu par défaut, distincte', () => {
      const icons = ROLES.map((role) => LC_CHART_ROLE_ICONS[role]);
      expect(new Set(icons).size).toBe(6);
      for (const icon of icons) expect(LC_DEFAULT_ICONS[icon], icon).toMatch(/^<svg /);
    });
  });

  describe('décalque par rôle (CA-K6.1)', () => {
    it('error : hachures à 45° ; highlight : hachures à 135° ; neutral : pointillé ; success, warning, info : plein', () => {
      expect((roleDecal('error', theme) as AnyOption)['rotation']).toBeCloseTo(Math.PI / 4);
      expect((roleDecal('highlight', theme) as AnyOption)['rotation']).toBeCloseTo(-Math.PI / 4);
      expect((roleDecal('neutral', theme) as AnyOption)['symbol']).toBe('circle');
      for (const role of ['success', 'warning', 'info'] as const) expect(roleDecal(role, theme)).toBeUndefined();
    });

    it('les décalques d\'erreur et de relief sont distincts, quelle que soit la place de la série', () => {
      expect(roleDecal('error', theme)).not.toEqual(roleDecal('highlight', theme));
      expect(roleDecal('error', theme)).not.toEqual(roleDecal('neutral', theme));
    });

    it('warning : contour d\'encre de 1,5 px ; aucun autre rôle ni série sans rôle', () => {
      expect(roleOutline('warning', theme)).toEqual({ color: '#0b0b0b', width: 1.5 });
      for (const role of ['success', 'error', 'info', 'neutral', 'highlight', undefined] as const) expect(roleOutline(role, theme)).toBeUndefined();
    });
  });

  describe('options ECharts', () => {
    let format: LcFormatService;
    beforeEach(() => {
      format = TestBed.inject(LcFormatService);
    });

    const args = (input: LcChartSeries[], chartTheme: LcChartTheme = theme) => {
      const prepared = prepareSeries(input, new Map(), chartTheme, 'Autres', new Set()).visible;
      return {
        categories: ['2026', '2027', '2028'], series: prepared, summary: 'Résumé', theme: chartTheme, format, seriesCount: prepared.length,
        directLabels: 'auto' as const, yAxis: { format: 'integer' as const },
      };
    };
    const bar = (input: LcChartSeries[], chartTheme?: LcChartTheme) =>
      buildBarOption({ ...args(input, chartTheme), orientation: 'vertical', stacked: true, totals: false, totalLabel: 'Total' }) as AnyOption;

    it('CA-K6.1 : un décalque hachuré est présent avec patterns: "never" (theme.patterns = false) pour error et highlight', () => {
      expect(theme.patterns).toBe(false);
      const option = bar([series('ko', { colorRole: 'error' }), series('hl', { colorRole: 'highlight' }), series('n', { colorRole: 'neutral' })]);
      expect(option['series'][0].itemStyle.color).toBe(roleColors.error);
      expect(option['series'][0].itemStyle.decal.rotation).toBeCloseTo(Math.PI / 4);
      expect(option['series'][1].itemStyle.decal.rotation).toBeCloseTo(-Math.PI / 4);
      expect(option['series'][2].itemStyle.decal.symbol).toBe('circle');
    });

    it('CA-K6.1 : success, warning et info restent pleins, même avec patterns actifs (le décalque du rôle prime sur le rang)', () => {
      const patterned = { ...theme, patterns: true };
      const option = bar([series('a'), series('ok', { colorRole: 'success' }), series('w', { colorRole: 'warning' }), series('i', { colorRole: 'info' })], patterned);
      expect(option['series'][0].itemStyle.decal).toBeDefined(); // série sans rôle : alternance par rang inchangée
      for (const index of [1, 2, 3]) expect(option['series'][index].itemStyle.decal, `série ${index}`).toBeUndefined();
    });

    it('CA-K6.4 : une série sans rôle garde le comportement historique (aucun décalque si patterns inactifs, hachures 45°/135° sinon)', () => {
      const plain = bar([series('a'), series('b')]);
      expect(plain['series'][0].itemStyle.decal).toBeUndefined();
      expect(plain['series'][0].itemStyle.borderColor).toBe(theme.surface);
      expect(plain['series'][0].itemStyle.borderWidth).toBe(1);
      const patterned = bar([series('a'), series('b')], { ...theme, patterns: true });
      expect(patterned['series'][0].itemStyle.decal.rotation).toBeCloseTo(Math.PI / 4);
      expect(patterned['series'][1].itemStyle.decal.rotation).toBeCloseTo(-Math.PI / 4);
    });

    it('le rôle error reste identique quel que soit son rang (décalque et couleur stables)', () => {
      const first = bar([series('ko', { colorRole: 'error' }), series('x')]);
      const last = bar([series('x'), series('y'), series('ko', { colorRole: 'error' })]);
      expect(first['series'][0].itemStyle.decal).toEqual(last['series'][2].itemStyle.decal);
      expect(first['series'][0].itemStyle.color).toBe(last['series'][2].itemStyle.color);
    });

    it('warning : contour d\'encre 1,5 px sur les barres ; les autres séries gardent la bordure de surface', () => {
      const option = bar([series('w', { colorRole: 'warning' }), series('a')]);
      expect(option['series'][0].itemStyle.borderColor).toBe(theme.ink.primary);
      expect(option['series'][0].itemStyle.borderWidth).toBe(1.5);
      expect(option['series'][1].itemStyle.borderColor).toBe(theme.surface);
    });

    it('aires : décalque du rôle sur la zone, trait d\'encre pour warning non empilé', () => {
      const option = buildAreaOption({ ...args([series('ko', { colorRole: 'error' }), series('w', { colorRole: 'warning' })]), stacked: false }) as AnyOption;
      expect(option['series'][0].areaStyle.decal.rotation).toBeCloseTo(Math.PI / 4);
      expect(option['series'][0].areaStyle.color).toBe(roleColors.error);
      expect(option['series'][1].areaStyle.decal).toBeUndefined();
      expect(option['series'][1].lineStyle.color).toBe(theme.ink.primary);
      expect(option['series'][0].lineStyle.color).toBe(roleColors.error);
    });

    it('courbes : couleur du rôle, point propre au rôle, tirets pour neutral', () => {
      const option = buildLineOption({ ...args([series('ko', { colorRole: 'error' }), series('n', { colorRole: 'neutral' })]), showPoints: 'auto' }) as AnyOption;
      expect(option['series'][0].lineStyle.color).toBe(roleColors.error);
      expect(option['series'][0].symbol).toBe('square');
      expect(option['series'][1].lineStyle.type).toEqual(expect.any(Array));
    });

    it('info-bulle : l\'icône du rôle précède le libellé (barres et courbes) ; aucune icône sans rôle ; le libellé reste échappé', () => {
      const input = [series('ko', { label: '<img src=x onerror=alert(1)>', colorRole: 'error' }), series('a')];
      const barArgs = { ...args(input), orientation: 'vertical' as const, stacked: false, totals: false, totalLabel: 'Total' };
      const withRole = barTooltip(0, 0, barArgs, 'integer');
      const withoutRole = barTooltip(1, 0, barArgs, 'integer');
      expect(withRole).toContain('<svg ');
      expect(withRole.indexOf('<svg ')).toBeLessThan(withRole.indexOf('&lt;img'));
      expect(withRole).toContain('aria-hidden="true"');
      expect(withRole).not.toContain('<img');
      expect(withoutRole).not.toContain('<svg');
      const axis = axisTooltip(0, args(input), 'integer');
      expect(axis.match(/<svg /g)?.length).toBe(1);
    });
  });
});
