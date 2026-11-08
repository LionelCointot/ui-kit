import { Injectable, inject } from '@angular/core';
import { LC_LOCALE } from './options';
import { LcValueFormat } from './types';

/** Formats localisés (Intl). Les dates ISO « AAAA-MM-JJ » sont lues sans fuseau : aucun décalage d'un jour. */
@Injectable({ providedIn: 'root' })
export class LcFormatService {
  private readonly options = inject(LC_LOCALE);
  private readonly moneyFormat = new Intl.NumberFormat(this.options.locale, { style: 'currency', currency: this.options.currency });
  private readonly compactMoneyFormat = new Intl.NumberFormat(this.options.locale, {
    style: 'currency', currency: this.options.currency, notation: 'compact', maximumFractionDigits: 1,
  });

  money(value: number | null | undefined, options: { compact?: boolean; decimals?: number } = {}): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    if (options.compact) return this.compactMoneyFormat.format(value);
    if (options.decimals !== undefined) {
      return new Intl.NumberFormat(this.options.locale, {
        style: 'currency', currency: this.options.currency,
        minimumFractionDigits: options.decimals, maximumFractionDigits: options.decimals,
      }).format(value);
    }
    return this.moneyFormat.format(value);
  }

  /** `value` en pourcentage (3.5 → « 3,50 % »). */
  percent(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return `${this.number(value, decimals)} %`;
  }

  number(value: number | null | undefined, decimals?: number): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat(this.options.locale, {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 20,
    }).format(value);
  }

  /** Date ISO (« 2026-01-15 ») ou objet Date ; style 'short' (15/01/2026), 'long' (15 janvier 2026), 'month' (janvier 2026). */
  date(value: string | Date | null | undefined, style: 'short' | 'long' | 'month' = 'short'): string {
    if (!value) return '—';
    const date = typeof value === 'string' ? isoToLocalDate(value) : value;
    if (!date || Number.isNaN(date.getTime())) return '—';
    const options: Intl.DateTimeFormatOptions =
      style === 'short' ? { day: '2-digit', month: '2-digit', year: 'numeric' }
        : style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' }
          : { month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat(this.options.locale, options).format(date);
  }

  /** Durée en mois lisible : 240 → « 20 ans », 63 → « 5 ans et 3 mois », 7 → « 7 mois ». */
  months(count: number | null | undefined): string {
    if (count === null || count === undefined || Number.isNaN(count)) return '—';
    const years = Math.floor(count / 12);
    const months = count % 12;
    const yearText = years === 0 ? '' : years === 1 ? '1 an' : `${years} ans`;
    const monthText = months === 0 ? '' : `${months} mois`;
    if (yearText && monthText) return `${yearText} et ${monthText}`;
    return yearText || monthText || '0 mois';
  }

  format(value: unknown, format: LcValueFormat): string {
    if (typeof format === 'function') return format(value);
    if (value === null || value === undefined) return '—';
    switch (format) {
      case 'money': return this.money(Number(value));
      case 'percent': return this.percent(Number(value));
      case 'number': return this.number(Number(value), 2);
      case 'integer': return this.number(Number(value), 0);
      case 'date': return this.date(value as string | Date);
      case 'month': return this.date(value as string | Date, 'month');
      default: return String(value);
    }
  }
}

/** « 2026-01-15 » → Date locale à minuit (et non UTC), pour éviter le décalage d'un jour. */
export function isoToLocalDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}
