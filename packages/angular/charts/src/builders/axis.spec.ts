import { TestBed } from '@angular/core/testing';
import { LcFormatService } from '@lionelcointot/ui-angular';
import type { LcChartTheme, LcResolvedSeries } from '../types';
import { buildAreaOption } from './area.builder';
import { buildBarOption } from './bar.builder';
import { buildLineOption } from './line.builder';
import { annualTicks, axisMin } from './shared';

const theme: LcChartTheme = {
  categorical: ['#2a78d6'], sequential: [], sequentialWarm: [], diverging: { negative: '', neutral: '', positive: '' },
  status: { good: '', warning: '', serious: '', critical: '' },
  surface: '#fcfcfb', gridline: '#e1e0d9', axis: '#c3c2b7',
  ink: { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781' }, markerColor: '#777777',
  fontFamily: 'sans-serif', fontSize: 14, reducedMotion: false, patterns: false,
};

type AnyOption = Record<string, any>;

const months = (count: number, startYear = 2026, startMonth = 0): string[] =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(startYear, startMonth + index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });

describe('axe des valeurs : min et max imposés', () => {
  let format: LcFormatService;
  beforeEach(() => {
    format = TestBed.inject(LcFormatService);
  });

  const series = (values: number[]): LcResolvedSeries[] => [{ id: 'a', label: 'a', values, color: '#111', slot: null, patternIndex: 0 }];
  const base = (values: number[], yAxis: object) => ({
    categories: values.map((_, i) => String(i)), series: series(values), summary: 's', theme, format, seriesCount: 1,
    directLabels: 'none' as const, yAxis,
  });

  it('une courbe applique min et max (échelle commune à deux graphiques)', () => {
    const option = buildLineOption({ ...base([10, 20, 30], { min: 0, max: 100 }), showPoints: 'auto' }) as AnyOption;
    expect(option['yAxis'].min).toBe(0);
    expect(option['yAxis'].max).toBe(100);
  });

  it('une courbe avec un min positif est tronquée : rupture d\'axe affichée', () => {
    const option = buildLineOption({ ...base([10, 20, 30], { min: 5 }), showPoints: 'auto' }) as AnyOption;
    expect(option['yAxis'].min).toBe(5);
    expect(option['graphic']).toBeDefined();
  });

  it('un min positif explicite à 0 ne tronque pas, même pour des valeurs groupées loin de 0', () => {
    const option = buildLineOption({ ...base([1000, 1010, 1020], { min: 0 }), showPoints: 'auto' }) as AnyOption;
    expect(option['yAxis'].min).toBe(0);
    expect(option['graphic']).toBeUndefined();
  });

  it('une aire ou des barres ignorent un min positif (l\'axe part de 0) mais acceptent max et un min négatif', () => {
    const area = buildAreaOption({ ...base([10, 20, 30], { min: 5, max: 50 }), stacked: false }) as AnyOption;
    expect(area['yAxis'].min({ min: 10 })).toBe(0);
    expect(area['yAxis'].max).toBe(50);
    const bar = buildBarOption({ ...base([10, 20, 30], { min: 5 }), orientation: 'vertical', stacked: false, totals: false, totalLabel: 'Total' }) as AnyOption;
    expect(bar['yAxis'].min({ min: 10 })).toBe(0);
    const negative = buildAreaOption({ ...base([-10, 20, 30], { min: -50 }), stacked: false }) as AnyOption;
    expect(negative['yAxis'].min).toBe(-50);
  });

  it('axisMin : sans demande, comportement inchangé', () => {
    expect(axisMin(undefined, false)).toBeUndefined();
    expect((axisMin(undefined, true) as (v: { min: number }) => number)({ min: 4 })).toBe(0);
    expect(axisMin(3, false)).toBe(3);
  });
});

describe('axe des valeurs : pas minimal de 1 pour yAxis.format integer', () => {
  let format: LcFormatService;
  beforeEach(() => {
    format = TestBed.inject(LcFormatService);
  });

  const series: LcResolvedSeries[] = [{ id: 'a', label: 'a', values: [1, 0, 2], color: '#111', slot: null, patternIndex: 0 }];
  const base = (yAxis?: object) => ({
    categories: ['a', 'b', 'c'], series, summary: 's', theme, format, seriesCount: 1, directLabels: 'none' as const, yAxis,
  });
  const valueAxisOf = (kind: 'bar' | 'barH' | 'line' | 'area', yAxis?: object): AnyOption => {
    const args = base(yAxis);
    const option = kind === 'line' ? buildLineOption({ ...args, showPoints: 'auto' })
      : kind === 'area' ? buildAreaOption({ ...args, stacked: false })
      : buildBarOption({ ...args, orientation: kind === 'barH' ? 'horizontal' : 'vertical', stacked: false, totals: false, totalLabel: 'Total' }) as AnyOption;
    return (kind === 'barH' ? (option as AnyOption)['xAxis'] : (option as AnyOption)['yAxis']);
  };
  const kinds = ['bar', 'barH', 'line', 'area'] as const;

  kinds.forEach((kind) => {
    it(`${kind} : integer pose minInterval 1 sur l'axe des valeurs`, () => {
      expect(valueAxisOf(kind, { format: 'integer' })['minInterval']).toBe(1);
    });

    (['number', 'money', 'percent'] as const).forEach((valueFormat) => {
      it(`${kind} : ${valueFormat} ne pose pas de minInterval`, () => {
        expect(valueAxisOf(kind, { format: valueFormat })['minInterval']).toBeUndefined();
      });
    });

    it(`${kind} : sans format ni yAxis, pas de minInterval`, () => {
      expect(valueAxisOf(kind, {})['minInterval']).toBeUndefined();
      expect(valueAxisOf(kind, undefined)['minInterval']).toBeUndefined();
    });

    it(`${kind} : compact (true ou false) ne modifie pas minInterval`, () => {
      expect(valueAxisOf(kind, { format: 'integer', compact: false })['minInterval']).toBe(1);
      expect(valueAxisOf(kind, { format: 'integer', compact: true })['minInterval']).toBe(1);
      expect(valueAxisOf(kind, { format: 'number', compact: false })['minInterval']).toBeUndefined();
    });
  });

  it('integer ne change ni les formateurs de graduations ni min/max', () => {
    const integer = valueAxisOf('bar', { format: 'integer' });
    const number = valueAxisOf('bar', { format: 'number' });
    [0, 3, 1500, 2_500_000].forEach((value) => expect(integer['axisLabel'].formatter(value)).toBe(number['axisLabel'].formatter(value)));
    expect(integer['max']).toBeUndefined();
    expect(integer['min'](({ min: 4 }))).toBe(0);
  });

  it('integer avec compact false : graduations en entier complet, minInterval conservé', () => {
    const axis = valueAxisOf('bar', { format: 'integer', compact: false });
    expect(axis['axisLabel'].formatter(1500)).toBe(format.format(1500, 'integer'));
    expect(axis['minInterval']).toBe(1);
  });

  // Constat (ECharts 6 rendu en SSR) : avec max 0.5 ou 0.9, l'axe obtient les graduations [0, max] (donc une graduation fractionnaire
  // « 0,5 ») ; max 0 ou sans max donne [0, 1]. minInterval ne l'emporte pas sur un max imposé < 1 : cas absurde, hors usage courant.
  it('integer avec un max imposé < 1 : max transmis tel quel avec minInterval 1 (ECharts décide ; aucune garde dans le builder)', () => {
    const axis = valueAxisOf('line', { format: 'integer', max: 0.5 });
    expect(axis['max']).toBe(0.5);
    expect(axis['minInterval']).toBe(1);
  });

  it('integer avec max 0 : max 0 transmis (pas ignoré comme une valeur fausse), minInterval 1', () => {
    const axis = valueAxisOf('bar', { format: 'integer', max: 0 });
    expect(axis['max']).toBe(0);
    expect(axis['minInterval']).toBe(1);
  });
});

describe('graduations annuelles (annualTicks)', () => {
  const labelled = (ticks: readonly (string | null)[] | null) => (ticks ?? []).filter((tick): tick is string => tick !== null);

  it('480 mois : quelques années étiquetées (≤ 12), jamais une étiquette par mois', () => {
    const ticks = annualTicks(months(480, 2026, 5), 'month')!;
    const years = labelled(ticks);
    expect(ticks).toHaveLength(480);
    expect(years.length).toBeGreaterThanOrEqual(2);
    expect(years.length).toBeLessThanOrEqual(12);
    expect(years[0]).toBe('2030');
    expect(years.at(1)).toBe('2035');
    ticks.forEach((tick, index) => { if (tick !== null) expect(months(480, 2026, 5)[index].endsWith('-01')).toBe(true); });
  });

  it('36 mois : une étiquette par année', () => {
    expect(labelled(annualTicks(months(36, 2026, 0), 'month'))).toEqual(['2026', '2027', '2028']);
  });

  it('120 mois : une année sur deux au-delà de 12 étiquettes… ou chaque année tant que ça tient', () => {
    expect(labelled(annualTicks(months(120, 2026, 0), 'month')).length).toBeLessThanOrEqual(12);
  });

  it('ne s\'applique pas à ≤ 24 catégories, aux libellés libres ni sans deux janviers repérables', () => {
    expect(annualTicks(months(24), 'month')).toBeNull();
    expect(annualTicks(months(100), 'label')).toBeNull();
    expect(annualTicks(Array.from({ length: 40 }, (_, i) => `Mois ${i}`), 'month')).toBeNull();
    expect(annualTicks(Array.from({ length: 40 }, (_, i) => `2026-${String((i % 11) + 2).padStart(2, '0')}`), 'month')).toBeNull();
  });

  it('la courbe de 480 mois utilise l\'axe annuel (intervalle et formateur)', () => {
    const format = TestBed.inject(LcFormatService);
    const categories = months(480, 2026, 5);
    const ticks = annualTicks(categories, 'month');
    const option = buildLineOption({
      categories, series: [{ id: 'a', label: 'a', values: categories.map((_, i) => i), color: '#111', slot: null, patternIndex: 0 }],
      summary: 's', theme, format, seriesCount: 1, directLabels: 'none', showPoints: 'auto', annualTicks: ticks,
    }) as AnyOption;
    const label = option['xAxis'].axisLabel;
    const first = ticks!.findIndex((tick) => tick !== null);
    expect(label.interval(first)).toBe(true);
    expect(label.interval(first + 1)).toBe(false);
    expect(label.formatter('x', first)).toBe(ticks![first]);
    expect(label.formatter('x', first + 1)).toBe('');
    expect(option['xAxis'].axisTick.show).toBe(true);
  });
});
