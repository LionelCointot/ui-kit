import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcMessageThreadComponent, type LcThreadAttachmentOpenEvent } from './message-thread.component';
import type { LcThreadMessage } from './message-thread.model';

const at = (h: number, m: number) => new Date(2026, 10, 18, h, m).toISOString();
const msg = (id: string, over: Partial<LcThreadMessage> = {}): LcThreadMessage => ({
  id, authorId: 'a', authorName: 'Alice', mine: false, sentAt: at(9, 0), text: `texte ${id}`, ...over,
});

@Component({
  imports: [LcMessageThreadComponent],
  template: `<lc-message-thread [messages]="messages()" [showAvatars]="showAvatars()" [pageSize]="pageSize()" (attachmentOpen)="opened.push($event)"><p lcThreadComposer id="composer">saisie</p></lc-message-thread>`,
})
class HostComponent {
  readonly messages = signal<LcThreadMessage[]>([]);
  readonly showAvatars = signal(true);
  readonly pageSize = signal(30);
  readonly opened: LcThreadAttachmentOpenEvent[] = [];
}

@Component({ imports: [LcMessageThreadComponent], template: `<lc-message-thread [messages]="messages" />` })
class MinimalHostComponent {
  readonly messages = [msg('1')];
}

function render(messages: LcThreadMessage[], setup?: (host: HostComponent) => void) {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.messages.set(messages);
  setup?.(fixture.componentInstance);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  return { fixture, host: fixture.componentInstance, root, q: (s: string) => root.querySelector<HTMLElement>(s), qa: (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s)) };
}

describe('lc-message-thread', () => {
  afterEach(() => vi.restoreAllMocks());

  it('CA-T19 : <lc-message-thread [messages] /> seul suffit', () => {
    const fixture = TestBed.createComponent(MinimalHostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="log"]')?.getAttribute('aria-label')).toBe('Échanges');
    expect(root.querySelectorAll('.lc-message-thread__bubble').length).toBe(1);
  });

  it('role="log" nommé, libellé anglais et ariaLabel fournis', () => {
    expect(render([]).q('[role="log"]')?.getAttribute('aria-label')).toBe('Échanges');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
    expect(render([]).q('[role="log"]')?.getAttribute('aria-label')).toBe('Messages');
    const fixture = TestBed.createComponent(LcMessageThreadComponent);
    fixture.componentRef.setInput('messages', []);
    fixture.componentRef.setInput('ariaLabel', 'Suivi');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="log"]').getAttribute('aria-label')).toBe('Suivi');
  });

  it('CA-T17 : liste vide, aucune bulle ; saisie projetée sous le fil', () => {
    const { q, qa } = render([]);
    expect(qa('.lc-message-thread__bubble').length).toBe(0);
    expect(q('#composer')).not.toBeNull();
    expect(q('#composer')?.previousElementSibling?.getAttribute('role')).toBe('log');
  });

  it('CA-T1 : mes messages dans un groupe « mine », en-tête une fois, heure intermédiaire après 5 min', () => {
    const { qa } = render([msg('1', { mine: true }), msg('2', { mine: true, sentAt: at(9, 1) }), msg('3', { mine: true, sentAt: at(9, 4) }), msg('4', { sentAt: at(9, 5), authorId: 'b', authorName: 'Bob' })]);
    const groups = qa('.lc-message-thread__group');
    expect(groups.map((g) => g.classList.contains('lc-message-thread__group--mine'))).toEqual([true, false]);
    expect(groups[0].querySelectorAll('.lc-message-thread__header').length).toBe(1);
    expect(groups[0].querySelectorAll('.lc-message-thread__bubble').length).toBe(3);
    expect(groups[0].querySelectorAll('.lc-message-thread__time').length).toBe(0);
  });

  it('séparateur de jour', () => {
    const { qa } = render([msg('1')]);
    expect(qa('.lc-message-thread__day').map((e) => e.textContent?.trim())).toEqual(['18 nov.']);
  });

  it('CA-T2 : avatar une fois par groupe des autres, jamais pour moi ni système, masquable', () => {
    const items = [msg('1'), msg('2'), msg('3', { mine: true, authorId: 'me' }), msg('4', { kind: 'system', text: 'Résolu' })];
    const { qa, fixture, host } = render(items);
    expect(qa('lc-avatar').length).toBe(1);
    expect(qa('.lc-message-thread__group').filter((g) => g.querySelector('lc-avatar')).length).toBe(1);
    expect(qa('lc-avatar')[0].getAttribute('aria-hidden')).toBe('true');
    host.showAvatars.set(false);
    fixture.detectChanges();
    expect(qa('lc-avatar').length).toBe(0);
  });

  it('CA-T5 : cssClass posée sur le groupe, mention sous l\'en-tête avant le texte', () => {
    const { q } = render([msg('1', { cssClass: 'note-interne', mention: 'Restreint' })]);
    const group = q('.lc-message-thread__group')!;
    expect(group.classList.contains('note-interne')).toBe(true);
    const mention = q('.lc-message-thread__mention')!;
    expect(mention.textContent).toContain('Restreint');
    expect(mention.compareDocumentPosition(q('.lc-message-thread__bubble')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('CA-T7 : ligne système sans nom ni avatar, heure dans <time>, rompt le groupe', () => {
    const { qa } = render([msg('1'), msg('2', { kind: 'system', text: 'Demande résolue', sentAt: at(9, 1) }), msg('3', { sentAt: at(9, 2) })]);
    expect(qa('.lc-message-thread__group').length).toBe(2);
    const sys = qa('.lc-message-thread__system');
    expect(sys.length).toBe(1);
    expect(sys[0].textContent).toContain('Demande résolue');
    expect(sys[0].querySelector('time')?.getAttribute('datetime')).toBeTruthy();
    expect(sys[0].querySelector('lc-avatar, bdi')).toBeNull();
  });

  it('CA-12 : repère complet, pastille de ton, phrase seule non masquée, action émise une fois', () => {
    const { fixture, qa, q } = render([msg('1', { kind: 'system', text: 'En attente', tone: 'warning', icon: 'clock', detail: 'Attente devis', ariaLabel: 'Marc a mis la demande en attente', actionLabel: 'Voir' })]);
    const emitted: LcThreadMessage[] = [];
    fixture.debugElement.query((d) => d.name === 'lc-message-thread').componentInstance.systemAction.subscribe((m: LcThreadMessage) => emitted.push(m));
    const badge = q('lc-status-badge')!;
    expect(badge.classList.contains('lc-status-badge--warning')).toBe(true);
    expect(badge.textContent).toContain('En attente');
    expect(badge.querySelector('lc-icon')).not.toBeNull();
    expect(badge.querySelector('time')).not.toBeNull();
    expect(q('.lc-message-thread__sr')!.textContent).toBe('Marc a mis la demande en attente');
    expect(q('.lc-message-thread__rule')!.getAttribute('aria-hidden')).toBe('true');
    expect(q('.lc-message-thread__detail')!.getAttribute('aria-hidden')).toBe('true');
    qa('.lc-message-thread__action')[0].click();
    expect(emitted.map((m) => m.id)).toEqual(['1']);
  });

  it('CA-13 : repère sans ton ni ariaLabel : neutre, phrase = mot court, seconde ligne et heure ; ton inconnu : neutre', () => {
    const { q } = render([msg('1', { kind: 'system', text: 'Mise à jour', detail: 'Raison', sentAt: at(9, 5) })]);
    expect(q('lc-status-badge')!.classList.contains('lc-status-badge--neutral')).toBe(true);
    expect(q('.lc-message-thread__sr')!.textContent).toMatch(/^Mise à jour\. Raison\. \d/);
    expect(q('.lc-message-thread__action')).toBeNull();
    TestBed.resetTestingModule();
    const bad = render([msg('2', { kind: 'system', text: 'X', tone: 'inconnu' as never })]);
    expect(bad.q('lc-status-badge')!.classList.contains('lc-status-badge--neutral')).toBe(true);
  });

  it('CA-14 : caractères de contrôle et bidi retirés de text, detail, ariaLabel et actionLabel', () => {
    const { q } = render([msg('1', { kind: 'system', text: 'a\u0000b', detail: 'c‮d', ariaLabel: 'e\u0007f', actionLabel: 'g‏h' })]);
    expect(q('lc-status-badge')!.textContent).toContain('ab');
    expect(q('.lc-message-thread__detail')!.textContent).toBe('cd');
    expect(q('.lc-message-thread__sr')!.textContent).toBe('ef');
    expect(q('.lc-message-thread__action')!.textContent).toBe('gh');
  });

  it('CA-T8 : adresse http(s) en lien sûr ; javascript: et HTML en texte', () => {
    const { qa } = render([msg('1', { text: 'Suivi https://exemple.fr/suivi/1234. javascript:alert(1) <img src=x onerror=alert(1)>\nligne 2' })]);
    const links = qa('.lc-message-thread__text a');
    expect(links.length).toBe(1);
    expect(links[0].textContent).toBe('https://exemple.fr/suivi/1234');
    expect(links[0].getAttribute('href')).toBe('https://exemple.fr/suivi/1234');
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    const text = qa('.lc-message-thread__text')[0];
    expect(text.querySelector('img')).toBeNull();
    expect(text.textContent).toContain('javascript:alert(1) <img src=x onerror=alert(1)>\nligne 2');
  });

  it('CA-T16 : caractères de contrôle et bidi retirés du nom, du texte et des noms de pièces jointes ; nom dans <bdi>', () => {
    const { q } = render([msg('1', { authorName: 'Al‮ice\u0000', text: 'a‏b\u0007c', attachments: [{ id: 'f', name: 'x‮y.pdf' }] })]);
    expect(q('bdi')?.textContent).toBe('Alice');
    expect(q('.lc-message-thread__text')?.textContent).toBe('abc');
    expect(q('.lc-message-thread__thumb')?.getAttribute('aria-label')).toBe('Ouvrir la pièce jointe : xy.pdf');
    expect(q('.lc-message-thread__thumb')?.getAttribute('title')).toBe('xy.pdf');
  });

  describe('CA-T6 : pièces jointes', () => {
    const attachments = [
      { id: 'a', name: 'ok.png', previewUrl: 'data:image/png;base64,AAAA' },
      { id: 'b', name: 'blob.png', previewUrl: 'blob:http://localhost/1' },
      { id: 'c', name: 'js', previewUrl: 'javascript:alert(1)' },
      { id: 'd', name: 'html', previewUrl: 'data:text/html,<b>x</b>' },
      { id: 'e', name: 'tiers', previewUrl: 'https://evil.test/p.png' },
      { id: 'f', name: 'sans-aperçu' },
    ];

    it('<img> seulement pour un aperçu admis, sinon icône', () => {
      const { qa } = render([msg('1', { text: undefined, attachments })]);
      const thumbs = qa('button.lc-message-thread__thumb');
      expect(thumbs.map((t) => !!t.querySelector('img'))).toEqual([true, true, false, false, false, false]);
      expect(qa('img').map((i) => i.getAttribute('src'))).toEqual(['data:image/png;base64,AAAA', 'blob:http://localhost/1']);
      expect(thumbs[5].querySelector('lc-icon')).not.toBeNull();
    });

    it('message sans texte : pas de zone de texte ; nom accessible', () => {
      const { q } = render([msg('1', { text: undefined, attachments })]);
      expect(q('.lc-message-thread__text')).toBeNull();
      expect(q('.lc-message-thread__thumb')?.getAttribute('aria-label')).toBe('Ouvrir la pièce jointe : ok.png');
    });

    it('un clic émet attachmentOpen une fois avec le message et la pièce jointe', () => {
      const message = msg('1', { attachments: [attachments[5]] });
      const { q, host } = render([message]);
      q('.lc-message-thread__thumb')!.click();
      expect(host.opened).toEqual([{ message, attachment: attachments[5] }]);
    });
  });


  it('le message ajouté apparaît à la mise à jour de la liste', () => {
    const { fixture, host, qa } = render([msg('1')]);
    host.messages.update((m) => [...m, msg('2', { sentAt: at(9, 1) })]);
    fixture.detectChanges();
    expect(qa('.lc-message-thread__bubble').length).toBe(2);
  });

  it('séparateur de jour : <time datetime="AAAA-MM-JJ">', () => {
    expect(render([msg('1')]).q('time.lc-message-thread__day')?.getAttribute('datetime')).toBe('2026-11-18');
  });

  describe('affichage progressif', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => msg(String(i + 1), { sentAt: at(9, i) }));
    const ids = (qa: (s: string) => HTMLElement[]) => qa('[data-message-id]').map((e) => e.dataset['messageId']);
    let notify: (visible: boolean) => void = () => undefined;

    beforeEach(() => {
      vi.stubGlobal('IntersectionObserver', class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          notify = (isIntersecting) => callback([{ isIntersecting }]);
        }
        observe() { /* sans effet */ }
        disconnect() { /* sans effet */ }
      });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('seuls les pageSize derniers sont rendus, puis un palier chaque fois que la sentinelle revient à l\'écran, jusqu\'au dernier', async () => {
      const { fixture, qa, q } = render(many(25), (h) => h.pageSize.set(10));
      await fixture.whenStable();
      expect(ids(qa)).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 16)));
      notify(true); // sentinelle déjà visible au départ : pas de palier
      fixture.detectChanges();
      expect(qa('[data-message-id]').length).toBe(10);
      for (const expected of [20, 25, 25]) {
        notify(false);
        notify(true);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(qa('[data-message-id]').length).toBe(expected);
      }
      expect(ids(qa)[0]).toBe('1');
      expect(q('[role="log"]')?.hasAttribute('aria-busy')).toBe(false);
    });

    it('conteneur qui défile non rempli (place libre au-dessus de la sentinelle) : les paliers s\'enchaînent jusqu\'au premier message, sans boucle', async () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        return { top: this.classList.contains('lc-message-thread__sentinel') ? 100 : 0 } as DOMRect;
      });
      const { fixture, qa } = render(many(25), (h) => h.pageSize.set(10));
      for (let i = 0; i < 5; i++) { await fixture.whenStable(); fixture.detectChanges(); }
      expect(qa('[data-message-id]').length).toBe(25);
    });

    it.each([0, -3, 2.5, NaN])('pageSize %s : 30 messages rendus', (size) => {
      const { qa } = render(many(40), (h) => h.pageSize.set(size));
      expect(qa('[data-message-id]').length).toBe(30);
    });
  });
});
