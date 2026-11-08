import type { EChartsCoreOption } from 'echarts/core';
import { LcFormatService, LcLabels, LcValueFormat } from '@lionelcointot/ui-angular';
import type { LcChartTheme, LcColorSlot, LcPart } from '../types';
import { assignColorSlots } from './palette';
import { baseOption, formatFull, readableOn, textStyle, tooltipBase, tooltipHtml } from './shared';

export const MAX_SEGMENTS = 6;
export const OTHER_PART_ID = '__other__';
export const UNALLOCATED_PART_ID = '__unallocated__';
const MIN_LABEL_SHARE = 0.06;
const VALUE_LABEL_SHARE = 0.15;

export interface ResolvedPart {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly color: string;
  readonly share: number;
}

export interface PreparedParts {
  readonly parts: readonly ResolvedPart[];
  /** Total de référence (somme des parts, ou `total` s'il est plus grand). */
  readonly total: number;
  /** `total` fourni inférieur à la somme des parts : incohérence à signaler en développement. */
  readonly inconsistentTotal: boolean;
}

/** Regroupe au-delà de 6 parts, ajoute « Non réparti » si `total` est supérieur à la somme, attribue les couleurs. */
export function prepareParts(
  parts: readonly LcPart[],
  total: number | undefined,
  memory: Map<string, LcColorSlot>,
  theme: LcChartTheme,
  labels: Pick<LcLabels, 'other' | 'unallocated'>,
): PreparedParts {
  const positive = parts.filter((part) => Number.isFinite(part.value) && part.value > 0);
  const folded = positive.length > MAX_SEGMENTS
    ? [
        ...positive.slice(0, MAX_SEGMENTS - 1),
        { id: OTHER_PART_ID, label: labels.other, value: positive.slice(MAX_SEGMENTS - 1).reduce((sum, part) => sum + part.value, 0) } as LcPart,
      ]
    : positive;
  const slots = assignColorSlots(folded.map((part) => ({ id: part.id, label: part.label, values: [], colorSlot: part.colorSlot })), memory);
  const sum = folded.reduce((acc, part) => acc + part.value, 0);
  const reference = total !== undefined && total > sum ? total : sum;
  const resolved: ResolvedPart[] = folded.map((part) => {
    const slot = slots.get(part.id);
    return {
      id: part.id, label: part.label, value: part.value,
      color: part.id === OTHER_PART_ID || !slot ? theme.ink.muted : theme.categorical[slot - 1],
      share: reference > 0 ? part.value / reference : 0,
    };
  });
  if (total !== undefined && total > sum) {
    resolved.push({ id: UNALLOCATED_PART_ID, label: labels.unallocated, value: total - sum, color: theme.axis, share: (total - sum) / reference });
  }
  return { parts: resolved, total: reference, inconsistentTotal: total !== undefined && total < sum };
}

export interface SegmentedBuildArgs {
  readonly prepared: PreparedParts;
  readonly valueFormat: LcValueFormat;
  readonly variant: 'tall' | 'thin';
  readonly summary: string;
  /** Libellé de la part en % dans l'info-bulle. */
  readonly shareLabel: string;
  readonly theme: LcChartTheme;
  readonly format: LcFormatService;
  readonly animate?: boolean;
}

/** Texte imprimé sur un segment : valeur si elle tient, sinon part en %, rien si le segment est trop étroit. */
export function segmentLabel(part: ResolvedPart, valueFormat: LcValueFormat, format: LcFormatService): string | null {
  if (part.share < MIN_LABEL_SHARE) return null;
  return part.share >= VALUE_LABEL_SHARE ? formatFull(part.value, valueFormat, format) : format.percent(part.share * 100, 0);
}

/** Option ECharts d'une barre segmentée : une barre empilée à 100 % de la largeur, segments séparés par 2 px de surface. */
export function buildSegmentedBarOption(args: SegmentedBuildArgs): EChartsCoreOption {
  const { prepared, theme, format, valueFormat } = args;
  const tall = args.variant === 'tall';
  return {
    ...baseOption(theme, args.summary, args.animate ?? true),
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    tooltip: {
      ...tooltipBase(theme),
      trigger: 'item',
      formatter: (params: unknown) => segmentTooltip(prepared.parts[(params as { seriesIndex: number }).seriesIndex], args),
    },
    xAxis: { type: 'value', show: false, min: 0, max: prepared.total },
    yAxis: { type: 'category', show: false, data: [''] },
    series: prepared.parts.map((part) => {
      const text = tall ? segmentLabel(part, valueFormat, format) : null;
      return {
        id: part.id,
        name: part.label,
        type: 'bar',
        stack: 'total',
        barWidth: '100%',
        data: [part.value],
        itemStyle: { color: part.color, borderColor: theme.surface, borderWidth: 1 },
        emphasis: { focus: 'none', itemStyle: { opacity: 0.85 } },
        label: {
          show: text !== null,
          position: 'inside',
          formatter: () => text ?? '',
          overflow: 'truncate',
          ...textStyle(theme, readableOn(part.color, theme)),
          fontWeight: 600,
        },
      };
    }),
  };
}

/** Info-bulle d'un segment : libellé, montant, part en %. */
export function segmentTooltip(part: ResolvedPart | undefined, args: SegmentedBuildArgs): string {
  if (!part) return '';
  return tooltipHtml(null, [{ color: part.color, shape: 'rect', label: part.label, value: formatFull(part.value, args.valueFormat, args.format) }], args.theme,
    { label: args.shareLabel, value: args.format.percent(part.share * 100, 1) });
}
