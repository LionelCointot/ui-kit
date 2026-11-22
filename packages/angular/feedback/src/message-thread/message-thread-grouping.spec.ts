import { LC_LABELS_EN, LC_LABELS_FR } from '@lionelcointot/ui-angular';
import { groupThreadMessages, type LcThreadGroup, type LcThreadItem } from './message-thread-grouping';
import type { LcThreadMessage } from './message-thread.model';

const NOW = new Date(2026, 10, 21, 12, 0); // 21 nov. 2026, heure locale
const at = (day: number, h: number, m: number, s = 0) => new Date(2026, 10, day, h, m, s).toISOString();
const msg = (id: string, over: Partial<LcThreadMessage> = {}): LcThreadMessage => ({
  id, authorId: 'a', authorName: 'Alice', mine: false, sentAt: at(21, 9, 0), text: `t${id}`, ...over,
});
const run = (messages: LcThreadMessage[], labels = LC_LABELS_FR, locale = 'fr') => groupThreadMessages(messages, { locale, labels, now: NOW });
const groups = (items: LcThreadItem[]) => items.filter((i): i is LcThreadGroup => i.type === 'group');

describe('groupThreadMessages', () => {
  afterEach(() => vi.restoreAllMocks());

  it('liste vide : rien', () => expect(run([])).toEqual([]));

  it('même auteur et même classe à moins de 5 min : un groupe ; 5 min pile : deux', () => {
    const items = run([msg('1'), msg('2', { sentAt: at(21, 9, 4, 59) }), msg('3', { sentAt: at(21, 9, 9, 58) }), msg('4', { sentAt: at(21, 9, 14, 57) })]);
    expect(groups(items).map((g) => g.messages.map((m) => m.message.id))).toEqual([['1', '2', '3', '4']]);
    const split = run([msg('1'), msg('2', { sentAt: at(21, 9, 5) })]);
    expect(groups(split).map((g) => g.messages.length)).toEqual([1, 1]);
  });

  it('en-tête avec l\'heure, heure intermédiaire seulement après 5 min depuis la dernière affichée', () => {
    const [g] = groups(run([msg('1'), msg('2', { sentAt: at(21, 9, 3) }), msg('3', { sentAt: at(21, 9, 6) })]));
    expect(g.time?.text).toBe('09:00');
    expect(g.messages.map((m) => m.time?.text ?? null)).toEqual([null, null, '09:06']);
  });

  it('un autre auteur, une autre classe, un message système ou un autre jour rompent le groupe', () => {
    expect(groups(run([msg('1'), msg('2', { authorId: 'b' })]))).toHaveLength(2);
    expect(groups(run([msg('1'), msg('2', { cssClass: 'note' })]))).toHaveLength(2);
    const sys = run([msg('1'), msg('2', { kind: 'system' }), msg('3')]);
    expect(sys.map((i) => i.type)).toEqual(['day', 'group', 'system', 'group']);
    expect(groups(run([msg('1', { sentAt: at(20, 23, 59) }), msg('2', { sentAt: at(21, 0, 1) })]))).toHaveLength(2);
  });

  it('un message système sans texte (ou blanc) est écarté, comme un message normal vide', () => {
    expect(run([msg('1', { kind: 'system', text: undefined }), msg('2', { kind: 'system', text: '  ' }), msg('3', { text: '' })])).toEqual([]);
  });

  it('séparateurs de jour : Aujourd\'hui, Hier, date courte (fr et en)', () => {
    const days = (labels: typeof LC_LABELS_FR, locale: string) => run([msg('1', { sentAt: at(18, 9, 0) }), msg('2', { sentAt: at(20, 9, 0) }), msg('3')], labels, locale)
      .flatMap((i) => (i.type === 'day' ? [i.label] : []));
    expect(days(LC_LABELS_FR, 'fr').map((l) => l.replace(/\s/g, ' '))).toEqual(['18 nov.', 'Hier', 'Aujourd\'hui']);
    expect(days(LC_LABELS_EN, 'en')).toEqual(['Nov 18', 'Yesterday', 'Today']);
  });

  it('séparateur de jour : date machine locale AAAA-MM-JJ (mois et jour sur deux chiffres)', () => {
    const dates = run([msg('1', { sentAt: at(3, 9, 0) }), msg('2', { sentAt: new Date(2025, 0, 5, 9).toISOString() })]).flatMap((i) => (i.type === 'day' ? [i.date] : []));
    expect(dates).toEqual(['2026-11-03', '2025-01-05']);
  });

  it('jour d\'une autre année : l\'année est ajoutée', () => {
    const [day] = run([msg('1', { sentAt: new Date(2025, 10, 18, 9).toISOString() })]);
    expect(day.type === 'day' && day.label).toMatch(/2025/);
  });

  it('message système : ligne avec heure, sans groupe', () => {
    const sys = run([msg('1', { kind: 'system', text: 'Mise en pause' })]).find((i) => i.type === 'system');
    expect(sys).toMatchObject({ type: 'system', message: { id: '1' }, time: { text: '09:00' } });
  });

  it('groupe : nom nettoyé, mine, classe et mention de son premier message', () => {
    const [g] = groups(run([msg('1', { authorName: 'Al‮ice', mine: true, cssClass: 'note', mention: 'Note interne' })]));
    expect(g).toMatchObject({ authorName: 'Alice', mine: true, cssClass: 'note', mention: 'Note interne' });
  });

  it('id en double : le premier est gardé, avertissement sans le texte', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const [g] = groups(run([msg('1', { text: 'SECRET' }), msg('1', { text: 'autre' })]));
    expect(g.messages.map((m) => m.message.text)).toEqual(['SECRET']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0])).not.toContain('SECRET');
  });

  it('sentAt invalide : pas d\'heure ni de séparateur, avertissement, ordre conservé', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const items = run([msg('1', { sentAt: 'pas une date', text: 'SECRET' }), msg('2')]);
    expect(items.map((i) => i.type)).toEqual(['group']);
    const [g] = groups(items);
    expect(g.time).toBeNull();
    expect(g.messages.map((m) => m.time?.text ?? null)).toEqual([null, '09:00']);
    expect(String(warn.mock.calls[0])).not.toContain('SECRET');
  });

  it('message sans texte ni pièce jointe : aucune bulle', () => {
    expect(run([msg('1', { text: '  ' }), msg('2', { text: undefined, attachments: [] })])).toEqual([]);
    expect(groups(run([msg('1', { text: undefined, attachments: [{ id: 'p', name: 'a.png' }] })]))).toHaveLength(1);
  });
});
