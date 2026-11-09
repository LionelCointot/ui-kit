import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_FR, LcFormatService } from '@lionelcointot/ui-angular';
import type { LcChartTheme, LcResolvedSeries } from '../types';
import { buildAreaOption } from './area.builder';
import { buildBarOption, categoryTotals, endOfStackIndex, radius } from './bar.builder';
import { escapeHtml } from './escape-html';
import { buildLineOption, lineAxisIsTruncated, showDirectLabels } from './line.builder';
import { buildSegmentedBarOption, prepareParts, segmentLabel } from './segmented-bar.builder';
import { buildSparklineOption } from './sparkline.builder';
import { formatTick, readableOn } from './shared';
import { buildCartesianTable } from './table';

const theme: LcChartTheme = {
  categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  sequential: [], diverging: { negative: '', neutral: '', positive: '' },
  status: { good: '', warning: '', serious: '', critical: '' },
  surface: '#fcfcfb', gridline: '#e1e0d9', axis: '#c3c2b7',
  ink: { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781' }, markerColor: '#898781',
  fontFamily: 'sans-serif', fontSize: 14, reducedMotion: false, patterns: false,
};

function resolved(id: string, values: (number | null)[], color: string, index = 0, stack?: string): LcResolvedSeries {
  return { id, label: id, values, color, slot: null, patternIndex: index, stack };
}

type AnyOption = Record<string, any>;

describe('builders de graphiques', () => {
  let format: LcFormatService;
  beforeEach(() => {
    format = TestBed.inject(LcFormatService);
  });

  const base = (series: LcResolvedSeries[], extra: AnyOption = {}) => ({
    categories: ['2026', '2027', '2028'], series, summary: 'Résumé', theme, format, seriesCount: series.length, directLabels: 'auto' as const,
    yAxis: { format: 'money' as const }, ...extra,
  });

  describe('escapeHtml', () => {
    it('neutralise le HTML d\'un libellé non fiable', () => {
      expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
      expect(escapeHtml(`"A" & 'B'`)).toBe('&quot;A&quot; &amp; &#39;B&#39;');
    });
  });

  describe('axes et graduations', () => {
    it('formate les graduations en compact et l\'info-bulle au format complet', () => {
      expect(formatTick(250000, { format: 'money' }, format).replace(/\s/g, '')).toBe('250k€');
      expect(formatTick(250000, { format: 'money', compact: false }, format).replace(/\s/g, '')).toBe('250000,00€');
    });

    it('l\'axe des valeurs part de 0 pour les aires et les barres', () => {
      const data = [resolved('a', [100, 110, 120], '#111')];
      const area = buildAreaOption({ ...base(data), stacked: true }) as AnyOption;
      const bar = buildBarOption({ ...base(data), orientation: 'vertical', stacked: false, totals: false, totalLabel: 'Total' }) as AnyOption;
      expect(area['yAxis'].min({ min: 100 })).toBe(0);
      expect(bar['yAxis'].min({ min: 100 })).toBe(0);
      expect(area['yAxis'].min({ min: -20 })).toBe(-20);
    });

    it('une seule définition d\'axe des valeurs par graphique', () => {
      const option = buildLineOption({ ...base([resolved('a', [1, 2, 3], '#111')]), showPoints: 'auto' }) as AnyOption;
      expect(Array.isArray(option['yAxis'])).toBe(false);
      expect(option['yAxis'].type).toBe('value');
    });

    it('une courbe groupée loin de 0 peut ne pas partir de 0 et affiche une rupture d\'axe', () => {
      const data = [resolved('a', [1000, 1010, 1020], '#111')];
      expect(lineAxisIsTruncated(data)).toBe(true);
      const option = buildLineOption({ ...base(data), showPoints: 'auto' }) as AnyOption;
      expect(option['graphic']).toBeDefined();
      expect(lineAxisIsTruncated([resolved('a', [0, 500, 1000], '#111')])).toBe(false);
    });
  });

  describe('courbes', () => {
    it('trait de 2 px sans lissage, trous conservés, points si ≤ 24 catégories', () => {
      const option = buildLineOption({ ...base([resolved('a', [1, null, 3], '#111')]), showPoints: 'auto' }) as AnyOption;
      const series = option['series'][0];
      expect(series.lineStyle.width).toBe(2);
      expect(series.smooth).toBe(false);
      expect(series.connectNulls).toBe(false);
      expect(series.symbol).toBe('circle');
      expect(series.data).toEqual([1, null, 3]);
      const many = buildLineOption({ ...base([resolved('a', [1], '#111')], { categories: Array.from({ length: 30 }, (_, i) => String(i)) }), showPoints: 'auto' }) as AnyOption;
      expect(many['series'][0].symbol).toBe('none');
    });

    it('étiquettes directes jusqu\'à 4 séries', () => {
      expect(showDirectLabels('auto', 4)).toBe(true);
      expect(showDirectLabels('auto', 5)).toBe(false);
      expect(showDirectLabels('none', 2)).toBe(false);
      const option = buildLineOption({ ...base([resolved('a', [1, 2, 3], '#111')]), showPoints: 'auto' }) as AnyOption;
      expect(option['series'][0].endLabel.show).toBe(true);
    });

    it('complète les valeurs manquantes par des trous', () => {
      const option = buildLineOption({ ...base([resolved('a', [1], '#111')]), showPoints: 'auto' }) as AnyOption;
      expect(option['series'][0].data).toEqual([1, null, null]);
    });

    it('une seule info-bulle liste toutes les séries et échappe les libellés', () => {
      const data = [resolved('a', [1, 2, 3], '#111'), { ...resolved('b', [4, 5, 6], '#222'), label: '<img src=x onerror=alert(1)>' }];
      const option = buildLineOption({ ...base(data), showPoints: 'auto' }) as AnyOption;
      const html = option['tooltip'].formatter([{ dataIndex: 1 }]) as string;
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).toContain('2027');
      expect(html.match(/<strong/g)?.length).toBe(2);
    });

    it('désactive l\'animation sous mouvement réduit', () => {
      const option = buildLineOption({ ...base([resolved('a', [1, 2, 3], '#111')]), theme: { ...theme, reducedMotion: true }, showPoints: 'auto' }) as AnyOption;
      expect(option['animation']).toBe(false);
    });
  });

  describe('aires', () => {
    it('empilées : bandes pleines séparées par un trait de la couleur de surface', () => {
      const data = [resolved('a', [1, 2, 3], '#111'), resolved('b', [1, 2, 3], '#222', 1)];
      const option = buildAreaOption({ ...base(data), stacked: true }) as AnyOption;
      expect(option['series'][0].stack).toBe('total');
      expect(option['series'][0].areaStyle.opacity).toBe(1);
      expect(option['series'][0].lineStyle.color).toBe(theme.surface);
    });

    it('motifs actifs : hachures à 45° puis 135°', () => {
      const data = [resolved('a', [1, 2, 3], '#111'), resolved('b', [1, 2, 3], '#222', 1)];
      const option = buildAreaOption({ ...base(data, { theme: { ...theme, patterns: true } }), stacked: true }) as AnyOption;
      expect(option['series'][0].areaStyle.decal.rotation).toBeCloseTo(Math.PI / 4);
      expect(option['series'][1].areaStyle.decal.rotation).toBeCloseTo(-Math.PI / 4);
      const without = buildAreaOption({ ...base(data), stacked: true }) as AnyOption;
      expect(without['series'][0].areaStyle.decal).toBeUndefined();
    });
  });

  describe('barres', () => {
    const data = [resolved('a', [10, 20, 30], '#111', 0, undefined), resolved('b', [5, 5, 5], '#222', 1)];

    it('totaux, arrondi de l\'extrémité extérieure seulement, espace de surface', () => {
      expect(categoryTotals(data, 3)).toEqual([15, 25, 35]);
      expect(endOfStackIndex(data, 0, undefined, false)).toBe(1);
      expect(radius(5, true, false)).toEqual([4, 4, 0, 0]);
      expect(radius(-5, true, false)).toEqual([0, 0, 4, 4]);
      expect(radius(5, false, false)).toEqual([0, 0, 0, 0]);
      expect(radius(5, true, true)).toEqual([0, 4, 4, 0]);
      const option = buildBarOption({ ...base(data), orientation: 'vertical', stacked: true, totals: true, totalLabel: 'Total' }) as AnyOption;
      expect(option['series'][0].data[0].itemStyle.borderRadius).toEqual([0, 0, 0, 0]);
      expect(option['series'][1].data[0].itemStyle.borderRadius).toEqual([4, 4, 0, 0]);
      expect(option['series'][0].itemStyle.borderColor).toBe(theme.surface);
      expect(option['series'].length).toBe(3);
      expect(option['series'][2].label.formatter({ dataIndex: 2 }).replace(/\s/g, '')).toBe('35€');
    });

    it('pas de totaux au-delà de 12 catégories ni sans empilement', () => {
      const unstacked = buildBarOption({ ...base(data), orientation: 'vertical', stacked: false, totals: true, totalLabel: 'Total' }) as AnyOption;
      expect(unstacked['series'].length).toBe(2);
      const long = buildBarOption({
        ...base(data, { categories: Array.from({ length: 13 }, (_, i) => String(i)) }), orientation: 'vertical', stacked: true, totals: true, totalLabel: 'Total',
      }) as AnyOption;
      expect(long['series'].length).toBe(2);
    });

    it('info-bulle de marque : catégorie, série, valeur et total si empilé, libellés échappés', () => {
      const evil = [{ ...data[0], label: '<script>x</script>' }, data[1]];
      const option = buildBarOption({ ...base(evil), orientation: 'vertical', stacked: true, totals: false, totalLabel: 'Total' }) as AnyOption;
      const html = option['tooltip'].formatter({ seriesIndex: 0, dataIndex: 1 }) as string;
      expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
      expect(html).not.toContain('<script>');
      expect(html).toContain('Total');
      expect(html).toContain('2027');
    });

    it('horizontal : les axes sont permutés', () => {
      const option = buildBarOption({ ...base(data), orientation: 'horizontal', stacked: false, totals: false, totalLabel: 'Total' }) as AnyOption;
      expect(option['xAxis'].type).toBe('value');
      expect(option['yAxis'].type).toBe('category');
    });
  });

  describe('barre segmentée', () => {
    const labels = LC_LABELS_FR;
    const parts = [
      { id: 'a', label: 'Capital', value: 600 },
      { id: 'b', label: 'Intérêts', value: 300 },
      { id: 'c', label: 'Assurance', value: 100 },
    ];

    it('calcule les parts et attribue les couleurs dans l\'ordre', () => {
      const prepared = prepareParts(parts, undefined, new Map(), theme, labels);
      expect(prepared.parts.map((part) => part.color)).toEqual([theme.categorical[0], theme.categorical[1], theme.categorical[2]]);
      expect(prepared.parts.map((part) => part.share)).toEqual([0.6, 0.3, 0.1]);
      expect(prepared.total).toBe(1000);
    });

    it('regroupe au-delà de 6 parts en « Autres »', () => {
      const many = Array.from({ length: 9 }, (_, index) => ({ id: `p${index}`, label: `P${index}`, value: 10 }));
      const prepared = prepareParts(many, undefined, new Map(), theme, labels);
      expect(prepared.parts.length).toBe(6);
      expect(prepared.parts[5].label).toBe('Autres');
      expect(prepared.parts[5].value).toBe(40);
      expect(prepared.parts[5].color).toBe(theme.ink.muted);
    });

    it('ajoute « Non réparti » si total dépasse la somme, signale un total insuffisant', () => {
      const more = prepareParts(parts, 1200, new Map(), theme, labels);
      expect(more.parts.at(-1)!.label).toBe('Non réparti');
      expect(more.parts.at(-1)!.value).toBe(200);
      expect(more.inconsistentTotal).toBe(false);
      expect(prepareParts(parts, 500, new Map(), theme, labels).inconsistentTotal).toBe(true);
    });

    it('imprime la valeur si elle tient, la part si le segment est étroit, rien s\'il est trop petit', () => {
      const prepared = prepareParts([...parts, { id: 'd', label: 'Frais', value: 20 }, { id: 'e', label: 'Taxe', value: 5 }], undefined, new Map(), theme, labels);
      const [capital, , assurance, frais, taxe] = prepared.parts;
      expect(segmentLabel(capital, 'integer', format)).toBe('600');
      expect(segmentLabel(assurance, 'integer', format)?.replace(/\s/g, ' ')).toBe('10 %');
      expect(segmentLabel(frais, 'integer', format)).toBeNull();
      expect(segmentLabel(taxe, 'integer', format)).toBeNull();
    });

    it('variante fine : aucun texte sur les segments ; info-bulle avec part en % et libellé échappé', () => {
      const prepared = prepareParts([{ id: 'a', label: '<b>x</b>', value: 1 }, { id: 'b', label: 'B', value: 1 }], undefined, new Map(), theme, labels);
      const common = { prepared, valueFormat: 'integer' as const, summary: 's', shareLabel: 'Part', theme, format };
      const thin = buildSegmentedBarOption({ ...common, variant: 'thin' }) as AnyOption;
      expect(thin['series'].every((item: AnyOption) => item['label'].show === false)).toBe(true);
      const tall = buildSegmentedBarOption({ ...common, variant: 'tall' }) as AnyOption;
      expect(tall['series'][1]['label'].show).toBe(true);
      const html = tall['tooltip'].formatter({ seriesIndex: 0 }) as string;
      expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
      expect(html.replace(/\s/g, ' ')).toContain('50,0');
    });
  });

  describe('sparkline et utilitaires', () => {
    it('sparkline : une série, ni axe ni info-bulle', () => {
      const option = buildSparklineOption({ values: [1, 2, 3], summary: 'Tendance', theme, showEndPoint: true }) as AnyOption;
      expect(option['xAxis'].show).toBe(false);
      expect(option['yAxis'].show).toBe(false);
      expect(option['tooltip'].show).toBe(false);
      expect(option['series'].length).toBe(1);
      expect(option['series'][0].symbol(0, { dataIndex: 2 })).toBe('circle');
      expect(option['series'][0].symbol(0, { dataIndex: 0 })).toBe('none');
    });

    it('texte lisible sur chaque couleur de série (encre ou surface, jamais un littéral)', () => {
      expect(readableOn('#eda100', theme)).toBe(theme.ink.primary);
      expect(readableOn('#184f95', theme)).toBe(theme.surface);
    });

    it('vue tableau : toutes les séries, valeurs au format complet', () => {
      const table = buildCartesianTable(['2026', '2027'], [resolved('a', [1000, null], '#111')], 'money', format, LC_LABELS_FR);
      expect(table.columns).toEqual(['Catégorie', 'a']);
      expect(String(table.rows[0][1]).replace(/\s/g, ' ')).toContain('1 000,00');
      expect(table.rows[1][1]).toBe('—');
    });
  });
});

void LC_LABELS;
