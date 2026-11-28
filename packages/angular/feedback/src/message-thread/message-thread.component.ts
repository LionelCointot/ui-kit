import { ChangeDetectionStrategy, Component, booleanAttribute, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { LC_LABELS, LC_LOCALE, LcAvatarComponent, FLIP_THRESHOLD_PX, LcIconComponent, LcSkeletonComponent, isSafePreviewUrl, lcDataState, lcAnimate, lcCssMs, lcPrefersReducedMotion, lcStripUnsafeChars, staggerDelay } from '@lionelcointot/ui-angular';
import { groupThreadMessages, type LcThreadItem, type LcThreadTime } from './message-thread-grouping';
import { splitLinks, type LcTextPart } from './message-thread-links';
import { LC_STATUS_ICONS } from '../status-icons';
import { LcStatusBadgeComponent } from '../status-badge/status-badge.component';
import { ArrivalTracker, normalizePageSize } from './message-thread-motion';
import type { LcStatusBadgeKind } from '../status-icons';
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
  | { type: 'day'; key: string; label: string; date: string }
  | { type: 'system'; key: string; message: LcThreadMessage; text: string; detail: string; tone: LcStatusBadgeKind; icon: string | undefined; sentence: string; action: string; time: LcThreadTime | null }
  | { type: 'group'; key: string; authorName: string; mine: boolean; cssClass: string; mention: string | undefined; time: LcThreadTime | null; bubbles: ThreadBubble[] };

function toView(item: LcThreadItem): ThreadView {
  if (item.type === 'day') return item;
  if (item.type === 'system') {
    const { message, time } = item;
    const text = lcStripUnsafeChars(message.text ?? '');
    const detail = lcStripUnsafeChars(message.detail ?? '');
    const tone = message.tone && message.tone in LC_STATUS_ICONS ? message.tone : 'neutral';
    // Sans `ariaLabel`, la phrase lue est le mot court, la seconde ligne et l'heure.
    const sentence = lcStripUnsafeChars(message.ariaLabel ?? '') || [text, detail, time?.text].filter(Boolean).join('. ');
    return { type: 'system', key: item.key, message, text, detail, tone, icon: message.icon, sentence, action: lcStripUnsafeChars(message.actionLabel ?? ''), time };
  }
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

/** Éléments qui glissent quand un message arrive. */
const MOVING = '.lc-message-thread__message, .lc-message-thread__header, .lc-message-thread__avatar, .lc-message-thread__day, .lc-message-thread__system';
const ENTERING = '[data-message-id], .lc-message-thread__system';

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
  imports: [LcAvatarComponent, LcIconComponent, LcSkeletonComponent, LcStatusBadgeComponent],
  template: `
    <div #log class="lc-message-thread__log" role="log" [attr.aria-label]="ariaLabel() || labels.threadLabel" [attr.tabindex]="scrolls() ? 0 : null">
      <div #inner class="lc-message-thread__inner">
        <div #sentinel class="lc-message-thread__sentinel"></div>
        @if (state() === 'loading') {
          <div class="lc-message-thread__skeleton" aria-hidden="true">
            <div class="lc-message-thread__skeleton-row"><lc-skeleton shape="rect" width="calc(var(--lc-sys-space-16) * 3)" height="var(--lc-sys-space-12)" /></div>
            <div class="lc-message-thread__skeleton-row lc-message-thread__skeleton-row--mine"><lc-skeleton shape="rect" width="calc(var(--lc-sys-space-16) * 2)" height="var(--lc-sys-space-12)" /></div>
            <div class="lc-message-thread__skeleton-row"><lc-skeleton shape="rect" width="calc(var(--lc-sys-space-16) * 4)" height="var(--lc-sys-space-12)" /></div>
          </div>
        } @else if (state() === 'empty') {
          <p class="lc-message-thread__empty">{{ emptyMessage() || labels.noData }}</p>
        }
        @for (item of view(); track item.key) {
          @switch (item.type) {
            @case ('day') {
              <time class="lc-message-thread__day" [attr.data-key]="item.key" [attr.datetime]="item.date"><span>{{ item.label }}</span></time>
            }
            @case ('system') {
              <div class="lc-message-thread__system" [class]="item.message.cssClass ?? ''" [attr.data-key]="item.key">
                <span class="lc-message-thread__sr">{{ item.sentence }}</span>
                <div class="lc-message-thread__rule" aria-hidden="true">
                  <lc-status-badge [kind]="item.tone" [icon]="item.icon" size="small">{{ item.text }}@if (item.time; as t) { <time [attr.datetime]="t.iso">{{ t.text }}</time>}</lc-status-badge>
                </div>
                @if (item.detail) { <p class="lc-message-thread__detail" aria-hidden="true">{{ item.detail }}</p> }
                @if (item.action) { <button type="button" class="lc-message-thread__action" (click)="systemAction.emit(item.message)">{{ item.action }}</button> }
              </div>
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
                          <span class="lc-message-thread__text">@for (part of parts; track $index) {@if (part.type === 'link') {<a [href]="part.href" target="_blank" rel="noopener noreferrer">{{ part.text }}</a>} @else {{{ part.text }}}}</span>
                        }
                        @if (bubble.thumbs.length) {
                          <div class="lc-message-thread__thumbs">
                            @for (thumb of bubble.thumbs; track thumb.attachment.id) {
                              <button type="button" class="lc-message-thread__thumb" [attr.aria-label]="labels.threadAttachmentOpen(thumb.name)" [attr.title]="thumb.name"
                                (click)="attachmentOpen.emit({ message: bubble.message, attachment: thumb.attachment })">
                                @if (thumb.previewUrl; as src) {
                                  <!-- width/height ne fixent que le ratio (pas de saut de mise en page) ; la taille vient des jetons thumb-width/height. -->
                                  <img [src]="src" width="96" height="72" alt="" />
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
  host: { class: 'lc-message-thread', '[class.lc-message-thread--stale]': 'staleShown()', '[attr.aria-busy]': 'busy() || null' },
})
export class LcMessageThreadComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly locale = inject(LC_LOCALE).locale;
  private readonly destroyRef = inject(DestroyRef);

  /** Messages du plus ancien au plus récent ; seule entrée obligatoire. `undefined` : squelette ; `null` ou `[]` : état vide. */
  readonly messages = input.required<readonly LcThreadMessage[] | null | undefined>();
  /** Chargement forcé : squelette même si des messages sont présents. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Rechargement en cours : les messages restent, atténués (`aria-busy`). Ignoré pendant le squelette. */
  readonly stale = input(false, { transform: booleanAttribute });
  /** Texte de l'état vide ; `noData` par défaut. */
  readonly emptyMessage = input<string>();
  /** Avatar des autres auteurs, une fois par groupe. */
  readonly showAvatars = input(true);
  /** Taille d'une page de l'affichage progressif : seuls les derniers messages sont rendus, les plus anciens se révèlent en remontant. Entier > 0, sinon 30. */
  readonly pageSize = input(30);
  /** Nom accessible du fil ; `threadLabel` par défaut. */
  readonly ariaLabel = input<string>();

  readonly attachmentOpen = output<LcThreadAttachmentOpenEvent>();
  /** Clic sur le bouton d'un repère (`actionLabel`). */
  readonly systemAction = output<LcThreadMessage>();

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly log = viewChild.required<ElementRef<HTMLElement>>('log');
  private readonly inner = viewChild.required<ElementRef<HTMLElement>>('inner');
  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');
  /** Le fil défile lui-même : il devient atteignable au clavier. */
  protected readonly scrolls = signal(false);
  /** Les anciens messages s'insèrent (`aria-busy`). */
  private readonly loadingOlder = signal(false);

  private readonly list = computed(() => this.messages() ?? []);
  protected readonly state = computed(() => lcDataState(this.messages(), this.loading()));
  protected readonly staleShown = computed(() => this.stale() && this.state() === 'ready');
  protected readonly busy = computed(() => this.loadingOlder() || this.state() === 'loading' || this.staleShown());

  private readonly pages = signal(1);
  private readonly shown = computed(() => (this.state() === 'ready' ? this.list().slice(-this.pages() * normalizePageSize(this.pageSize())) : []));
  protected readonly view = computed(() => groupThreadMessages(this.shown(), { locale: this.locale, labels: this.labels }).map(toView));

  private readonly arrivals = new ArrivalTracker();
  /** Positions d'avant le rendu : bas des éléments (invariant au `scale` de l'entrée), fil collé en bas. */
  private before: { bottoms: Map<Element, number>; glued: boolean } | undefined;
  private readonly glides = new WeakMap<Element, Animation>();
  /** La sentinelle est sortie de l'écran au moins une fois depuis le dernier palier. */
  private armed = false;

  constructor() {
    // Mesure avant que le gabarit ne change (un effet de composant précède la mise à jour de sa vue).
    effect(() => {
      this.view();
      untracked(() => this.measureBefore());
    });
    afterRenderEffect(() => {
      const ids = this.list().map((message) => message.id);
      this.view();
      if (this.state() === 'loading') return; // l'ouverture du fil (défilement en bas) attend les vrais messages
      untracked(() => {
        this.settle(ids);
        this.fillUp();
      });
    });
    afterNextRender(() => {
      const log = this.log().nativeElement;
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.scrolls.set(log.scrollHeight > log.clientHeight));
        observer.observe(log);
        observer.observe(this.inner().nativeElement);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
      if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
          if (!entries.at(-1)?.isIntersecting) this.armed = true;
          else if (this.armed) this.showMore();
        });
        observer.observe(this.sentinel().nativeElement);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
    });
  }

  /** Conteneur qui défile et que les messages rendus ne remplissent pas : la sentinelle reste visible, on enchaîne un palier (fini quand tout est rendu). */
  private fillUp(): void {
    if (this.shown().length >= this.list().length) return;
    const inner = this.inner().nativeElement;
    const free = this.sentinel().nativeElement.getBoundingClientRect().top - inner.getBoundingClientRect().top - (parseFloat(getComputedStyle(inner).paddingTop) || 0);
    // shortcut: un contenu qui remplit pile le conteneur (place libre nulle) n'enchaîne pas, le défilement de page non plus ; l'observateur prend le relais.
    if (free > 1) this.showMore();
  }

  private showMore(): void {
    if (this.shown().length >= this.list().length) return;
    this.armed = false;
    this.loadingOlder.set(true);
    this.pages.update((n) => n + 1);
  }

  private measureBefore(): void {
    const log = this.log().nativeElement;
    const bottoms = new Map<Element, number>();
    for (const el of log.querySelectorAll(MOVING)) bottoms.set(el, el.getBoundingClientRect().bottom);
    this.before = { bottoms, glued: log.scrollHeight - log.scrollTop - log.clientHeight <= 2 };
  }

  /** Après le rendu, dans la même image : position de lecture, glissement des messages déjà affichés, entrée des arrivées. */
  private settle(ids: string[]): void {
    const log = this.log().nativeElement;
    const { before } = this;
    this.before = undefined;
    const opening = !this.arrivals.hasStarted;
    const arrived = this.arrivals.next(ids);
    const scrolls = log.scrollHeight > log.clientHeight + 1;
    this.loadingOlder.set(false);
    if (!ids.length) this.pages.set(1); // fil vidé : l'affichage progressif repart de zéro
    if (opening) {
      if (scrolls) log.scrollTop = log.scrollHeight;
      return;
    }
    if (!before) return;
    for (const el of before.bottoms.keys()) this.glides.get(el)?.cancel(); // mise en page nue, sans glissement en cours
    if (before.glued && scrolls) {
      log.scrollTop = log.scrollHeight;
    } else {
      // Position de lecture : le premier message encore affiché garde sa place (affichage progressif, message retiré en tête).
      const top = log.getBoundingClientRect().top;
      for (const [el, bottom] of before.bottoms) {
        if (!el.isConnected || bottom < top || !el.matches('.lc-message-thread__message')) continue;
        const shift = el.getBoundingClientRect().bottom - bottom;
        if (Math.abs(shift) < FLIP_THRESHOLD_PX) break;
        if (scrolls) log.scrollTop += shift;
        else window.scrollBy(0, shift);
        break;
      }
    }
    if (arrived.length) this.playArrivals(log, before.bottoms, new Set(arrived));
  }

  /** Glissement des messages déjà affichés et entrée des arrivées ; sous « mouvement réduit », rien ne joue (fondu compris) : le fil est déjà à sa place. */
  private playArrivals(log: HTMLElement, before: ReadonlyMap<Element, number>, arrived: ReadonlySet<string>): void {
    if (lcPrefersReducedMotion()) return;
    for (const [el, bottom] of before) {
      const delta = bottom - (el.isConnected ? el.getBoundingClientRect().bottom : bottom);
      if (Math.abs(delta) >= FLIP_THRESHOLD_PX) {
        this.glides.set(el, lcAnimate(el, [{ transform: `translateY(${delta}px)` }, { transform: 'none' }], { duration: '--lc-list-move-duration', easing: '--lc-list-move-easing' }));
      }
    }
    const stagger = lcCssMs(getComputedStyle(this.host), '--lc-message-thread-enter-stagger') || 0;
    const entering = Array.from(log.querySelectorAll<HTMLElement>(ENTERING)).filter((el) => arrived.has(el.dataset['messageId'] ?? el.dataset['key'] ?? ''));
    entering.forEach((el, i) => {
      const delay = staggerDelay(i, entering.length, stagger);
      lcAnimate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: '--lc-message-thread-enter-fade-duration', easing: 'standard', delay });
      const scale = parseFloat(getComputedStyle(el).getPropertyValue('--_enter-scale'));
      if (scale >= 0) lcAnimate(el, [{ scale }, { scale: 1 }], { duration: '--lc-message-thread-enter-duration', easing: '--lc-message-thread-enter-easing', delay });
    });
  }
}
