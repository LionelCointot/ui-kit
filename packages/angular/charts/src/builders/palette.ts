import { roleColor, roleSymbol } from './series-roles';
import type { LcChartSeries, LcChartTheme, LcChartValue, LcColorSlot, LcResolvedSeries } from '../types';

export const LC_OTHER_SERIES_ID = '__other__';
const SLOTS: readonly LcColorSlot[] = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Attribue un emplacement de couleur (1 à 8, jamais en boucle) à chaque série :
 * `colorSlot` explicite, sinon l'emplacement mémorisé pour cet identifiant, sinon le premier emplacement
 * jamais attribué. `memory` est conservée par instance de graphique : une série retirée puis remise retrouve sa couleur.
 */
export function assignColorSlots(series: readonly LcChartSeries[], memory: Map<string, LcColorSlot>): ReadonlyMap<string, LcColorSlot> {
  const result = new Map<string, LcColorSlot>();
  // Une série à rôle (`colorRole`) ne consomme aucun emplacement : les autres séries gardent leur couleur.
  const current = series.filter((item) => item.id !== LC_OTHER_SERIES_ID && !item.colorRole);
  for (const item of current) {
    if (item.colorSlot) {
      memory.set(item.id, item.colorSlot);
      result.set(item.id, item.colorSlot);
    }
  }
  for (const item of current) {
    if (result.has(item.id)) continue;
    const remembered = memory.get(item.id);
    if (remembered && ![...result.values()].includes(remembered)) {
      result.set(item.id, remembered);
      continue;
    }
    const remembered_all = new Set(memory.values());
    const usedNow = new Set(result.values());
    // Premier emplacement jamais attribué ; à défaut, premier emplacement libre dans le graphique courant.
    const slot = SLOTS.find((candidate) => !remembered_all.has(candidate) && !usedNow.has(candidate))
      ?? SLOTS.find((candidate) => !usedNow.has(candidate))
      ?? SLOTS[SLOTS.length - 1];
    memory.set(item.id, slot);
    result.set(item.id, slot);
  }
  return result;
}

/**
 * Au-delà de `max` séries, regroupe les suivantes en une série « Autres » (somme par catégorie ;
 * `null` si toutes les valeurs sont absentes). Les `max - 1` premières séries sont conservées.
 */
export function foldExtraSeries(series: readonly LcChartSeries[], max: number, otherLabel: string): readonly LcChartSeries[] {
  if (series.length <= max) return series;
  const kept = series.slice(0, max - 1);
  const folded = series.slice(max - 1);
  const length = Math.max(...folded.map((item) => item.values.length));
  const values: LcChartValue[] = Array.from({ length }, (_, index) => {
    const present = folded.map((item) => item.values[index]).filter((value): value is number => typeof value === 'number');
    return present.length === 0 ? null : present.reduce((sum, value) => sum + value, 0);
  });
  return [...kept, { id: LC_OTHER_SERIES_ID, label: otherLabel, values, stack: folded[0].stack }];
}

export interface PreparedSeries {
  /** Toutes les séries (légende, tableau), couleurs résolues. */
  readonly all: readonly LcResolvedSeries[];
  /** Séries tracées (hors séries masquées par la légende). */
  readonly visible: readonly LcResolvedSeries[];
}

/** Regroupe, attribue les couleurs, puis écarte les séries masquées : les autres gardent leur couleur. */
export function prepareSeries(
  series: readonly LcChartSeries[],
  memory: Map<string, LcColorSlot>,
  theme: LcChartTheme,
  otherLabel: string,
  hidden: ReadonlySet<string>,
  maxSeries = 8,
): PreparedSeries {
  const folded = foldExtraSeries(series, maxSeries, otherLabel);
  const slots = assignColorSlots(folded, memory);
  const all = folded.map<LcResolvedSeries>((item, index) => {
    const slot = slots.get(item.id) ?? null;
    const role = item.colorRole;
    return {
      id: item.id,
      label: item.label,
      values: item.values,
      color: role ? roleColor(role, theme) : slot ? theme.categorical[slot - 1] : theme.ink.muted,
      slot,
      role,
      pattern: item.pattern,
      patternIndex: index,
      stack: item.stack,
      lineStyle: item.lineStyle ?? (role === 'neutral' ? 'dashed' : undefined),
      symbol: item.symbol ?? (role ? roleSymbol(role) : undefined),
    };
  });
  return { all, visible: all.filter((item) => !hidden.has(item.id)) };
}
