import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { LC_LABELS, LC_LOCALE, LcAvatarComponent, LcIconComponent, isSafePreviewUrl, lcStripUnsafeChars } from '@lionelcointot/ui-angular';
import { groupThreadMessages, type LcThreadItem, type LcThreadTime } from './message-thread-grouping';
import { splitLinks, type LcTextPart } from './message-thread-links';
import type { LcThreadAttachment, LcThreadMessage } from './message-thread.model';

/** Émis quand on ouvre une pièce jointe (clic, Entrée ou Espace sur sa vignette). */
export interface LcThreadAttachmentOpenEvent {
  message: LcThreadMessage;
  attachment: LcThreadAttachment;
}

interface ThreadThumb {
  attachment: LcThreadAttachment;
  /** Nom sans caractères de contrôle ni marqueurs bidi. */
  name: string;
  /** Définie seulement si l'aperçu est admis (`isSafePreviewUrl`). */
  previewUrl: string | null;
}
interface ThreadBubble {
  message: LcThreadMessage;
  time: LcThreadTime | null;
  /** `null` : message sans texte, aucune zone de texte. */
  parts: LcTextPart[] | null;
  thumbs: ThreadThumb[];
}
type ThreadView =
  | { type: 'day'; key: string; label: string }
  | { type: 'system'; key: string; text: string; time: LcThreadTime | null }
  | { type: 'group'; key: string; authorName: string; mine: boolean; cssClass: string; mention: string | undefined; time: LcThreadTime | null; bubbles: ThreadBubble[] };

function toView(item: LcThreadItem): ThreadView {
  if (item.type === 'day') return item;
  if (item.type === 'system') return { type: 'system', key: item.key, text: lcStripUnsafeChars(item.message.text ?? ''), time: item.time };
  return {
    type: 'group', key: item.key, authorName: item.authorName, mine: item.mine, cssClass: item.cssClass, time: item.time,
    mention: item.mention === undefined ? undefined : lcStripUnsafeChars(item.mention),
    bubbles: item.messages.map(({ message, time }) => {
      const text = lcStripUnsafeChars(message.text ?? '');
      return {
        message, time,
        parts: text.trim() ? splitLinks(text) : null,
        thumbs: (message.attachments ?? []).map((attachment) => ({
          attachment, name: lcStripUnsafeChars(attachment.name),
          previewUrl: attachment.previewUrl && isSafePreviewUrl(attachment.previewUrl) ? attachment.previewUrl : null,
        })),
      };
    }),
  };
}

/**
 * Fil de messages : bulles regroupées par auteur (nom et heure en tête de groupe), séparateurs de jour, lignes système,
 * pièces jointes en vignettes et adresses `http(s)` cliquables. Seule entrée obligatoire : `messages` (du plus ancien au plus récent).
 * La zone de saisie se projette sous le fil (`[lcThreadComposer]`) ; le composant remplit son conteneur et défile à l'intérieur.
 * Une classe (`cssClass` d'un message) peut redéfinir `--lc-message-thread-bubble-background`, `-bubble-color` et les jetons de bordure.
 *
 * @example <lc-message-thread [messages]="messages" (attachmentOpen)="open($event)" />
 */
@Component({
  selector: 'lc-message-thread',
  imports: [LcAvatarComponent, LcIconComponent],
  template: `
    <div #log class="lc-message-thread__log" role="log" [attr.aria-label]="ariaLabel() || labels.threadLabel" [attr.tabindex]="scrolls() ? 0 : null">
      <div #inner class="lc-message-thread__inner">
        <div class="lc-message-thread__sentinel"></div>
        @for (item of view(); track item.key) {
          @switch (item.type) {
            @case ('day') {
              <p class="lc-message-thread__day" [attr.data-key]="item.key"><span>{{ item.label }}</span></p>
            }
            @case ('system') {
              <p class="lc-message-thread__system" [attr.data-key]="item.key">{{ item.text }}@if (item.time; as t) { · <time [attr.datetime]="t.iso">{{ t.text }}</time>}</p>
            }
            @case ('group') {
              <div class="lc-message-thread__group" [class]="item.cssClass" [class.lc-message-thread__group--mine]="item.mine" [attr.data-key]="item.key">
                @if (showAvatars() && !item.mine) {
                  <lc-avatar class="lc-message-thread__avatar" [name]="item.authorName" />
                }
                <div class="lc-message-thread__column">
                  <p class="lc-message-thread__header">
                    <bdi class="lc-message-thread__author">{{ item.authorName }}</bdi>
                    @if (item.time; as t) { <time [attr.datetime]="t.iso">{{ t.text }}</time> }
                    @if (item.mention) { <span class="lc-message-thread__mention"><lc-icon name="lock" />{{ item.mention }}</span> }
                  </p>
                  @for (bubble of item.bubbles; track bubble.message.id) {
                    <div class="lc-message-thread__message" [attr.data-message-id]="bubble.message.id">
                      @if (bubble.time; as t) { <p class="lc-message-thread__time"><time [attr.datetime]="t.iso">{{ t.text }}</time></p> }
                      <div class="lc-message-thread__bubble">
                        @if (bubble.parts; as parts) {
                          <span class="lc-message-thread__text">@for (part of parts; track $index) {@if (part.type === 'link') {<a [href]="part.href" target="_blank" rel="noopener noreferrer">{{ part.text }}</a>} @else {<ng-container>{{ part.text }}</ng-container>}}</span>
                        }
                        @if (bubble.thumbs.length) {
                          <div class="lc-message-thread__thumbs">
                            @for (thumb of bubble.thumbs; track thumb.attachment.id) {
                              <button type="button" class="lc-message-thread__thumb" [attr.aria-label]="labels.threadAttachmentOpen(thumb.name)" [attr.title]="thumb.name"
                                (click)="attachmentOpen.emit({ message: bubble.message, attachment: thumb.attachment })">
                                @if (thumb.previewUrl; as src) {
                                  <img [src]="src" alt="" />
                                } @else {
                                  <lc-icon name="file-text" /><span class="lc-message-thread__thumb-name">{{ thumb.name }}</span>
                                }
                              </button>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        }
      </div>
    </div>
    <ng-content select="[lcThreadComposer]" />
  `,
  styleUrl: './message-thread.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-message-thread' },
})
export class LcMessageThreadComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly locale = inject(LC_LOCALE).locale;
  private readonly destroyRef = inject(DestroyRef);

  /** Messages du plus ancien au plus récent ; seule entrée obligatoire. */
  readonly messages = input.required<readonly LcThreadMessage[]>();
  /** Avatar des autres auteurs, une fois par groupe. */
  readonly showAvatars = input(true);
  /** Taille d'une page de l'affichage progressif (pas encore utilisée). */
  readonly pageSize = input(30);
  /** Nom accessible du fil ; `threadLabel` par défaut. */
  readonly ariaLabel = input<string>();

  readonly attachmentOpen = output<LcThreadAttachmentOpenEvent>();

  private readonly log = viewChild.required<ElementRef<HTMLElement>>('log');
  private readonly inner = viewChild.required<ElementRef<HTMLElement>>('inner');
  /** Le fil défile lui-même : il devient atteignable au clavier. */
  protected readonly scrolls = signal(false);

  protected readonly view = computed(() => groupThreadMessages(this.messages(), { locale: this.locale, labels: this.labels }).map(toView));

  constructor() {
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const log = this.log().nativeElement;
      const observer = new ResizeObserver(() => this.scrolls.set(log.scrollHeight > log.clientHeight));
      observer.observe(log);
      observer.observe(this.inner().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
