/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_DEFAULT_ICONS, LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcBadgeComponent } from '../badge/badge.component';
import { LcMessageComponent, LcMessageVariant } from './message.component';

@Component({
  imports: [LcMessageComponent, LcBadgeComponent],
  template: `
    <lc-message [variant]="variant()" [author]="author()" [date]="date()" [dateTime]="dateTime()">
      <span class="payload">{{ content() }}</span>
      @if (mention()) { <lc-badge lcMessageMention>Nouveau</lc-badge> }
    </lc-message>
  `,
})
class MessageHostComponent {
  readonly variant = signal<LcMessageVariant>('received');
  readonly author = signal<string | undefined>('Alex Martin');
  readonly date = signal<string | undefined>('12 mars, 14:30');
  readonly dateTime = signal<string | undefined>('2026-03-12T14:30');
  readonly content = signal('Bonjour');
  readonly mention = signal(false);
}

@Component({ imports: [LcMessageComponent], template: '<lc-message variant="sent"></lc-message>' })
class EmptyMessageHostComponent {}

describe('LcMessageComponent (D3)', () => {
  async function setup(configure?: (host: MessageHostComponent) => void) {
    const fixture = TestBed.createComponent(MessageHostComponent);
    configure?.(fixture.componentInstance);
    await fixture.whenStable();
    const message = (fixture.nativeElement as HTMLElement).querySelector('lc-message') as HTMLElement;
    const text = (selector: string) => message.querySelector(selector)?.textContent?.trim();
    return { fixture, message, text };
  }

  describe('variantes', () => {
    it('CA-D3 : reçu par défaut, puis une classe par variante', async () => {
      const { fixture, message } = await setup();
      expect(message.classList).toContain('lc-message');
      expect(message.classList).toContain('lc-message--received');
      for (const variant of ['sent', 'restricted', 'received'] as const) {
        fixture.componentInstance.variant.set(variant);
        await fixture.whenStable();
        expect(message.classList).toContain(`lc-message--${variant}`);
        expect(message.className.match(/lc-message--/g)).toHaveLength(1);
      }
    });

    it('CA-D3 : la note restreinte affiche l\'icône `lock` et son libellé, à l\'écran', async () => {
      const { message, text } = await setup((host) => host.variant.set('restricted'));
      const tag = message.querySelector('.lc-message__tag')!;
      expect(tag.querySelector('lc-icon svg')).not.toBeNull();
      expect(tag.querySelector('lc-icon')!.getAttribute('aria-hidden')).toBe('true');
      expect(text('.lc-message__tag')).toBe('Note à diffusion restreinte');
      expect(message.querySelector('.lc-visually-hidden')).toBeNull();
    });

    it('CA-D3 : l\'icône de la note restreinte est celle de `lock` (et pas celle d\'un autre nom)', async () => {
      const { message } = await setup((host) => host.variant.set('restricted'));
      const template = document.createElement('template');
      template.innerHTML = LC_DEFAULT_ICONS['lock'];
      expect(message.querySelector('.lc-message__tag lc-icon svg')!.innerHTML).toBe(template.content.querySelector('svg')!.innerHTML);
    });

    it.each([['received', 'Message reçu'], ['sent', 'Message envoyé']] as const)(
      'CA-D3 : « %s » porte son libellé « %s » dans le DOM (texte masqué visuellement), sans icône de note',
      async (variant, label) => {
        const { message, text } = await setup((host) => host.variant.set(variant));
        expect(text('.lc-visually-hidden')).toBe(label);
        expect(message.querySelector('.lc-message__tag')).toBeNull();
        expect(message.querySelector('lc-icon')).toBeNull();
      },
    );

    it('CA-D3 : le masquage vient de l\'utilitaire du kit (.lc-visually-hidden) : la feuille du message n\'en redéfinit pas (le rendu réel se mesure dans un navigateur)', () => {
      const css = readFileSync(resolve(process.cwd(), 'packages/angular/feedback/src/message/message.component.css'), 'utf8').replace(/\s+/g, '');
      expect(css).not.toContain('clip');
      expect(css).not.toContain('.lc-message__sr');
      const utility = readFileSync(resolve(process.cwd(), 'packages/tokens/src/base.css'), 'utf8').replace(/\s+/g, '');
      expect(/\.lc-visually-hidden\{([^}]*)\}/.exec(utility)?.[1]).toContain('overflow:hidden');
    });
  });

  describe('auteur, date et mention', () => {
    it('CA-D3 : sans `author`, aucun bloc d\'auteur ; sans auteur ni date, l\'en-tête est vide', async () => {
      const { message, text } = await setup((host) => host.author.set(undefined));
      expect(message.querySelector('.lc-message__author')).toBeNull();
      expect(text('.lc-message__date')).toBe('12 mars, 14:30');
      const fixture2 = await setup((host) => { host.author.set(undefined); host.date.set(undefined); });
      expect(fixture2.message.querySelector('.lc-message__author')).toBeNull();
      expect(fixture2.message.querySelector('time')).toBeNull();
      expect(fixture2.message.querySelector('.lc-message__header')!.children).toHaveLength(0);
    });

    it('CA-D3 : un auteur est rendu en <strong>', async () => {
      const { message } = await setup();
      const author = message.querySelector('.lc-message__author')!;
      expect(author.tagName).toBe('STRONG');
      expect(author.textContent).toBe('Alex Martin');
    });

    it('CA-D3 : la note restreinte sans auteur ni date garde son repère (icône et libellé)', async () => {
      const { message } = await setup((host) => { host.variant.set('restricted'); host.author.set(undefined); host.date.set(undefined); });
      expect(message.querySelector('.lc-message__author')).toBeNull();
      expect(message.querySelector('.lc-message__header .lc-message__tag')).not.toBeNull();
    });

    it('CA-D3 : <time> porte le texte de la date ; `datetime` seulement si `dateTime` est fourni', async () => {
      const { fixture, message } = await setup();
      const time = message.querySelector('time')!;
      expect(time.textContent).toBe('12 mars, 14:30');
      expect(time.getAttribute('datetime')).toBe('2026-03-12T14:30');
      fixture.componentInstance.dateTime.set(undefined);
      await fixture.whenStable();
      expect(message.querySelector('time')!.hasAttribute('datetime')).toBe(false);
    });

    it('CA-D3 : la mention projetée atterrit dans l\'en-tête, le reste dans le contenu', async () => {
      const { message } = await setup((host) => host.mention.set(true));
      const header = message.querySelector('.lc-message__header')!;
      expect(header.querySelector('lc-badge[lcMessageMention]')!.textContent).toBe('Nouveau');
      expect(message.querySelector('.lc-message__content lc-badge')).toBeNull();
      expect(message.querySelector('.lc-message__content .payload')!.textContent).toBe('Bonjour');
      expect(header.querySelector('.payload')).toBeNull();
    });

    it('CA-D3 : un message vide a un contenu vide (rien de projeté, pas d\'en-tête)', async () => {
      const fixture = TestBed.createComponent(EmptyMessageHostComponent);
      await fixture.whenStable();
      const message = (fixture.nativeElement as HTMLElement).querySelector('lc-message')!;
      expect(message.querySelector('.lc-message__content')!.textContent).toBe('');
      expect(message.querySelector('.lc-message__header')!.children).toHaveLength(0);
    });
  });

  describe('lecteur d\'écran : ordre de lecture', () => {
    it('CA-D3 : variante, auteur, date puis contenu, dans cet ordre du DOM', async () => {
      const { message } = await setup();
      const nodes = ['.lc-visually-hidden', '.lc-message__author', 'time', '.lc-message__content'].map((s) => message.querySelector(s)!);
      for (let i = 0; i < nodes.length - 1; i++) {
        expect(nodes[i].compareDocumentPosition(nodes[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING, `${i}`).toBeTruthy();
      }
    });

    it('CA-D3 : le texte rendu se lit dans l\'ordre « variante, auteur, date, contenu »', async () => {
      const { message } = await setup();
      // Pas d'espace dans textContent : chaque partie est un bloc distinct (flex) ; l'arbre d'accessibilité réel se lit dans le navigateur.
      expect(message.textContent!.trim()).toBe('Message reçuAlex Martin12 mars, 14:30Bonjour');
    });

    it('CA-D3 : pour la note restreinte, le libellé précède l\'auteur', async () => {
      const { message } = await setup((host) => host.variant.set('restricted'));
      expect(message.textContent!.trim()).toBe('Note à diffusion restreinteAlex Martin12 mars, 14:30Bonjour');
    });
  });

  describe('libellés (LC_LABELS)', () => {
    it.each([['received', 'Message reçu'], ['sent', 'Message envoyé'], ['restricted', 'Note à diffusion restreinte']] as const)(
      'CA-D3 : libellé français par défaut pour « %s »',
      async (variant, label) => {
        const { message } = await setup((host) => host.variant.set(variant));
        expect(message.textContent).toContain(label);
      },
    );

    it.each([['received', 'Received message'], ['sent', 'Sent message'], ['restricted', 'Restricted note']] as const)(
      'CA-D3 : libellé anglais pour « %s » quand LC_LABELS est fourni en anglais',
      async (variant, label) => {
        TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
        const { message } = await setup((host) => host.variant.set(variant));
        expect(message.textContent).toContain(label);
        expect(message.textContent).not.toContain('Message reçu');
      },
    );

    it('CA-D3 : le libellé suit la variante quand elle change', async () => {
      const { fixture, text } = await setup();
      expect(text('.lc-visually-hidden')).toBe('Message reçu');
      fixture.componentInstance.variant.set('sent');
      await fixture.whenStable();
      expect(text('.lc-visually-hidden')).toBe('Message envoyé');
    });
  });

  describe('contenu très long', () => {
    const long = 'X'.repeat(400);

    it('CA-D3 : un contenu et un auteur sans espace sont rendus en entier', async () => {
      const { message, text } = await setup((host) => { host.content.set(long); host.author.set(long); });
      expect(text('.payload')).toBe(long);
      expect(text('.lc-message__author')).toBe(long);
      expect(message.querySelector('.lc-message__content')!.textContent).toContain(long);
    });

    it('CA-D3 : la feuille coupe les mots longs (lecture de la feuille ; le débordement réel se mesure dans un navigateur)', () => {
      const css = readFileSync(resolve(process.cwd(), 'packages/angular/feedback/src/message/message.component.css'), 'utf8').replace(/\s+/g, '');
      for (const selector of ['.lc-message__content', '.lc-message__author']) {
        const rule = new RegExp(`${selector.replace('.', '\\.')}\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
        expect(rule, selector).toContain('overflow-wrap:anywhere');
        expect(rule, selector).toContain('min-inline-size:0');
      }
    });
  });
});
