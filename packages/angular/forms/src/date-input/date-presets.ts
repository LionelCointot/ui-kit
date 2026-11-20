import type { LcLabels } from '@lionelcointot/ui-angular';
import type { LcDateIntervalPreset } from './date-interval';
import { lastDaysInterval, lastMonthInterval, thisMonthInterval } from './date-math';

/** Les quatre raccourcis du kit, libellés pris dans `LC_LABELS` ; `lastDays` est celui du tableau de données (aujourd'hui compris). */
export function kitDatePresets(labels: LcLabels): readonly LcDateIntervalPreset[] {
  return [
    { label: labels.dataTable.lastDays(7), interval: (today) => lastDaysInterval(today, 7) },
    { label: labels.dataTable.lastDays(30), interval: (today) => lastDaysInterval(today, 30) },
    { label: labels.dateThisMonth, interval: thisMonthInterval },
    { label: labels.dateLastMonth, interval: lastMonthInterval },
  ];
}
