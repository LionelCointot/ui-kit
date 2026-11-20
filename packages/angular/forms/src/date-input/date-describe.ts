import type { LcLabels } from '@lionelcointot/ui-angular';
import { isoToLocalDate } from '@lionelcointot/ui-angular';
import type { LcDateInterval } from './date-interval';

/** Dates d'une période en une phrase courte ; `longDate` écrit une date seule (`LcFormatService`), `Intl` compose la plage (« 13–19 novembre 2026 »), seul le tiret devient « au ». */
export function describeInterval(labels: LcLabels, locale: string, { from, to }: LcDateInterval, longDate: (iso: string) => string): string {
  if (!from || !to) return from ? labels.dataTable.since(longDate(from)) : to ? labels.dataTable.until(longDate(to)) : '';
  if (from === to) return labels.dateOnDay(longDate(from));
  const parts = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).formatRangeToParts(isoToLocalDate(from)!, isoToLocalDate(to)!);
  const sources = parts.map((part) => part.source);
  const start = sources.lastIndexOf('startRange');
  const end = sources.indexOf('endRange');
  const text = (list: Intl.DateTimeFormatPart[]) => list.map((part) => part.value).join('');
  const range = start < 0 || end < 0 ? `${longDate(from)} ${labels.datePeriodTo} ${longDate(to)}` : `${text(parts.slice(0, start + 1))} ${labels.datePeriodTo} ${text(parts.slice(end))}`;
  return `${labels.datePeriodFrom} ${range}`;
}
