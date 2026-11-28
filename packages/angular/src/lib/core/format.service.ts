import { Injectable, inject } from '@angular/core';
import { LC_LOCALE } from './options';
import { LcValueFormat } from './types';

/** Texte affiché pour une valeur absente (null, undefined, NaN). */
const EMPTY_VALUE = '—';

/**
 * Formats localisés (Intl). Les dates ISO « AAAA-MM-JJ » sont lues sans fuseau : aucun décalage d'un jour.
 * Les instances Intl sont mises en cache (un tableau de 2 000 lignes formate des milliers de cellules).
 */
@Injectable({ providedIn: 'root' })
export class LcFormatService {
  private readonly options = inject(LC_LOCALE);
  private readonly numberFormats = new Map<string, Intl.NumberFormat>();
  private readonly dateFormats = new Map<string, Intl.DateTimeFormat>();

  /** Séparateur décimal de la locale (« , » en français). */
  readonly decimalSeparator = this.numberPart({}, 1.5, 'decimal') ?? '.';
  /** Symbole de la devise configurée (« € »). */
  readonly currencySymbol = this.numberPart({ style: 'currency', currency: this.options.currency }, 0, 'currency') ?? this.options.currency;

  /** Montant dans la devise configurée : 1159.92 → « 1 159,92 € » (espaces insécables). */
  money(value: number | null | undefined, options: { compact?: boolean; decimals?: number } = {}): string {
    if (isMissing(value)) return EMPTY_VALUE;
    if (options.compact) {
      return this.numberFormat({ style: 'currency', currency: this.options.currency, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 })
        .format(value);
    }
    const digits = options.decimals === undefined ? {} : { minimumFractionDigits: options.decimals, maximumFractionDigits: options.decimals };
    return this.numberFormat({ style: 'currency', currency: this.options.currency, ...digits }).format(value);
  }

  /** `value` exprimé en pourcentage (3.5 → « 3,50 % »). */
  percent(value: number | null | undefined, decimals = 2): string {
    if (isMissing(value)) return EMPTY_VALUE;
    return this.numberFormat({ style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value / 100);
  }

  /** Nombre localisé ; `decimals` fixe le nombre de décimales (sinon celles de la valeur). */
  number(value: number | null | undefined, decimals?: number): string {
    if (isMissing(value)) return EMPTY_VALUE;
    return this.numberFormat({ minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 20 }).format(value);
  }

  /** Nombre compact pour les graduations d'axe (250 000 → « 250 k »). */
  compactNumber(value: number | null | undefined): string {
    if (isMissing(value)) return EMPTY_VALUE;
    return this.numberFormat({ notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value);
  }

  /** Date ISO (« 2026-01-15 ») ou objet Date ; style 'short' (15/01/2026), 'long' (15 janvier 2026), 'month' (janvier 2026). */
  date(value: string | Date | null | undefined, style: 'short' | 'long' | 'month' = 'short'): string {
    if (!value) return EMPTY_VALUE;
    const date = typeof value === 'string' ? isoToLocalDate(value) : value;
    if (!date || Number.isNaN(date.getTime())) return EMPTY_VALUE;
    return this.dateFormat(style).format(date);
  }

  /** Durée en mois lisible : 240 → « 20 ans », 63 → « 5 ans et 3 mois », 7 → « 7 mois ». */
  months(count: number | null | undefined): string {
    if (isMissing(count)) return EMPTY_VALUE;
    const years = Math.floor(count / 12);
    const months = count % 12;
    const yearText = years === 0 ? '' : years === 1 ? '1 an' : `${years} ans`;
    const monthText = months === 0 ? '' : `${months} mois`;
    if (yearText && monthText) return `${yearText} et ${monthText}`;
    return yearText || monthText || '0 mois';
  }

  /** Formate une valeur selon un format nommé ou une fonction fournie par le consommateur. */
  format(value: unknown, format: LcValueFormat = 'text'): string {
    if (typeof format === 'function') return format(value);
    if (value === null || value === undefined || value === '') return EMPTY_VALUE;
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

  private numberPart(options: Intl.NumberFormatOptions, sample: number, type: Intl.NumberFormatPartTypes): string | undefined {
    return new Intl.NumberFormat(this.options.locale, options).formatToParts(sample).find((part) => part.type === type)?.value;
  }

  private numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = JSON.stringify(options);
    let format = this.numberFormats.get(key);
    if (!format) {
      format = new Intl.NumberFormat(this.options.locale, options);
      this.numberFormats.set(key, format);
    }
    return format;
  }

  private dateFormat(style: 'short' | 'long' | 'month'): Intl.DateTimeFormat {
    let format = this.dateFormats.get(style);
    if (!format) {
      const options: Intl.DateTimeFormatOptions =
        style === 'short' ? { day: '2-digit', month: '2-digit', year: 'numeric' }
          : style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' }
            : { month: 'long', year: 'numeric' };
      format = new Intl.DateTimeFormat(this.options.locale, options);
      this.dateFormats.set(style, format);
    }
    return format;
  }
}

function isMissing(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value);
}

/** « 2026-01-15 » → Date locale à minuit (et non UTC), pour éviter le décalage d'un jour. */
export function isoToLocalDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/** Date locale → « AAAA-MM-JJ » (sans passer par UTC). */
export function localDateToIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
