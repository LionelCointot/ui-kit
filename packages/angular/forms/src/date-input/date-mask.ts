import { ISO_DATE, LOCAL_DATE, isValidIsoDate, lastDayOfMonth } from './date-math';

/** Saisie par zones (jour, mois, année) : fonctions pures, sans Angular. Années traitées : 1000 à 9999. */
export type Zone = 'day' | 'month' | 'year';

/** Chiffres de chaque zone : `''` vide ; jour et mois de 1 ou 2 chiffres, année de 1 à 4 (complète à 4). */
export type Zones = Readonly<Record<Zone, string>>;

/** Résultat d'une action : nouvelles zones, zone active, et jour ramené s'il y en a eu un (pour l'annonce). */
export interface MaskChange {
  readonly zones: Zones;
  readonly zone: Zone;
  readonly clamped?: { readonly day: number; readonly month: number };
}

export const EMPTY_ZONES: Zones = { day: '', month: '', year: '' };

const SIZE: Record<Zone, number> = { day: 2, month: 2, year: 4 };

/** Ordre des zones selon la locale (« jj/mm/aaaa » en fr-FR, « mm/jj/aaaa » en en-US). */
export function zoneOrder(locale: string): Zone[] {
  const order = new Intl.DateTimeFormat(locale)
    .formatToParts(new Date(2026, 10, 12))
    .map((part) => part.type)
    .filter((type): type is Zone => type === 'day' || type === 'month' || type === 'year');
  return order.length === 3 ? order : ['day', 'month', 'year'];
}

const isComplete = (zones: Zones, zone: Zone): boolean => zones[zone].length === SIZE[zone];

/** Dernier jour du mois affiché ; mois ou année inconnus : le plus large possible (31, ou 29 en février). */
export function maxDay(zones: Zones): number {
  if (!isComplete(zones, 'month')) return 31;
  const year = isComplete(zones, 'year') ? zones.year : '2000';
  return lastDayOfMonth(`${year}-${zones.month}-01`);
}

/** Chiffres d'une zone qui montre une valeur possible : un jour ou un mois en attente (« 2 » affiché « 02 ») compte, un « 0 » seul non. */
function effective(zones: Zones, zone: Zone): string | null {
  const digits = zones[zone];
  if (digits.length === SIZE[zone]) return digits;
  return zone !== 'year' && digits.length === 1 && digits !== '0' ? `0${digits}` : null;
}

/** Date ISO quand les trois zones montrent une valeur possible, sinon `null`. */
export function toIso(zones: Zones): string | null {
  const [day, month, year] = [effective(zones, 'day'), effective(zones, 'month'), effective(zones, 'year')];
  return day && month && year ? `${year}-${month}-${day}` : null;
}

export function fromIso(iso: string | null): Zones {
  const match = iso && isValidIsoDate(iso) ? ISO_DATE.exec(iso) : null;
  return match ? { day: match[3], month: match[2], year: match[1] } : EMPTY_ZONES;
}

export const isEmpty = (zones: Zones): boolean => !zones.day && !zones.month && !zones.year;

/** Zone voisine (`delta` -1 ou 1), sans boucle aux extrémités. */
export function neighbor(order: readonly Zone[], zone: Zone, delta: number): Zone {
  return order[Math.min(2, Math.max(0, order.indexOf(zone) + delta))];
}

/** Quitter une zone : un chiffre de jour ou de mois en attente devient « 0n », un « 0 » seul est effacé. */
export function settle(zones: Zones, zone: Zone): Zones {
  const digits = zones[zone];
  if (zone === 'year' || digits.length !== 1) return zones;
  return { ...zones, [zone]: digits === '0' ? '' : `0${digits}` };
}

/** Ramène le jour au dernier jour du mois affiché quand le mois ou l'année le rend impossible. */
function clampDay(zones: Zones): { day: number; month: number } | null {
  const max = maxDay(zones);
  if (!isComplete(zones, 'day') || !isComplete(zones, 'month') || Number(zones.day) <= max) return null;
  return { day: max, month: Number(zones.month) };
}

function withClamp(zones: Zones, zone: Zone): MaskChange {
  const clamped = clampDay(zones);
  return clamped
    ? { zones: { ...zones, day: String(clamped.day).padStart(2, '0') }, zone, clamped }
    : { zones, zone };
}

/** Zone suivante à remplir : la première incomplète après `zone`, sinon la voisine. */
function advance(zones: Zones, order: readonly Zone[], zone: Zone): Zone {
  return order.slice(order.indexOf(zone) + 1).find((next) => !isComplete(zones, next)) ?? neighbor(order, zone, 1);
}

/** Frappe d'un chiffre dans la zone active ; un chiffre refusé rend les zones inchangées (même référence). */
export function typeDigit(zones: Zones, zone: Zone, digit: string, order: readonly Zone[]): MaskChange {
  const current = zones[zone].length === SIZE[zone] ? '' : zones[zone];
  const next = current + digit;
  const ignored: MaskChange = { zones, zone };
  let accepted: string;
  if (zone === 'year') {
    if (next.startsWith('0')) return ignored;
    accepted = next;
  } else if (next.length === 1) {
    // Aucun second chiffre ne donnerait une valeur possible (jour : 4 à 9, ou 3 quand le mois a au plus 29 jours ; mois : 2 à 9) : la zone se complète seule.
    const alone = Number(next) * 10 > (zone === 'day' ? maxDay(zones) : 12);
    accepted = alone ? `0${next}` : next;
  } else {
    const value = Number(next);
    if (value < 1 || value > (zone === 'day' ? maxDay(zones) : 12)) return ignored;
    accepted = next;
  }
  const updated = { ...zones, [zone]: accepted };
  const done = accepted.length === SIZE[zone];
  return withClamp(updated, done ? advance(updated, order, zone) : zone);
}

/** Flèche haut (+1) ou bas (-1) : en boucle, sans toucher aux autres zones ; une zone vide part d'aujourd'hui. */
export function step(zones: Zones, zone: Zone, delta: 1 | -1, today: Zones): MaskChange {
  const range = { day: [1, maxDay(zones)], month: [1, 12], year: [1000, 9999] }[zone];
  const [low, high] = range;
  const base = isComplete(zones, zone) ? Number(zones[zone]) : Number(today[zone]) - delta;
  const value = base + delta > high ? low : base + delta < low ? high : base + delta;
  return withClamp({ ...zones, [zone]: String(value).padStart(SIZE[zone], '0') }, zone);
}

export const clear = (zones: Zones, zone: Zone): Zones => ({ ...zones, [zone]: '' });

/** Texte collé ou rempli : `jj/mm/aaaa` dans l'ordre de la locale (séparateurs `/`, `.`, `-`) ou ISO ; `null` si illisible. */
export function parsePaste(text: string, order: readonly Zone[]): MaskChange | null {
  const iso = ISO_DATE.exec(text.trim());
  const local = iso ? null : LOCAL_DATE.exec(text.trim());
  const raw: Record<Zone, string> | null = iso
    ? { year: iso[1], month: iso[2], day: iso[3] }
    : local
      ? (Object.fromEntries(order.map((zone, index) => [zone, local[index + 1]])) as Record<Zone, string>)
      : null;
  if (!raw) return null;
  const zones: Zones = {
    day: raw.day.padStart(2, '0'),
    month: raw.month.padStart(2, '0'),
    year: raw.year,
  };
  if (Number(zones.month) < 1 || Number(zones.month) > 12 || Number(zones.day) < 1 || Number(zones.day) > 31 || zones.year < '1000')
    return null;
  return withClamp(zones, order[2]);
}

/** Texte affiché et position de chaque zone dans ce texte (`end` exclu). */
export function render(
  zones: Zones,
  order: readonly Zone[],
  letters: Zones,
): { text: string; ranges: Record<Zone, readonly [number, number]> } {
  let text = '';
  const ranges = {} as Record<Zone, readonly [number, number]>;
  for (const zone of order) {
    if (text) text += '/';
    // Un chiffre de jour ou de mois en attente s'affiche déjà « 0n » : le jour ou le mois suivant ne change rien.
    const shown = zones[zone] ? (zone === 'year' ? zones[zone] : zones[zone].padStart(2, '0')) : letters[zone];
    ranges[zone] = [text.length, text.length + shown.length];
    text += shown;
  }
  return { text, ranges };
}

/** Zone sous une position du curseur dans le texte (une position entre deux zones va à la première). */
export function zoneAt(ranges: Record<Zone, readonly [number, number]>, order: readonly Zone[], offset: number): Zone {
  return order.find((zone) => offset <= ranges[zone][1]) ?? order[2];
}
