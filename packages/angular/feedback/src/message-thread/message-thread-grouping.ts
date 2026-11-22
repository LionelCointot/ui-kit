import { isDevMode } from '@angular/core';
import { lcStripUnsafeChars, type LcLabels } from '@lionelcointot/ui-angular';
import type { LcThreadMessage } from './message-thread.model';

/** Écart au-delà duquel (inclus) un message ouvre un groupe, ou affiche son heure dans le groupe. */
const GROUP_GAP_MS = 5 * 60 * 1000;

export interface LcThreadTime {
  /** Valeur de l'attribut `datetime`. */
  iso: string;
  /** Heure locale lisible. */
  text: string;
}
export interface LcThreadGroupMessage {
  message: LcThreadMessage;
  /** Heure intermédiaire (≥ 5 min depuis la dernière heure affichée) ; absente sinon. */
  time: LcThreadTime | null;
}
export interface LcThreadDay {
  type: 'day';
  key: string;
  label: string;
  /** Date locale `AAAA-MM-JJ`, valeur de l'attribut `datetime`. */
  date: string;
}
export interface LcThreadGroup {
  type: 'group';
  key: string;
  authorId: string;
  /** Sans caractères de contrôle ni marqueurs bidi. */
  authorName: string;
  mine: boolean;
  cssClass: string;
  mention: string | undefined;
  /** Heure d'en-tête ; `null` si `sentAt` du premier message est invalide. */
  time: LcThreadTime | null;
  messages: LcThreadGroupMessage[];
}
export interface LcThreadSystem { type: 'system'; key: string; message: LcThreadMessage; time: LcThreadTime | null }
export type LcThreadItem = LcThreadDay | LcThreadGroup | LcThreadSystem;

export interface LcThreadGroupingContext {
  locale: string;
  labels: Pick<LcLabels, 'threadToday' | 'threadYesterday'>;
  /** Horloge injectée (tests) ; la date du jour par défaut. */
  now?: Date;
}

const isoDay = (d: Date) => `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function warn(message: string): void {
  if (isDevMode()) console.warn(`[lc-message-thread] ${message}`);
}

/** Éléments à rendre : séparateurs de jour, groupes de bulles et messages système (jours selon le fuseau du navigateur). */
export function groupThreadMessages(messages: readonly LcThreadMessage[], ctx: LcThreadGroupingContext): LcThreadItem[] {
  const now = ctx.now ?? new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const timeFormat = new Intl.DateTimeFormat(ctx.locale, { hour: '2-digit', minute: '2-digit' });
  const dateFormat = new Intl.DateTimeFormat(ctx.locale, { day: 'numeric', month: 'short' });
  const dateFormatWithYear = new Intl.DateTimeFormat(ctx.locale, { day: 'numeric', month: 'short', year: 'numeric' });

  const dayLabel = (d: Date) =>
    dayKey(d) === dayKey(now) ? ctx.labels.threadToday
      : dayKey(d) === dayKey(yesterday) ? ctx.labels.threadYesterday
        : (d.getFullYear() !== now.getFullYear() ? dateFormatWithYear : dateFormat).format(d);

  const items: LcThreadItem[] = [];
  const seen = new Set<string>();
  let group: LcThreadGroup | undefined;
  let lastDay: string | undefined;
  let lastTs: number | undefined; // dernière date valide, pour l'écart entre deux messages
  let shownTs: number | undefined; // dernière heure affichée dans le groupe

  for (const message of messages) {
    if (seen.has(message.id)) {
      warn(`identifiant de message en double ignoré : ${message.id}`);
      continue;
    }
    seen.add(message.id);
    const system = message.kind === 'system';
    if (!message.text?.trim() && (system || !message.attachments?.length)) continue;

    const date = new Date(message.sentAt);
    const ts = date.getTime();
    const valid = !Number.isNaN(ts);
    if (!valid) warn(`date invalide pour le message ${message.id}`);
    const time: LcThreadTime | null = valid ? { iso: date.toISOString(), text: timeFormat.format(date) } : null;

    const day = valid ? dayKey(date) : undefined;
    const newDay = day !== undefined && day !== lastDay;
    const cssClass = message.cssClass ?? '';
    const joins = !system && group !== undefined && group.authorId === message.authorId && group.cssClass === cssClass
      && !(newDay && lastDay !== undefined) && !(valid && lastTs !== undefined && ts - lastTs >= GROUP_GAP_MS);

    if (valid) lastTs = ts;
    if (!joins) {
      group = undefined;
      if (newDay) items.push({ type: 'day', key: `day-${day}`, label: dayLabel(date), date: isoDay(date) });
    }
    if (day !== undefined) lastDay = day;

    if (system) {
      items.push({ type: 'system', key: message.id, message, time });
    } else if (joins && group) {
      const shows = valid && (shownTs === undefined || ts - shownTs >= GROUP_GAP_MS);
      if (shows) shownTs = ts;
      group.messages.push({ message, time: shows ? time : null });
    } else {
      shownTs = valid ? ts : undefined;
      group = {
        type: 'group', key: message.id, authorId: message.authorId, authorName: lcStripUnsafeChars(message.authorName),
        mine: message.mine, cssClass, mention: message.mention, time, messages: [{ message, time: null }],
      };
      items.push(group);
    }
  }
  return items;
}
