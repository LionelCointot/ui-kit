// Années traitées : 1000 à 9999 (`new Date` ramène les années 0 à 99 à 19xx).
import { isoToLocalDate, localDateToIso } from '@lionelcointot/ui-angular';
import type { LcDateInterval } from './date-interval';

export const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const LOCAL_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

type Bound = string | null | undefined;

/**
 * Texte du champ → date ISO : la valeur native est déjà ISO ; repli pour un navigateur sans sélecteur natif
 * (saisie « JJ/MM/AAAA »). `undefined` = saisie incomplète ou invalide (valeur inchangée), `null` = vide.
 */
export function toIsoDate(text: string): string | null | undefined {
  if (text === '') return null;
  if (ISO_DATE.test(text)) return text;
  const match = LOCAL_DATE.exec(text);
  if (!match) return undefined;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** `AAAA-MM-JJ` qui existe au calendrier (le 30 février est refusé). */
export function isValidIsoDate(iso: string): boolean {
  if (!ISO_DATE.test(iso) || iso < '1000') return false;
  const date = isoToLocalDate(iso);
  return date !== null && localDateToIso(date) === iso;
}

function parts(iso: string): { year: number; month: number; day: number } {
  const date = isoToLocalDate(iso)!;
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function build(year: number, month: number, day: number): string {
  return localDateToIso(new Date(year, month - 1, day));
}

/** Dernier jour du mois de la date (28 à 31). */
export function lastDayOfMonth(iso: string): number {
  const { year, month } = parts(iso);
  return new Date(year, month, 0).getDate();
}

export const firstOfMonth = (iso: string): string => build(parts(iso).year, parts(iso).month, 1);

export const lastOfMonth = (iso: string): string =>
  build(parts(iso).year, parts(iso).month, lastDayOfMonth(iso));

export function addDays(iso: string, days: number): string {
  const { year, month, day } = parts(iso);
  return build(year, month, day + days);
}

/** Le jour est gardé, ou ramené au dernier jour du mois d'arrivée (31 janvier + 1 mois = 28 ou 29 février). */
export function addMonths(iso: string, months: number): string {
  const { year, month, day } = parts(iso);
  const first = build(year, month + months, 1);
  return build(parts(first).year, parts(first).month, Math.min(day, lastDayOfMonth(first)));
}

export const addYears = (iso: string, years: number): string => addMonths(iso, years * 12);

/** Négatif si `a` précède `b`, nul si égales (les ISO se comparent comme du texte). */
export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Ramène la date dans `min` / `max` ; une borne absente ne borne pas. */
export function clampIso(iso: string, min: Bound, max: Bound): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/** Semaines du mois, lundi en premier ; `null` pour les cases vides avant le 1er et après le dernier jour. */
export function monthGrid(iso: string): (string | null)[][] {
  const first = firstOfMonth(iso);
  const offset = (isoToLocalDate(first)!.getDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  const last = lastDayOfMonth(iso);
  for (let day = 0; day < last; day++) cells.push(addDays(first, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** Page de douze années qui commence sept ans avant `year` (2026 donne 2019 à 2030). */
export function yearPage(year: number): number[] {
  return Array.from({ length: 12 }, (_, index) => year - 7 + index);
}

/** « N derniers jours », aujourd'hui compris. */
export const lastDaysInterval = (today: string, days: number): LcDateInterval => ({
  from: addDays(today, 1 - days),
  to: today,
});

/** Lundi au dimanche de la semaine précédant `today` (semaine ISO, comme le calendrier). */
export function lastWeekInterval(today: string): LcDateInterval {
  const monday = addDays(today, -((isoToLocalDate(today)!.getDay() + 6) % 7) - 7);
  return { from: monday, to: addDays(monday, 6) };
}

export const thisMonthInterval = (today: string): LcDateInterval => ({
  from: firstOfMonth(today),
  to: lastOfMonth(today),
});

export function lastMonthInterval(today: string): LcDateInterval {
  const previous = addMonths(today, -1);
  return { from: firstOfMonth(previous), to: lastOfMonth(previous) };
}

/** Période rognée par `min` / `max` ; `null` s'il n'en reste rien. */
export function clipInterval(
  interval: LcDateInterval,
  min: Bound,
  max: Bound,
): LcDateInterval | null {
  const { from, to } = interval;
  if ((to && min && to < min) || (from && max && from > max)) return null;
  // Une borne nulle ne limite pas : elle prend la valeur de `min` / `max` s'il y en a.
  const clippedFrom = from && min && from < min ? min : (from ?? min ?? null);
  const clippedTo = to && max && to > max ? max : (to ?? max ?? null);
  return clippedFrom && clippedTo && clippedFrom > clippedTo ? null : { from: clippedFrom, to: clippedTo };
}
