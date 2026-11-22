import { LC_LABELS_EN, LC_LABELS_FR } from '@lionelcointot/ui-angular';
import { groupThreadMessages, type LcThreadGroup, type LcThreadItem } from './message-thread-grouping';
import type { LcThreadMessage } from './message-thread.model';

// Acceptation de docs/specs/2026-11-fil-de-messages.md (F0), écrite avant le code : CA-T1 (groupes, jours), CA-T7 (système), CA-T17 (ordre, date invalide).
// Contrat : groupThreadMessages(messages, { locale, labels, now }) → éléments { type: 'day' | 'group' | 'system' } (message-thread-grouping.ts).
// Les dates sont construites en heure LOCALE (new Date(a, m, j, h, min)) : le test ne dépend pas du fuseau de la machine.

const NOW = new Date(2026, 10, 21, 10, 0); // 21 nov. 2026, 10:00 locale
const at = (day: number, h: number, min = 0, s = 0) => new Date(2026, 10, day, h, min, s).toISOString();
const msg = (id: string, o: Partial<LcThreadMessage> = {}): LcThreadMessage => ({ id, authorId: 'a', authorName: 'Alice', mine: false, sentAt: at(21, 9, 0), text: `t-${id}`, ...o });
const FR = { locale: 'fr-FR', labels: LC_LABELS_FR, now: NOW };
const EN = { locale: 'en-US', labels: LC_LABELS_EN, now: NOW };
const groups = (items: LcThreadItem[]) => items.filter((i): i is LcThreadGroup => i.type === 'group');
const ids = (items: LcThreadItem[]) => items.flatMap((i) => (i.type === 'group' ? i.messages.map((m) => m.message.id) : i.type === 'system' ? [i.message.id] : []));
const days = (items: LcThreadItem[]) => items.filter((i) => i.type === 'day').map((i) => (i as { label: string }).label.replace(/[  ]/g, ' ').replace('’', "'"));

describe('CA-T1 groupes : auteur, visibilité, écart de 5 minutes, jour', () => {
  it('liste vide : aucun élément', () => expect(groupThreadMessages([], FR)).toEqual([]));

  it('même auteur, même visibilité, écart de 4 min 59 s : un groupe ; 5 min 00 s : deux groupes', () => {
    expect(groups(groupThreadMessages([msg('1'), msg('2', { sentAt: at(21, 9, 4, 59) })], FR))).toHaveLength(1);
    expect(groups(groupThreadMessages([msg('1'), msg('2', { sentAt: at(21, 9, 5, 0) })], FR))).toHaveLength(2);
  });

  it('auteurs différents : deux groupes ; le groupe porte authorId, authorName et mine', () => {
    const g = groups(groupThreadMessages([msg('1'), msg('2', { authorId: 'b', authorName: 'Bob', mine: true, sentAt: at(21, 9, 1) })], FR));
    expect(g.map((x) => [x.authorId, x.authorName, x.mine])).toEqual([['a', 'Alice', false], ['b', 'Bob', true]]);
  });

  it('visibilité (cssClass) différente : deux groupes ; identique : un seul', () => {
    expect(groups(groupThreadMessages([msg('1'), msg('2', { cssClass: 'note', sentAt: at(21, 9, 1) })], FR))).toHaveLength(2);
    expect(groups(groupThreadMessages([msg('1', { cssClass: 'note' }), msg('2', { cssClass: 'note', sentAt: at(21, 9, 1) })], FR))).toHaveLength(1);
  });

  it('23:59 puis 00:01 locaux, même auteur : deux groupes, deux jours', () => {
    const items = groupThreadMessages([msg('1', { sentAt: at(20, 23, 59) }), msg('2', { sentAt: at(21, 0, 1) })], FR);
    expect(groups(items)).toHaveLength(2);
    expect(days(items)).toEqual(['Hier', "Aujourd'hui"]);
  });

  it('séparateurs fr : Aujourd\'hui, Hier, date courte « 18 nov. », un seul par jour, avant le premier message du jour', () => {
    const items = groupThreadMessages([msg('1', { sentAt: at(18, 9) }), msg('2', { sentAt: at(18, 15) }), msg('3', { sentAt: at(20, 9) }), msg('4', { sentAt: at(21, 8) })], FR);
    expect(days(items)).toEqual(['18 nov.', 'Hier', "Aujourd'hui"]);
    expect(items[0].type).toBe('day');
    expect(items.findIndex((i) => i.type === 'day' && i.label.startsWith('Hier'))).toBeLessThan(items.findIndex((i) => i.type === 'group' && i.messages[0].message.id === '3'));
  });

  it('séparateurs en : Today, Yesterday, « Nov 18 »', () => {
    const items = groupThreadMessages([msg('1', { sentAt: at(18, 9) }), msg('2', { sentAt: at(20, 9) }), msg('3', { sentAt: at(21, 8) })], EN);
    expect(days(items)).toEqual(['Nov 18', LC_LABELS_EN.threadYesterday, LC_LABELS_EN.threadToday]);
    expect(LC_LABELS_EN.threadToday).not.toBe(LC_LABELS_FR.threadToday);
  });

  it('un message : un groupe d\'un message', () => {
    const g = groups(groupThreadMessages([msg('1')], FR));
    expect(g).toHaveLength(1);
    expect(g[0].messages).toHaveLength(1);
  });
});

describe('CA-T7 message système', () => {
  it('rompt le groupe : même auteur de part et d\'autre = deux groupes ; le système est hors groupe', () => {
    const items = groupThreadMessages([msg('1'), msg('2', { kind: 'system', sentAt: at(21, 9, 1) }), msg('3', { sentAt: at(21, 9, 2) })], FR);
    expect(groups(items)).toHaveLength(2);
    expect(items.filter((i) => i.type === 'system')).toHaveLength(1);
    expect(groups(items).flatMap((g) => g.messages.map((m) => m.message.id))).toEqual(['1', '3']);
  });
});

describe('CA-T17 ordre conservé, date invalide', () => {
  it('ordre de la liste conservé même si les dates sont décroissantes', () => {
    expect(ids(groupThreadMessages([msg('1', { sentAt: at(21, 9, 30) }), msg('2', { sentAt: at(21, 9, 0) }), msg('3', { authorId: 'b', sentAt: at(21, 8, 0) })], FR))).toEqual(['1', '2', '3']);
  });
  it('sentAt invalide : message gardé à sa place, aucun séparateur « Invalid Date »', () => {
    const items = groupThreadMessages([msg('1'), msg('2', { sentAt: 'pas une date' }), msg('3', { sentAt: at(21, 9, 1) })], FR);
    expect(ids(items)).toEqual(['1', '2', '3']);
    expect(JSON.stringify(items)).not.toMatch(/Invalid/i);
  });
});
