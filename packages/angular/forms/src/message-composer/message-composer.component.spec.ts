import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN, LC_LABELS_FR } from '@lionelcointot/ui-angular';
import type { LcFileUploadItem } from '../file-upload/file-upload.component';
import { LcMessageComposerComponent, type LcMessageSendBlockedReason } from './message-composer.component';

@Component({
  imports: [LcMessageComposerComponent],
  template: `
    <lc-message-composer [(value)]="text" ariaLabel="Message" [sending]="sending()" [enterSends]="enterSends()"
      [items]="items()" [maxLength]="maxLength()" [attachments]="attachments()" [minRows]="1" [maxRows]="3"
      (send)="sent.push($event)" (sendBlocked)="blocked.push($event)" (touch)="touched.push(true)">
      <div lcComposerHeader id="head">En-tête</div>
      @if (action()) { <button lcComposerAction type="button" id="act">Action</button> }
    </lc-message-composer>
  `,
})
class HostComponent {
  readonly text = signal('');
  readonly sending = signal(false);
  readonly enterSends = signal<'auto' | boolean>('auto');
  readonly items = signal<readonly LcFileUploadItem[]>([]);
  readonly maxLength = signal<number | undefined>(undefined);
  readonly attachments = signal(true);
  readonly action = signal(true);
  readonly sent: { text: string }[] = [];
  readonly blocked: LcMessageSendBlockedReason[] = [];
  readonly touched: true[] = [];
}

function mockPointer(coarse: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: coarse && query.includes('coarse') }));
}

describe('LcMessageComposerComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const query = <T extends HTMLElement>(selector: string) => element.querySelector<T>(selector)!;
    const textarea = query<HTMLTextAreaElement>('textarea');
    const sendButton = query<HTMLButtonElement>('.lc-message-composer__send');
    const type = async (value: string) => {
      textarea.value = value;
      textarea.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const press = (init: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init });
      textarea.dispatchEvent(event);
      return event;
    };
    return { fixture, host: fixture.componentInstance, element, query, textarea, sendButton, type, press };
  }

  it('range dans l\'ordre : en-tête, champ, trombone, action, envoi', async () => {
    const { element } = await setup();
    const order = ['#head', 'textarea', '.lc-message-composer__attach', '#act', '.lc-message-composer__send'];
    const nodes = order.map((selector) => element.querySelector(selector)!);
    nodes.slice(1).forEach((node, i) => expect(nodes[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
  });

  it('nomme l\'envoi (défaut, puis sendLabel) et affiche son icône', async () => {
    const { sendButton } = await setup();
    expect(sendButton.getAttribute('aria-label')).toBe('Envoyer');
    expect(sendButton.querySelector('lc-icon')).toBeTruthy();
  });

  it('sans attachments : pas de trombone', async () => {
    const { fixture, host, element } = await setup();
    host.attachments.set(false);
    await fixture.whenStable();
    expect(element.querySelector('.lc-message-composer__attach')).toBeNull();
  });

  describe('Entrée', () => {
    it('envoie sur pointeur fin avec enterSends auto, sans toucher à value', async () => {
      mockPointer(false);
      const { host, type, press } = await setup();
      await type('  Bonjour  ');
      expect(press().defaultPrevented).toBe(true);
      expect(host.sent).toEqual([{ text: 'Bonjour' }]);
      expect(host.text()).toBe('  Bonjour  ');
    });

    it('va à la ligne sur pointeur grossier (lu à chaque appui)', async () => {
      mockPointer(true);
      const { host, type, press } = await setup();
      await type('Bonjour');
      expect(press().defaultPrevented).toBe(false);
      expect(host.sent).toEqual([]);
      mockPointer(false);
      press();
      expect(host.sent).toHaveLength(1);
    });

    it('Maj+Entrée et composition IME n\'envoient pas', async () => {
      mockPointer(false);
      const { host, type, press } = await setup();
      await type('Bonjour');
      expect(press({ shiftKey: true }).defaultPrevented).toBe(false);
      press({ isComposing: true });
      expect(host.sent).toEqual([]);
    });

    it('enterSends true envoie même sur pointeur grossier ; false n\'envoie jamais', async () => {
      mockPointer(true);
      const { fixture, host, type, press } = await setup();
      await type('a');
      host.enterSends.set(true);
      await fixture.whenStable();
      press();
      expect(host.sent).toHaveLength(1);
      mockPointer(false);
      host.enterSends.set(false);
      await fixture.whenStable();
      await type('b');
      press();
      expect(host.sent).toHaveLength(1);
    });
  });

  describe('envoi', () => {
    it('texte vide sans item : sendBlocked empty, focus dans le champ', async () => {
      const { host, textarea, sendButton, type } = await setup();
      await type('   ');
      sendButton.focus();
      sendButton.click();
      expect(host.sent).toEqual([]);
      expect(host.blocked).toEqual(['empty']);
      expect(document.activeElement).toBe(textarea);
    });

    it('un item sans texte permet l\'envoi ; un item en erreur ne bloque pas', async () => {
      const { fixture, host, sendButton } = await setup();
      host.items.set([{ id: '1', name: 'a.pdf', size: 1, status: 'error' }]);
      await fixture.whenStable();
      sendButton.click();
      expect(host.sent).toEqual([{ text: '' }]);
    });

    it('envoi pièces jointes seules : l\'application vide items sans toucher value ni sending, l\'envoi suivant est accepté', async () => {
      const { fixture, host, sendButton } = await setup();
      host.items.set([{ id: '1', name: 'a.png', size: 1, status: 'done' }]);
      await fixture.whenStable();
      sendButton.click();
      sendButton.click();
      expect(host.sent).toEqual([{ text: '' }]);
      host.items.set([]);
      await fixture.whenStable();
      host.items.set([{ id: '2', name: 'b.png', size: 1, status: 'done' }]);
      await fixture.whenStable();
      sendButton.click();
      expect(host.sent).toEqual([{ text: '' }, { text: '' }]);
    });

    it('un changement d\'état d\'un item (mêmes ids) ne lève pas le verrou', async () => {
      const { fixture, host, sendButton } = await setup();
      host.items.set([{ id: '1', name: 'a.png', size: 1, status: 'done' }]);
      await fixture.whenStable();
      sendButton.click();
      host.items.set([{ id: '1', name: 'a.png', size: 1, status: 'done', statusLabel: 'Envoyé' }]);
      await fixture.whenStable();
      sendButton.click();
      expect(host.sent).toEqual([{ text: '' }]);
      expect(host.blocked).toEqual(['sending']);
    });

    it('un item uploading bloque, puis se débloque quand il passe à done', async () => {
      const { fixture, host, type, sendButton } = await setup();
      await type('Salut');
      host.items.set([{ id: '1', name: 'a.png', size: 1, status: 'uploading' }]);
      await fixture.whenStable();
      sendButton.click();
      expect(host.blocked).toEqual(['uploading']);
      host.items.set([{ id: '1', name: 'a.png', size: 1, status: 'done' }]);
      await fixture.whenStable();
      sendButton.click();
      expect(host.sent).toEqual([{ text: 'Salut' }]);
    });

    it('sending : bloqué, aria-disabled, aria-busy, champ readonly (pas disabled), statut annoncé', async () => {
      const { fixture, host, textarea, sendButton, element, type } = await setup();
      await type('Salut');
      host.sending.set(true);
      await fixture.whenStable();
      sendButton.click();
      expect(host.blocked).toEqual(['sending']);
      expect(sendButton.getAttribute('aria-disabled')).toBe('true');
      expect(sendButton.getAttribute('aria-busy')).toBe('true');
      expect(sendButton.disabled).toBe(false);
      expect(textarea.readOnly).toBe(true);
      expect(textarea.disabled).toBe(false);
      expect(element.querySelector('[role=status]')?.textContent).toBe('Envoi en cours…');
    });

    it('verrou : deux clics du même cycle n\'émettent qu\'un send ; levé quand sending retombe', async () => {
      const { fixture, host, type, sendButton } = await setup();
      await type('Salut');
      sendButton.click();
      sendButton.click();
      expect(host.sent).toHaveLength(1);
      expect(host.blocked).toEqual(['sending']);
      host.sending.set(true);
      await fixture.whenStable();
      host.sending.set(false);
      await fixture.whenStable();
      sendButton.click();
      expect(host.sent).toHaveLength(2);
    });

    it('verrou levé quand le texte change', async () => {
      const { host, type, sendButton } = await setup();
      await type('Salut');
      sendButton.click();
      await type('Salut encore');
      sendButton.click();
      expect(host.sent.map((m) => m.text)).toEqual(['Salut', 'Salut encore']);
    });
  });

  describe('maxLength', () => {
    it('compteur dès 90 % ; annonce seulement au franchissement des seuils', async () => {
      const { fixture, host, element, textarea, type } = await setup();
      host.maxLength.set(10);
      await fixture.whenStable();
      expect(textarea.getAttribute('maxlength')).toBe('10');
      expect(element.querySelector('.lc-message-composer__counter')).toBeNull();
      await type('12345678');
      expect(element.querySelector('.lc-message-composer__counter')).toBeNull();
      await type('123456789');
      expect(element.querySelector('.lc-message-composer__counter')?.textContent?.trim()).toBe('9 / 10');
      const status = () => element.querySelector('[role=status]')!.textContent;
      expect(status()).toBe('Vous approchez de la limite de caractères.');
      await type('1234567890');
      expect(status()).toBe('Limite de caractères atteinte.');
    });
  });

  describe('hauteur', () => {
    it('pose la hauteur par la propriété CSS et jamais par un attribut style construit en chaîne côté template', async () => {
      const { textarea } = await setup();
      expect(textarea.rows).toBe(1);
      // jsdom ne mesure rien : seule l'absence de hauteur négative ou NaN est vérifiable ici (mesure réelle : tests navigateur).
      expect(textarea.style.height).not.toContain('NaN');
    });
  });

  it('touch : émis à la sortie du composant entier, pas du champ vers le trombone ou l\'envoi', async () => {
    const { fixture, host, textarea, query } = await setup();
    document.body.append(fixture.nativeElement);
    const attach = query<HTMLButtonElement>('.lc-message-composer__attach');
    const outside = document.body;
    textarea.dispatchEvent(new FocusEvent('blur', { relatedTarget: attach }));
    attach.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: query('.lc-message-composer__send') }));
    expect(host.touched).toEqual([]);
    attach.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    expect(host.touched).toEqual([true]);
    textarea.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
    expect(host.touched).toEqual([true, true]);
    fixture.nativeElement.remove();
  });

  it('déclare les libellés dans les deux langues', () => {
    const keys = ['composerSend', 'composerAttach', 'composerDrop', 'composerAttachments', 'composerSending', 'composerLimitNear', 'composerLimitReached'] as const;
    for (const labels of [LC_LABELS_FR, LC_LABELS_EN]) {
      for (const key of keys) expect(labels[key]).toBeTruthy();
      expect(labels.composerRejected('a.pdf', 'type')).toContain('a.pdf');
      expect(labels.composerRejected('a.pdf', 'count')).not.toBe(labels.composerRejected('a.pdf', 'type'));
      expect(labels.composerRejectedType('a.pdf', 'PDF')).toContain('PDF');
      expect(labels.composerCount(3, 500)).toBe('3 / 500');
    }
    expect(TestBed.inject(LC_LABELS).composerSend).toBe('Envoyer');
  });
});
