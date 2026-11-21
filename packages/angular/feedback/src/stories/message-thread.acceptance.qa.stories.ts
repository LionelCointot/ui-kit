import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LC_LABELS, LC_LABELS_EN, LC_LOCALE } from '@lionelcointot/ui-angular';
import { LcMessageComposerComponent } from '@lionelcointot/ui-angular/forms';
import { LcMessageThreadComponent } from '../message-thread/message-thread.component';
import type { LcThreadMessage } from '../message-thread/message-thread.model';

// Fixture de la spec 2026-11-fil-de-messages (F0, tests d'acceptation) : pilotée par `node tools/qa/message-thread-browser.mjs`, sans `play`.
// Écrite avant le code : le composant est attendu dans ../message-thread/message-thread.component (LcMessageThreadComponent),
// le modèle dans ../message-thread/message-thread.model (LcThreadMessage) ; en attente du code, la construction de Storybook échoue sur ces imports.
// Fenêtre : window.__thread = { set(liste), add(liste), remove(id), patch(partiel), messages(), remount(), destroy() } ; window.__qa.events = [{ type: 'attachmentOpen', detail: { messageId, attachmentId } }].
// Variante « box » : un conteneur #qa-box (colonne flex, hauteur posée par patch({ height }), null = sans hauteur) autour du fil, le fil ne reçoit AUCUN style de la story ;
// variante « bare » : <lc-message-thread [messages] /> seul (CA-T19). #qa-spacer (hauteur patch({ spacer })) précède le fil : la sentinelle part hors écran en défilement de page.
// Classe d'application `qa-note` (CA-T5) : redéfinit les jetons de fond, de couleur et de bordure de la bulle, rien d'autre.

interface QaState {
  showAvatars: boolean;
  pageSize: number;
  ariaLabel: string;
  height: number | null;
  spacer: number;
  composer: boolean;
}

const DEFAULTS: QaState = { showAvatars: true, pageSize: 30, ariaLabel: 'Échanges', height: 400, spacer: 0, composer: true };

declare global {
  interface Window {
    __thread: { set: (l: LcThreadMessage[]) => void; add: (l: LcThreadMessage[]) => void; remove: (id: string) => void; patch: (p: Partial<QaState>) => void; messages: () => LcThreadMessage[]; remount: () => void; destroy: () => void };
    __qa: { events: { type: string; detail: unknown }[] };
  }
}

@Component({
  selector: 'lc-thread-qa',
  imports: [LcMessageThreadComponent, LcMessageComposerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .qa-box { display: flex; flex-direction: column; }
    .qa-note { --lc-message-thread-bubble-background: var(--lc-sys-color-warning-container); --lc-message-thread-bubble-color: var(--lc-sys-color-on-warning-container); --lc-message-thread-bubble-border-style: dashed; --lc-message-thread-bubble-border-width: var(--lc-sys-border-width-thick); --lc-message-thread-bubble-border-color: var(--lc-sys-color-warning); }
  `],
  template: `
    @if (alive()) {
      <div id="qa-spacer" [style.height.px]="s().spacer"></div>
      @if (variant() === 'bare') {
        <lc-message-thread [messages]="msgs()" />
      } @else {
        <div id="qa-box" class="qa-box" [style.height.px]="s().height">
          <lc-message-thread [messages]="msgs()" [showAvatars]="s().showAvatars" [pageSize]="s().pageSize" [ariaLabel]="s().ariaLabel" (attachmentOpen)="open($event)">
            @if (s().composer) {
              <lc-message-composer lcThreadComposer ariaLabel="Votre message" [(value)]="text" />
            }
          </lc-message-thread>
        </div>
      }
    }
    <p id="qa-after">Après</p>
  `,
})
class ThreadQaComponent {
  readonly variant = input<'box' | 'bare'>('box');
  protected readonly s = signal<QaState>({ ...DEFAULTS });
  protected readonly msgs = signal<LcThreadMessage[]>([]);
  protected readonly text = signal('');
  protected readonly alive = signal(true);

  constructor() {
    window.__qa = { events: [] };
    window.__thread = {
      set: (l) => this.msgs.set(l),
      add: (l) => this.msgs.update((m) => [...m, ...l]),
      remove: (id) => this.msgs.update((m) => m.filter((x) => x.id !== id)),
      patch: (p) => this.s.update((v) => ({ ...v, ...p })),
      messages: () => this.msgs(),
      remount: () => { this.alive.set(false); setTimeout(() => this.alive.set(true)); },
      destroy: () => this.alive.set(false),
    };
  }

  protected open(e: { message: LcThreadMessage; attachment: { id: string } }): void {
    window.__qa.events.push({ type: 'attachmentOpen', detail: { messageId: e.message.id, attachmentId: e.attachment.id } });
  }
}

const meta: Meta = {
  title: 'QA/Feedback/Message thread',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [ThreadQaComponent] })],
};
export default meta;
type Story = StoryObj;

export const Acceptance: Story = { render: () => ({ template: `<lc-thread-qa variant="box" />` }) };
/** Libellés et locale anglais (CA-T1 : « Nov 18 »). */
export const AcceptanceEn: Story = {
  decorators: [moduleMetadata({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }, { provide: LC_LOCALE, useValue: { locale: 'en-US', currency: 'USD' } }] })],
  render: () => ({ template: `<lc-thread-qa variant="box" />` }),
};
/** Usage minimal (CA-T19) : aucune autre entrée que `messages`. */
export const Bare: Story = { render: () => ({ template: `<lc-thread-qa variant="bare" />` }) };
