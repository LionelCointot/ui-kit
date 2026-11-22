import { ChangeDetectionStrategy, Component, ViewEncapsulation, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcMessageThreadComponent, type LcThreadMessage } from '@lionelcointot/ui-angular/feedback';
import { LcMessageComposerComponent } from '@lionelcointot/ui-angular/forms';

/* Demo data: a neutral exchange between two people, dates relative to now. */
const NOW = Date.now();
const iso = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();
const other = (id: string, minutesAgo: number, text: string, extra: Partial<LcThreadMessage> = {}): LcThreadMessage =>
  ({ id, authorId: 'alex', authorName: 'Alex Martin', mine: false, sentAt: iso(minutesAgo), text, ...extra });
const mine = (id: string, minutesAgo: number, text: string, extra: Partial<LcThreadMessage> = {}): LcThreadMessage =>
  ({ id, authorId: 'me', authorName: 'Vous', mine: true, sentAt: iso(minutesAgo), text, ...extra });

const SHORT: LcThreadMessage[] = [
  other('1', 30, 'Bonjour, le projet avance bien.'),
  other('2', 29, 'Je prépare la version finale pour demain.'),
  mine('3', 20, 'Parfait, merci pour le point.'),
  mine('4', 19, 'Voir https://example.org/projet pour le détail.'),
  other('5', 5, 'Je vous envoie le document dans la journée.'),
];

const LONG: LcThreadMessage[] = Array.from({ length: 24 }, (_, i) =>
  i % 3 === 2 ? mine(`m${i}`, 200 - i * 5, `Message ${i + 1} de la conversation.`) : other(`m${i}`, 200 - i * 5, `Message ${i + 1} de la conversation.`));

/** Fixed wall-clock time on a local day (`daysAgo` = 1 for yesterday), so the render never depends on when the story is opened. */
const at = (daysAgo: number, hours: number, minutes: number) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo, hours, minutes).toISOString();
};
const photo = (color: string) =>
  'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="${color}"/></svg>`);
const person = (id: string, name: string, sentAt: string, text: string, extra: Partial<LcThreadMessage> = {}): LcThreadMessage =>
  ({ id, authorId: id.split('-')[0], authorName: name, mine: false, sentAt, text, ...extra });
const system = (id: string, sentAt: string, text: string, extra: Partial<LcThreadMessage> = {}): LcThreadMessage =>
  ({ id, authorId: 'sys', authorName: 'Système', mine: false, kind: 'system', sentAt, text, ...extra });

const MARC = 'Marc Lefèvre';
const CAMILLE = 'Camille Bernard';
const CONVERSATION: LcThreadMessage[] = [
  person('me-1', 'Vous', at(1, 9, 12), 'Bonjour, voici une photo du problème.', { mine: true, attachments: [{ id: 'p1', name: 'photo-1.png', previewUrl: photo('#c2410c') }] }),
  person('marc-1', MARC, at(1, 9, 40), 'Merci, je regarde cela et je reviens vers vous.'),
  system('sys-1', at(1, 9, 41), 'En attente', { tone: 'warning', icon: 'clock', detail: 'Attente du devis', ariaLabel: 'Marc a mis la demande en attente, attente du devis' }),
  system('sys-1b', at(1, 9, 50), 'Prise en charge', { tone: 'info' }),
  system('sys-1c', at(1, 9, 55), 'Refusée', { tone: 'error', detail: 'Hors contrat', actionLabel: 'Voir la demande' }),
  system('sys-1d', at(1, 9, 58), 'Mise à jour'),
  system('sys-1e', at(1, 9, 59), 'Mise en avant', { tone: 'highlight' }),
  person('camille-1', CAMILLE, at(0, 8, 30), 'Bonjour, je reprends le dossier. Voir https://example.org/dossier.'),
  person('me-2', 'Vous', at(0, 8, 52), 'Voici une seconde photo, prise ce matin.', { mine: true, attachments: [{ id: 'p2', name: 'photo-2.png', previewUrl: photo('#0369a1') }] }),
  person('camille-2', CAMILLE, at(0, 9, 5), 'Parfait, c\'est bien reçu.'),
  system('sys-2', at(0, 16, 5), 'Résolue', { tone: 'success', detail: 'Clôturée par Camille' }),
];

const NOTE_STYLES = `
    .internal-note {
      --lc-message-thread-bubble-background: var(--lc-sys-color-warning-container);
      --lc-message-thread-bubble-color: var(--lc-sys-color-on-warning-container);
      --lc-message-thread-bubble-border-style: dashed;
      --lc-message-thread-bubble-border-width: var(--lc-sys-border-width-thick);
      --lc-message-thread-bubble-border-color: var(--lc-sys-color-warning);
    }
  `;

/** Internal note: the application sets a class on the message; it redefines the bubble tokens, nothing else. */
@Component({
  selector: 'lc-internal-note-thread-demo',
  imports: [LcMessageThreadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: NOTE_STYLES,
  template: `<div style="height:22rem;display:flex;flex-direction:column"><lc-message-thread [messages]="messages" /></div>`,
})
class InternalNoteThreadDemoComponent {
  protected readonly messages: LcThreadMessage[] = [
    other('n1', 40, 'Pouvez-vous confirmer la date ?'),
    mine('n2', 12, 'À vérifier avec l\'équipe avant de répondre.', { cssClass: 'internal-note', mention: 'Note interne' }),
    mine('n3', 2, 'Je confirme la date demain.'),
  ];
}

/** Full conversation, not height-limited: the thread grows with its content. */
@Component({
  selector: 'lc-conversation-thread-demo',
  imports: [LcMessageThreadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: NOTE_STYLES,
  template: `<div style="max-width:40rem"><lc-message-thread [messages]="messages" [pageSize]="20" /></div>`,
})
class ConversationThreadDemoComponent {
  protected readonly messages = CONVERSATION;
}

/** The thread above a message composer: the composer is projected with `lcThreadComposer`, sending appends a message. */
@Component({
  selector: 'lc-thread-with-composer-demo',
  imports: [LcMessageThreadComponent, LcMessageComposerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="height:28rem;display:flex;flex-direction:column">
      <lc-message-thread [messages]="messages()">
        <lc-message-composer lcThreadComposer ariaLabel="Votre message" placeholder="Écrivez votre message…" [attachments]="false" [(value)]="text" (send)="post($event.text)" />
      </lc-message-thread>
    </div>
  `,
})
class ThreadWithComposerDemoComponent {
  protected readonly messages = signal<LcThreadMessage[]>(SHORT);
  protected readonly text = signal('');

  protected post(text: string): void {
    this.messages.update((list) => [...list, mine(`s${list.length}`, 0, text)]);
    this.text.set('');
  }
}

/**
 * Conversation thread: bubbles grouped by author (name and time once per group), day separators, centered system lines, attachment thumbnails
 * and safe `http(s)` links. Only `messages` is required, oldest first; the thread fills its container (it scrolls inside when the parent limits its height).
 * An arriving message springs in from its outer corner; older messages are revealed while scrolling up.
 *
 * Import: `import { LcMessageThreadComponent } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<LcMessageThreadComponent> = {
  title: 'Feedback/Message thread',
  component: LcMessageThreadComponent,
  decorators: [moduleMetadata({ imports: [LcMessageThreadComponent, LcMessageComposerComponent, LcButtonComponent, StoryMotionNoticeComponent, InternalNoteThreadDemoComponent, ThreadWithComposerDemoComponent, ConversationThreadDemoComponent] })],
  args: { showAvatars: true, pageSize: 10, ariaLabel: 'Échanges' },
  argTypes: { pageSize: { control: 'number' }, messages: { control: false }, attachmentOpen: { action: 'attachmentOpen' } },
};
export default meta;
type Story = StoryObj<LcMessageThreadComponent>;

/** Every input is bound: change them in the Controls panel (24 messages, ten shown first). */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, messages: LONG },
    template: `<div style="height:28rem;display:flex;flex-direction:column"><lc-message-thread [messages]="messages" [showAvatars]="showAvatars" [pageSize]="pageSize" [ariaLabel]="ariaLabel" (attachmentOpen)="attachmentOpen($event)" /></div>`,
  }),
};

/** The whole usage: `messages` alone. */
export const Minimal: Story = {
  parameters: fixedExample,
  render: () => ({ props: { messages: SHORT }, template: `<lc-message-thread [messages]="messages" />` }),
};

/** Day separators, system lines, an internal note, photo thumbnails (open through `attachmentOpen`) and a clickable link. */
export const Conversation: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-conversation-thread-demo />` }),
};

/** Internal note: a `cssClass` on the message redefines the `--lc-message-thread-bubble-*` tokens (dashed border) and `mention` adds a short mark. */
export const InternalNote: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-internal-note-thread-demo />` }),
};

/** With a message composer projected under the thread: send a message and it springs in. */
export const WithComposer: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-thread-with-composer-demo />` }),
};

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcMessageThreadComponent, type LcThreadMessage } from '@lionelcointot/ui-angular/feedback';

@Component({
  selector: 'app-example',
  imports: [LcMessageThreadComponent],
  template: \`
    <div style="height:24rem;display:flex;flex-direction:column">
      <lc-message-thread [messages]="messages()" />
    </div>
  \`,
})
export class ExampleComponent {
  protected readonly messages = signal<LcThreadMessage[]>([]);

  // A message with a new \`id\` springs in; the others slide.
  protected receive(message: LcThreadMessage): void {
    this.messages.update((list) => [...list, message]);
  }
}`;

/** A message arrives on each side, then a batch of three: each springs in from its outer corner (the others slide up, the batch is staggered). "Rejouer" starts again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => {
    const start = SHORT.slice(0, 3);
    const messages = signal<LcThreadMessage[]>(start);
    const add = (...list: LcThreadMessage[]) => messages.update((m) => [...m, ...list]);
    return {
      props: {
        messages,
        ...replayable({
          reset: () => messages.set(start),
          play: (later) => {
            later(0, () => add(other('a1', 0, 'Une nouvelle arrive à gauche.')));
            later(1500, () => add(mine('a2', 0, 'Et une autre à droite.')));
            later(3000, () => add(mine('a3', 0, 'Puis un lot de trois'), mine('a4', 0, 'messages envoyés'), mine('a5', 0, 'd\'un seul coup.')));
          },
        }),
      },
      template: `
        <lc-story-motion-notice />
        <div #root>
          <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="replay(root)">Rejouer</button>
          @for (key of keys(); track key) {
            <div style="height:24rem;display:flex;flex-direction:column"><lc-message-thread [messages]="messages()" /></div>
          }
        </div>`,
    };
  },
};
