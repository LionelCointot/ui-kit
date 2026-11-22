import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LcMessageThreadComponent } from './message-thread.component';
import type { LcThreadMessage } from './message-thread.model';

// Acceptation de docs/specs/2026-11-fil-de-messages.md (F0), écrite avant le code : CA-T17 (cas limites du modèle, avertissements), CA-T16 (nettoyage, console), CA-T19 (usage minimal).
// Contrat : LcMessageThreadComponent dans ./message-thread.component, bulle .lc-message-thread__bubble, role="log". Le comportement réel (mise en page, mouvement) est dans tools/qa/message-thread-browser.mjs.

const msg = (id: string, o: Partial<LcThreadMessage> = {}): LcThreadMessage => ({ id, authorId: 'a', authorName: 'Alice', mine: false, sentAt: '2026-11-21T09:00:00Z', text: `t-${id}`, ...o });

@Component({ imports: [LcMessageThreadComponent], template: '<lc-message-thread [messages]="messages()" />' })
class MinimalHostComponent {
  readonly messages = signal<LcThreadMessage[]>([]);
}

async function render(messages: LcThreadMessage[]) {
  const fixture = TestBed.createComponent(MinimalHostComponent);
  fixture.componentInstance.messages.set(messages);
  fixture.detectChanges();
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;
  return { fixture, el, bubbles: () => [...el.querySelectorAll<HTMLElement>('.lc-message-thread__bubble')] };
}

const spies = () => (['warn', 'log', 'error', 'info', 'debug'] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => undefined));
const printed = (s: ReturnType<typeof spies>) => JSON.stringify(s.flatMap((x) => x.mock.calls));

afterEach(() => vi.restoreAllMocks());

describe('CA-T19 usage minimal : <lc-message-thread [messages] /> seul', () => {
  it('rend un fil nommé (role="log", libellé par défaut) et une bulle par message, sans erreur', async () => {
    const s = spies();
    const { el, bubbles } = await render([msg('1'), msg('2', { mine: true, authorId: 'me' }), msg('3', { kind: 'system' })]);
    const log = el.querySelector('[role="log"]');
    expect(log).not.toBeNull();
    expect((log!.getAttribute('aria-label') ?? '').trim().length).toBeGreaterThan(0);
    expect(bubbles()).toHaveLength(2); // le message système est une ligne, pas une bulle
    expect(s[4].mock.calls.length + s[3].mock.calls.length + s[2].mock.calls.length).toBe(0);
  });
});

describe('CA-T17 cas limites du modèle', () => {
  it('liste vide : aucune bulle, role="log" présent', async () => {
    const { el, bubbles } = await render([]);
    expect(bubbles()).toHaveLength(0);
    expect(el.querySelector('[role="log"]')).not.toBeNull();
  });

  it('id en double : le premier est rendu, avertissement sans le texte', async () => {
    const s = spies();
    const { bubbles } = await render([msg('1', { text: 'premier' }), msg('1', { text: 'second' })]);
    expect(bubbles()).toHaveLength(1);
    expect(bubbles()[0].textContent).toContain('premier');
    expect(bubbles()[0].textContent).not.toContain('second');
    expect(s[0]).toHaveBeenCalled();
    expect(printed(s)).not.toMatch(/premier|second/);
  });

  it('sentAt invalide : bulle rendue sans <time>, avertissement sans le texte', async () => {
    const s = spies();
    const { el, bubbles } = await render([msg('1', { sentAt: 'pas une date', text: 'secret-invalide' })]);
    expect(bubbles()).toHaveLength(1);
    expect(el.querySelectorAll('time')).toHaveLength(0);
    expect(s[0]).toHaveBeenCalled();
    expect(printed(s)).not.toContain('secret-invalide');
  });

  it('message sans texte ni pièce jointe : aucune bulle vide ; pièce jointe seule : une bulle', async () => {
    const { bubbles } = await render([msg('1', { text: undefined }), msg('2', { text: '', authorId: 'b' }), msg('3', { text: undefined, authorId: 'c', attachments: [{ id: 'f', name: 'photo.png' }] })]);
    expect(bubbles()).toHaveLength(1);
    expect(bubbles()[0].querySelector('button')).not.toBeNull();
  });

  it('ordre de la liste conservé (dates décroissantes)', async () => {
    const { bubbles } = await render([msg('1', { sentAt: '2026-11-21T09:30:00Z' }), msg('2', { sentAt: '2026-11-21T09:00:00Z', authorId: 'b' }), msg('3', { sentAt: '2026-11-21T08:00:00Z', authorId: 'c' })]);
    expect(bubbles().map((b) => b.textContent?.match(/t-\d/)?.[0])).toEqual(['t-1', 't-2', 't-3']);
  });
});

describe('CA-T16 nettoyage et console', () => {
  it('contrôles et bidi retirés du nom et du texte (DOM, aria-label, title) ; retours à la ligne gardés ; nom dans <bdi> ; rien dans la console', async () => {
    const s = spies();
    const { el } = await render([msg('1', { authorName: 'Al\u202Eice\u0007 Dupont', text: 'Bon\u202Ejour\u0000\nsuite\u200F' })]);
    const UNSAFE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u061C\u200B-\u200F\u2028-\u202E\u2060\u2066-\u2069\uFEFF]/;
    expect(el.innerHTML).not.toMatch(UNSAFE);
    for (const e of el.querySelectorAll('[aria-label], [title]')) expect(`${e.getAttribute('aria-label')}${e.getAttribute('title')}`).not.toMatch(UNSAFE);
    expect(el.querySelector('bdi')?.textContent).toBe('Alice Dupont');
    expect(el.querySelector('.lc-message-thread__bubble')?.textContent).toContain('Bonjour\nsuite');
    expect(printed(s)).not.toMatch(/Dupont|Bonjour/);
  });
});
