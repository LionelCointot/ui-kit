import { LC_DEFAULT_ICONS, LcFormatService, LcValueFormat, isoToLocalDate } from '@lionelcointot/ui-angular';
import type { LcCartesianData, LcChartTheme, LcChartValue, LcResolvedSeries, LcValueAxis } from '../types';
import { escapeHtml } from './escape-html';
import { LC_CHART_ROLE_ICONS, patternDecal, roleDecal, roleOutline } from './series-roles';
import { updateMotion } from '../theme/chart-motion';

export const GRID_BOTTOM = 32;
export const GRID_LEFT = 56;
export const SERIES_STROKE = 2;
export const BAR_RADIUS = 4;

/** Valeur formatée en entier (info-bulle, tableau). */
export function formatFull(value: LcChartValue | undefined, valueFormat: LcValueFormat, format: LcFormatService): string {
  return format.format(value, valueFormat);
}

/** Graduation d'axe : format compact (« 250 k€ »), le format complet est réservé à l'info-bulle et au tableau. */
export function formatTick(value: number, axis: LcValueAxis | undefined, format: LcFormatService): string {
  const valueFormat = axis?.format ?? 'number';
  if (axis?.compact === false) return format.format(value, valueFormat);
  if (valueFormat === 'money') return format.money(value, { compact: true });
  if (valueFormat === 'number' || valueFormat === 'integer') return format.compactNumber(value);
  if (valueFormat === 'percent') return format.percent(value, 0);
  return format.format(value, valueFormat);
}

export function formatCategory(category: string, kind: LcCartesianData['categoryKind'], format: LcFormatService): string {
  if (kind === 'date') return isoToLocalDate(category) ? format.date(category) : category;
  if (kind === 'month') {
    const iso = /^\d{4}-\d{2}$/.test(category) ? `${category}-01` : category;
    return isoToLocalDate(iso) ? format.date(iso, 'month') : category;
  }
  return category;
}

export function categoryLabels(data: LcCartesianData, format: LcFormatService): string[] {
  return data.categories.map((category) => formatCategory(category, data.categoryKind, format));
}

/** Valeurs complétées par `null` pour atteindre `length` (valeurs plus courtes que les catégories). */
export function padValues(values: readonly LcChartValue[], length: number): LcChartValue[] {
  return Array.from({ length }, (_, index) => values[index] ?? null);
}

export function textStyle(theme: LcChartTheme, color: string): { color: string; fontFamily: string; fontSize: number } {
  return { color, fontFamily: theme.fontFamily, fontSize: theme.fontSize };
}

/** Motif de hachures à 45° ou 135°, ton sur ton (couleur de surface), alterné selon le rang de la série. */
export function decalFor(index: number, theme: LcChartTheme): object | undefined {
  if (!theme.patterns) return undefined;
  const spacing = 4 + (index % 3) * 2;
  return {
    symbol: 'rect',
    symbolSize: 1,
    dashArrayX: [1, 0],
    dashArrayY: [2, spacing],
    rotation: index % 2 === 0 ? Math.PI / 4 : -Math.PI / 4,
    color: theme.surface,
  };
}

/**
 * Décalque d'une série : celui de son rôle, sinon son motif imposé (`pattern`, `solid` = aplat) ; l'un et l'autre
 * toujours appliqués. Sinon l'alternance par rang (si les motifs sont actifs).
 */
export function seriesDecal(item: LcResolvedSeries, theme: LcChartTheme): object | undefined {
  if (item.role) return roleDecal(item.role, theme);
  if (item.pattern) return patternDecal(item.pattern, theme);
  return decalFor(item.patternIndex, theme);
}

/** Bordure des marques pleines : couleur de surface (séparation), ou contour d'encre pour le rôle `warning`. */
export function markBorder(item: LcResolvedSeries, theme: LcChartTheme, surfaceWidth = 1): { borderColor: string; borderWidth: number } {
  const outline = roleOutline(item.role, theme);
  return outline ? { borderColor: outline.color, borderWidth: outline.width } : { borderColor: theme.surface, borderWidth: surfaceWidth };
}

/** Icône du rôle de la série en SVG en ligne (constante du jeu d'icônes par défaut, jamais une saisie), pour l'info-bulle. */
export function roleIconHtml(item: LcResolvedSeries): string {
  const svg = item.role ? LC_DEFAULT_ICONS[LC_CHART_ROLE_ICONS[item.role]] : undefined;
  if (!svg) return '';
  return `<span style="display:inline-block;width:12px;height:12px;margin-inline-end:4px;vertical-align:middle">${svg.replace('<svg ', '<svg width="12" height="12" aria-hidden="true" ')}</span>`;
}

/** Pastille de couleur de série pour les info-bulles (la couleur n'est jamais appliquée au texte). */
export function swatchHtml(color: string, shape: 'line' | 'rect'): string {
  const size = shape === 'line' ? 'width:12px;height:3px' : 'width:10px;height:10px;border-radius:2px';
  return `<span style="display:inline-block;${size};background:${escapeHtml(color)};margin-inline-end:8px;vertical-align:middle"></span>`;
}

export interface TooltipRow {
  readonly color: string;
  readonly shape: 'line' | 'rect';
  readonly label: string;
  readonly value: string;
  /** SVG en ligne du rôle de la série (voir `roleIconHtml`), placé avant le libellé. */
  readonly iconHtml?: string;
}

/** Info-bulle : valeur d'abord (gras), libellé ensuite (secondaire) ; tous les libellés sont échappés. */
export function tooltipHtml(title: string | null, rows: readonly TooltipRow[], theme: LcChartTheme, footer?: { label: string; value: string }): string {
  const head = title === null ? '' : `<div style="color:${theme.ink.secondary};margin-bottom:4px">${escapeHtml(title)}</div>`;
  const body = rows.map((row) =>
    `<div style="display:flex;align-items:center;gap:8px;justify-content:space-between">`
    + `<span>${swatchHtml(row.color, row.shape)}${row.iconHtml ?? ''}<span style="color:${theme.ink.secondary}">${escapeHtml(row.label)}</span></span>`
    + `<strong style="color:${theme.ink.primary};font-variant-numeric:tabular-nums">${escapeHtml(row.value)}</strong></div>`).join('');
  const foot = footer
    ? `<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px;padding-top:4px;border-top:1px solid ${theme.gridline}">`
      + `<span style="color:${theme.ink.secondary}">${escapeHtml(footer.label)}</span>`
      + `<strong style="color:${theme.ink.primary};font-variant-numeric:tabular-nums">${escapeHtml(footer.value)}</strong></div>`
    : '';
  return `<div style="min-width:140px">${head}${body}${foot}</div>`;
}

export function tooltipBase(theme: LcChartTheme): object {
  return {
    confine: true,
    appendToBody: false,
    backgroundColor: theme.surface,
    borderColor: theme.axis,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: textStyle(theme, theme.ink.primary),
    extraCssText: 'box-shadow:0 2px 8px rgba(0,0,0,.2);border-radius:6px;',
  };
}

/** Au-delà de ce nombre de catégories datées, l'axe n'étiquette plus chaque catégorie mais les années. */
const ANNUAL_TICKS_MIN_CATEGORIES = 24;
/** Nombre maximal d'étiquettes d'années sur l'axe. */
const ANNUAL_TICKS_MAX_LABELS = 12;
const YEAR_STEPS: readonly number[] = [1, 2, 5, 10, 20, 25, 50, 100];

/**
 * Graduations annuelles d'un axe de mois ou de dates nombreux (ex. 480 mois) : pour chaque catégorie, l'année à
 * étiqueter (premier janvier rencontré, d'une année sur deux, cinq… selon la densité) ou `null`. Renvoie `null`
 * quand le cas ne s'applique pas (autre type de catégorie, ≤ 24 catégories, moins de deux années repérables).
 */
export function annualTicks(categories: readonly string[], kind: LcCartesianData['categoryKind']): readonly (string | null)[] | null {
  if ((kind !== 'month' && kind !== 'date') || categories.length <= ANNUAL_TICKS_MIN_CATEGORIES) return null;
  const januaries: { index: number; year: number }[] = [];
  let previous = '';
  categories.forEach((category, index) => {
    const parsed = /^(\d{4})-(\d{2})/.exec(category);
    if (!parsed) return;
    const month = `${parsed[1]}-${parsed[2]}`;
    if (parsed[2] === '01' && month !== previous) januaries.push({ index, year: Number(parsed[1]) });
    previous = month;
  });
  if (januaries.length < 2) return null;
  const step = YEAR_STEPS.find((candidate) => Math.ceil(januaries.length / candidate) <= ANNUAL_TICKS_MAX_LABELS) ?? YEAR_STEPS[YEAR_STEPS.length - 1];
  const aligned = januaries.filter(({ year }) => year % step === 0);
  const chosen = aligned.length >= 2 ? aligned : januaries.filter((_, position) => position % step === 0);
  const ticks: (string | null)[] = categories.map(() => null);
  for (const { index, year } of chosen) ticks[index] = String(year);
  return ticks;
}

/**
 * Axe des catégories commun : ligne de base `axis`, graduations en `ink.muted`. Avec `ticks` (voir `annualTicks`),
 * seules les catégories portant une année sont étiquetées et graduées.
 */
export function categoryAxis(
  labels: readonly string[], theme: LcChartTheme, horizontalBars = false, ticks?: readonly (string | null)[] | null,
): object {
  const onTick = (index: number): boolean => ticks?.[index] != null;
  return {
    type: 'category',
    data: labels,
    boundaryGap: horizontalBars ? true : undefined,
    axisLine: { lineStyle: { color: theme.axis } },
    axisTick: ticks ? { show: true, interval: onTick, lineStyle: { color: theme.axis } } : { show: false },
    axisLabel: ticks
      ? { ...textStyle(theme, theme.ink.muted), hideOverlap: true, interval: onTick, formatter: (_value: string, index: number) => ticks[index] ?? '' }
      : { ...textStyle(theme, theme.ink.muted), hideOverlap: true },
  };
}

/**
 * Borne basse de l'axe : le `min` demandé s'il est compatible (un axe « depuis 0 » n'accepte qu'un `min` ≤ 0),
 * sinon 0 ou la plus petite valeur négative, sinon automatique.
 */
export function axisMin(requested: number | undefined, fromZero: boolean): number | ((value: { min: number }) => number) | undefined {
  if (requested !== undefined && !(fromZero && requested > 0)) return requested;
  return fromZero ? (value: { min: number }) => Math.min(0, value.min) : undefined;
}

/** Axe unique des valeurs : filets horizontaux `gridline`, graduations compactes ; pas minimal de 1 pour un format entier. */
export function valueAxis(options: { axis?: LcValueAxis; theme: LcChartTheme; format: LcFormatService; fromZero: boolean }): object {
  const { axis, theme, format, fromZero } = options;
  return {
    type: 'value',
    name: axis?.label,
    nameTextStyle: textStyle(theme, theme.ink.muted),
    min: axisMin(axis?.min, fromZero),
    max: axis?.max,
    minInterval: axis?.format === 'integer' ? 1 : undefined,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: true, lineStyle: { color: theme.gridline } },
    axisLabel: { ...textStyle(theme, theme.ink.muted), formatter: (value: number) => formatTick(value, axis, format) },
  };
}

export function minMax(series: readonly LcResolvedSeries[]): { min: number; max: number } | null {
  const numbers = series.flatMap((item) => item.values).filter((value): value is number => typeof value === 'number');
  return numbers.length === 0 ? null : { min: Math.min(...numbers), max: Math.max(...numbers) };
}

/** Option `aria` d'ECharts : résumé généré, motifs gérés par nos builders (jamais ceux d'ECharts). */
export function ariaOption(summary: string): object {
  return { enabled: true, label: { description: summary }, decal: { show: false } };
}

/** Options communes : animation (durées des tokens), coupée sous mouvement réduit. */
export function baseOption(theme: LcChartTheme, summary: string, animate = true): object {
  return {
    animation: animate && !theme.reducedMotion,
    ...updateMotion(theme),
    backgroundColor: 'transparent',
    textStyle: textStyle(theme, theme.ink.muted),
    aria: ariaOption(summary),
  };
}

function parseColor(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].split('').map((digit) => digit + digit).join('') : hex[1];
    return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16)) as [number, number, number];
  }
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(color.trim());
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

function luminance(color: string): number | null {
  const channels = parseColor(color);
  if (!channels) return null;
  const [red, green, blue] = channels.map((channel) => {
    const unit = channel / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Rapport de contraste WCAG entre deux couleurs (hex ou rgb), `null` si l'une est illisible. */
export function contrastRatio(first: string, second: string): number | null {
  const a = luminance(first);
  const b = luminance(second);
  return a === null || b === null ? null : (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Texte lisible sur une couleur de série : le plus contrasté entre l'encre principale et la surface (tokens). */
export function readableOn(background: string, theme: LcChartTheme): string {
  const back = luminance(background);
  const ink = luminance(theme.ink.primary);
  const surface = luminance(theme.surface);
  if (back === null || ink === null || surface === null) return theme.ink.primary;
  const contrast = (other: number) => (Math.max(back, other) + 0.05) / (Math.min(back, other) + 0.05);
  return contrast(surface) >= contrast(ink) ? theme.surface : theme.ink.primary;
}
