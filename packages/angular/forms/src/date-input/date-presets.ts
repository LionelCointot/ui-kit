import type { LcLabels } from '@lionelcointot/ui-angular';
import { describeInterval } from './date-describe';
import type { LcDateInterval, LcDateIntervalPreset } from './date-interval';
import { clipInterval, lastDaysInterval, lastMonthInterval, thisMonthInterval } from './date-math';

/** Les quatre raccourcis du kit, libellés pris dans `LC_LABELS` ; `lastDays` est celui du tableau de données (aujourd'hui compris). */
export function kitDatePresets(labels: LcLabels): readonly LcDateIntervalPreset[] {
  return [
    { label: labels.dataTable.lastDays(7), interval: (today) => lastDaysInterval(today, 7) },
    { label: labels.dataTable.lastDays(30), interval: (today) => lastDaysInterval(today, 30) },
    { label: labels.dateThisMonth, interval: thisMonthInterval },
    { label: labels.dateLastMonth, interval: lastMonthInterval },
  ];
}

/** Raccourcis résolus pour `today`, rognés par `min` / `max` ; `interval` est nul quand il n'en reste rien (bouton désactivé). */
export function describePresets(
  labels: LcLabels,
  locale: string,
  presets: readonly LcDateIntervalPreset[],
  today: string,
  min: string | null | undefined,
  max: string | null | undefined,
): { label: string; interval: LcDateInterval | null; dates: string }[] {
  return presets.map((preset) => {
    const interval = clipInterval(preset.interval(today), min, max);
    return { label: preset.label, interval, dates: interval ? describeInterval(labels, locale, interval) : labels.dateNoneAllowed };
  });
}
