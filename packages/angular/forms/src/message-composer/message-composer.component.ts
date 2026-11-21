import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Renderer2,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  isDevMode,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { LC_LABELS, LcButtonComponent, LcFormatService, LcIconComponent, isSafePreviewUrl, joinIds, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';
import type { LcFileUploadItem } from '../file-upload/file-upload.component';
import { acceptedFilesText, announcedName, cleanFileName, fileSizeText } from '../shared/file-display';
import { dragHasFiles, dragLeftZone, droppedFiles, filterFiles, type LcFileRefusal, type LcFileRejectionReason } from '../shared/file-filter';

/** Pourquoi un envoi n'a pas été émis : rien à envoyer, envoi en cours (ou déjà parti), pièce jointe en cours d'envoi. */
export type LcMessageSendBlockedReason = 'empty' | 'sending' | 'uploading';

/** Classe posée un instant sur le rectangle pour la secousse d'un refus. */
const SHAKE_CLASS = 'lc-message-composer__box--shake';

/** Une vignette, prête à afficher : nom nettoyé, adresse d'aperçu admise, textes issus des libellés partagés avec `lc-file-upload`. */
interface ThumbView {
  readonly item: LcFileUploadItem;
  readonly name: string;
  readonly preview: string | null;
  readonly icon: string;
  readonly meta: string;
  readonly progress: number | null;
  readonly progressLabel: string;
  readonly removeLabel: string;
  readonly retryLabel: string;
  readonly retryable: boolean;
  readonly errorHint: string | null;
}

/** Part du `maxLength` à partir de laquelle le compteur apparaît. */
const COUNTER_THRESHOLD = 0.9;

/**
 * Zone de saisie de message : un seul rectangle (texte pleine largeur, barre basse avec trombone, actions libres et envoi).
 * Générique : le composant ne valide rien, n'envoie rien et ne modifie jamais `value` ; l'application vide le champ après `send`.
 * Libellé, aide et erreurs viennent de `lc-form-field` ; hors champ, `ariaLabel` est requis.
 * Apparence : l'application redéfinit les tokens `--lc-message-composer-*` par une classe posée sur l'hôte.
 *
 * @example
 * <lc-form-field label="Votre message">
 *   <lc-message-composer [(value)]="text" (send)="post($event.text)">
 *     <div lcComposerHeader>…</div>
 *   </lc-message-composer>
 * </lc-form-field>
 */
@Component({
  selector: 'lc-message-composer',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <div class="lc-message-composer__header"><ng-content select="[lcComposerHeader]" /></div>
    <div #box class="lc-message-composer__box" [class.lc-message-composer__box--invalid]="showInvalid()"
      [class.lc-message-composer__box--dragging]="dragging()"
      (dragenter)="onDrag($event)" (dragover)="onDrag($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)"
      (animationend)="onBoxAnimationEnd($event)">
      @if (thumbs().length > 0) {
        <ul class="lc-message-composer__thumbs" role="list" [attr.aria-label]="labels.composerAttachments">
          @for (thumb of thumbs(); track thumb.item.id; let index = $index) {
            <li class="lc-message-composer__thumb" [class.lc-message-composer__thumb--error]="thumb.item.status === 'error'">
              <div class="lc-message-composer__preview">
                @if (thumb.preview) {
                  <img [src]="thumb.preview" alt="" (error)="onPreviewError(thumb.preview)" />
                } @else {
                  <lc-icon [name]="thumb.icon" />
                }
              </div>
              <span class="lc-message-composer__name" [attr.title]="thumb.name"><bdi>{{ thumb.name }}</bdi></span>
              @if (thumb.meta) { <span class="lc-message-composer__meta">{{ thumb.meta }}</span> }
              @if (thumb.item.status === 'uploading') {
                <div class="lc-message-composer__progress" [class.lc-message-composer__progress--indeterminate]="thumb.progress === null"
                  role="progressbar" aria-valuemin="0" aria-valuemax="100"
                  [attr.aria-valuenow]="thumb.progress" [attr.aria-label]="thumb.progressLabel">
                  <span class="lc-message-composer__progress-fill" [style.width.%]="thumb.progress"></span>
                </div>
              }
              <button #removeButton lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" class="lc-message-composer__remove"
                [disabled]="disabled()" [attr.aria-label]="thumb.removeLabel" (click)="onRemove(thumb.item.id, index)">
                <lc-icon name="x" />
              </button>
              @if (thumb.item.status === 'error') {
                <span class="lc-message-composer__failed" [attr.title]="thumb.errorHint"><lc-icon name="circle-alert" />{{ labels.fileUploadFailed }}</span>
                @if (thumb.retryable) {
                  <button lcButton type="button" fillMode="outline" themeColor="neutral" size="small" class="lc-message-composer__retry"
                    [disabled]="disabled()" [attr.aria-label]="thumb.retryLabel" (click)="retry.emit(thumb.item.id)">
                    <lc-icon name="rotate-ccw" />{{ labels.retry }}
                  </button>
                }
              }
            </li>
          }
        </ul>
      }
      <textarea #textarea class="lc-message-composer__text" [id]="inputId()" [rows]="minRows()"
        [value]="value()" [disabled]="disabled()" [readOnly]="readonly() || sending()"
        [attr.maxlength]="maxLength() ?? null" [attr.placeholder]="placeholder() || null"
        [attr.aria-label]="ariaLabel() || null" [attr.aria-invalid]="showInvalid() ? 'true' : null"
        [attr.aria-required]="isRequired() ? 'true' : null" [attr.aria-describedby]="describedBy()"
        (input)="onInput($event)" (keydown)="onKeydown($event)" (paste)="onPaste($event)" (blur)="onBlur($event)"></textarea>
      <div #bar class="lc-message-composer__bar">
        @if (attachments()) {
          <button lcButton type="button" iconOnly fillMode="flat" themeColor="primary" class="lc-message-composer__attach"
            [disabled]="disabled()" [attr.aria-label]="labels.composerAttach" (click)="fileInput.click()">
            <lc-icon [name]="attachIcon()" />
          </button>
          <input #fileInput type="file" multiple hidden tabindex="-1" [attr.accept]="accept() || null" (change)="onFilesChosen($event)" />
        }
        <div class="lc-message-composer__actions"><ng-content select="[lcComposerAction]" /></div>
        @if (counterState() !== 'none') {
          <span class="lc-message-composer__counter" aria-hidden="true"
            [class.lc-message-composer__counter--full]="counterState() === 'full'">{{ counterText() }}</span>
        }
        <button lcButton type="button" iconOnly fillMode="flat" themeColor="primary" class="lc-message-composer__send"
          [disabled]="disabled()" [attr.aria-label]="sendName()" [attr.aria-disabled]="sending() ? 'true' : null"
          [attr.aria-busy]="sending() ? 'true' : null" (click)="onSendClick()">
          @if (sending()) { <span class="lc-message-composer__ring" aria-hidden="true"></span> }
          @else { <lc-icon [name]="sendIcon()" /> }
        </button>
      </div>
      <div class="lc-message-composer__drop" aria-hidden="true">{{ labels.composerDrop }}</div>
    </div>
    @if (refusalMessages().length > 0) {
      <div class="lc-message-composer__refusal" role="alert">
        <lc-icon name="circle-alert" />
        <div>@for (message of refusalMessages(); track message) { <p>{{ message }}</p> }</div>
      </div>
    }
    <span class="lc-visually-hidden" role="status">{{ statusText() }}</span>
    <span class="lc-visually-hidden" aria-live="polite">{{ announcement() }}</span>
  `,
  styleUrl: './message-composer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcMessageComposerComponent) }],
  host: {
    class: 'lc-message-composer',
    '[class.lc-message-composer--disabled]': 'disabled()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class LcMessageComposerComponent implements FormValueControl<string>, LcFormFieldControl {
  private readonly field = inject(LC_FORM_FIELD, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly format = inject(LcFormatService);
  protected readonly labels = inject(LC_LABELS);

  readonly value = model('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly maxLength = input<number>();
  readonly placeholder = input('');
  /** Identifiant du champ interne (généré), relié au libellé de `lc-form-field`. */
  readonly inputId = input<string>(lcUniqueId('message'));
  /** Nom accessible quand le contrôle est utilisé hors de `lc-form-field`. */
  readonly ariaLabel = input<string>();
  /** Attente de la réponse à l'envoi : texte en lecture seule, envoi inactif, anneau d'attente. */
  readonly sending = input(false, { transform: booleanAttribute });
  readonly minRows = input(1);
  readonly maxRows = input(7);
  /** `'auto'` : Entrée envoie sur pointeur fin, va à la ligne sur pointeur grossier (lu à chaque touche). */
  readonly enterSends = input<'auto' | boolean>('auto');
  readonly sendIcon = input('send');
  /** Nom accessible de l'envoi (défaut `LC_LABELS.composerSend`). */
  readonly sendLabel = input<string>();
  readonly attachIcon = input('paperclip');
  readonly attachments = input(true, { transform: booleanAttribute });
  readonly items = input<readonly LcFileUploadItem[]>([]);
  readonly accept = input('');
  /** Remplace la liste des types déduite de `accept` dans le message de refus par type. */
  readonly acceptLabel = input<string>();
  /** Nombre maximal de pièces jointes ; `null` : sans limite. */
  readonly maxFiles = input<number | null>(10);
  readonly showSize = input(true, { transform: booleanAttribute });

  readonly send = output<{ text: string }>();
  readonly sendBlocked = output<LcMessageSendBlockedReason>();
  readonly filesAdded = output<File[]>();
  readonly rejected = output<LcFileRefusal[]>();
  readonly remove = output<string>();
  readonly retry = output<string>();
  /** Émis quand le focus quitte le champ (champ « touché » pour Signal Forms). */
  readonly touch = output<void>();

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;

  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly removeButtons = viewChildren('removeButton', { read: ElementRef<HTMLButtonElement> });
  protected readonly dragging = signal(false);
  private readonly refusals = signal<readonly LcFileRefusal[]>([]);
  /** Adresses d'aperçu qui n'ont pas pu se charger : la vignette passe à l'icône. */
  private readonly brokenPreviews = signal<ReadonlySet<string>>(new Set());
  private removal: { id: string; index: number } | null = null;
  private readonly blurred = signal(false);
  private readonly width = signal(0);
  /** Verrou anti-double envoi : levé quand `sending` retombe, que le texte change ou que l'ensemble des pièces jointes change. */
  private lockedValue: string | null = null;
  private lockedItems = '';
  private readonly itemIds = computed(() => this.items().map((item) => item.id).join('\n'));
  private wasSending = false;

  protected readonly sendName = computed(() => this.sendLabel() ?? this.labels.composerSend);
  protected readonly showInvalid = computed(() =>
    this.field ? this.field.showInvalid() : this.invalid() && (this.touched() || this.blurred()));
  protected readonly isRequired = computed(() => this.required() || (this.field?.isRequired() ?? false));
  protected readonly describedBy = computed(() => joinIds(this.field?.describedBy()));
  protected readonly counterState = computed<'none' | 'near' | 'full'>(() => {
    const max = this.maxLength();
    const length = this.value().length;
    if (!max) return 'none';
    return length >= max ? 'full' : length >= max * COUNTER_THRESHOLD ? 'near' : 'none';
  });
  /** Annonces sans répétition à chaque touche : le texte ne change qu'au franchissement d'un seuil. */
  protected readonly statusText = computed(() =>
    this.sending() ? this.labels.composerSending
      : this.counterState() === 'full' ? this.labels.composerLimitReached
        : this.counterState() === 'near' ? this.labels.composerLimitNear
          : this.filesFull() ? this.labels.fileUploadLimitReached(this.maxFiles() ?? 0) : '');
  /** Annonce polie du début, de la fin et de l'échec d'envoi d'une pièce jointe (jamais à chaque pourcentage) ; sans changement, le texte reste. */
  protected readonly announcement = linkedSignal<readonly LcFileUploadItem[], string>({
    source: this.items,
    computation: (items, previous) => {
      if (!previous) return '';
      const before = new Map(previous.source.map((item) => [item.id, item.status]));
      const messages: string[] = [];
      for (const item of items) {
        const status = before.get(item.id);
        const name = announcedName(item.name);
        if (item.status === 'uploading' && status !== 'uploading') messages.push(this.labels.fileUploadProgress(name));
        else if (item.status === 'done' && status !== 'done') messages.push(this.labels.fileUploadAnnounceDone(name));
        else if (item.status === 'error' && status !== 'error') messages.push(`${name} : ${cleanFileName(item.errorMessage ?? '') || this.labels.fileUploadFailed}`);
      }
      return messages.length > 0 ? messages.join('. ') : previous.value;
    },
  });
  private readonly canAttach = computed(() => this.attachments() && !this.disabled());
  private readonly filesFull = computed(() => {
    const max = this.maxFiles();
    return this.attachments() && max !== null && this.items().length >= max;
  });
  protected readonly thumbs = computed<readonly ThumbView[]>(() => {
    const broken = this.brokenPreviews();
    const units = this.labels.fileSizeUnits;
    return this.items().map((item) => {
      const name = cleanFileName(item.name);
      const shown = announcedName(item.name);
      const progress = Number.isFinite(item.progress) ? Math.round(Math.min(100, Math.max(0, item.progress as number))) : null;
      const size = this.showSize() ? fileSizeText(item.size, units, (value) => this.format.number(value)) : '';
      const state = item.status === 'uploading' ? this.labels.fileUploadUploading(progress) : (item.statusLabel ?? '');
      const preview = item.previewUrl && !broken.has(item.previewUrl) && isSafePreviewUrl(item.previewUrl, this.document.baseURI)
        ? item.previewUrl : null;
      return {
        item,
        name,
        preview,
        icon: item.previewUrl && broken.has(item.previewUrl) ? 'image-off' : 'file-text',
        meta: item.status === 'error' ? size : [size, state].filter(Boolean).join(' · '),
        progress,
        progressLabel: this.labels.fileUploadProgress(shown),
        removeLabel: this.labels.fileUploadRemove(shown),
        retryLabel: this.labels.fileUploadRetry(shown),
        retryable: item.retryable !== false,
        errorHint: item.errorMessage ? cleanFileName(item.errorMessage) : null,
      };
    });
  });
  private readonly acceptedText = computed(() => this.acceptLabel()?.trim() || acceptedFilesText(this.accept()));
  /** Un message par raison de refus, avec les noms des fichiers concernés. */
  protected readonly refusalMessages = computed(() => {
    const refused = this.refusals();
    return (['type', 'count'] as const satisfies readonly LcFileRejectionReason[]).flatMap((reason) => {
      const names = refused.filter((r) => r.reason === reason).map((r) => announcedName(r.file.name)).join(', ');
      if (!names) return [];
      const accepted = reason === 'type' ? this.acceptedText() : '';
      return [accepted ? this.labels.composerRejectedType(names, accepted) : this.labels.composerRejected(names, reason)];
    });
  });
  protected readonly counterText = computed(() => this.labels.composerCount(this.value().length, this.maxLength() ?? 0));

  constructor() {
    effect(() => {
      const value = this.value();
      const sending = this.sending();
      const itemIds = this.itemIds();
      untracked(() => {
        if (value !== this.lockedValue || itemIds !== this.lockedItems || (this.wasSending && !sending)) this.lockedValue = null;
        this.wasSending = sending;
      });
    });

    afterNextRender(() => {
      if (isDevMode() && !this.field && !this.ariaLabel()) {
        console.warn('[lc-message-composer] Hors lc-form-field, `ariaLabel` est requis (nom accessible du champ).', this.textarea().nativeElement);
      }
      // lcButton avale les clics d'un bouton aria-disabled (capture) : on les observe plus haut pour émettre `sendBlocked`.
      const onBarClick = (event: Event) => {
        if (this.sending() && (event.target as Element).closest('.lc-message-composer__send')) this.sendBlocked.emit('sending');
      };
      // Un fichier lâché hors du rectangle ne doit pas être ouvert par le navigateur ; un texte ou un lien glissé reste libre.
      // Sauf sur un autre champ de fichier de la page, qui traite le dépôt lui-même.
      const keepPage = (event: DragEvent) => {
        if (dragHasFiles(event) && !(event.target as Element | null)?.closest?.('input[type="file"]')) event.preventDefault();
      };
      this.document.addEventListener('dragover', keepPage);
      this.document.addEventListener('drop', keepPage);
      this.destroyRef.onDestroy(() => {
        this.document.removeEventListener('dragover', keepPage);
        this.document.removeEventListener('drop', keepPage);
      });
      const bar = this.bar().nativeElement;
      bar.addEventListener('click', onBarClick, true);
      this.destroyRef.onDestroy(() => bar.removeEventListener('click', onBarClick, true));
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver((entries) => this.width.set(Math.round(entries[0]?.contentRect.width ?? 0)));
      observer.observe(this.box().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // Après un retrait par la croix, le focus va à la vignette suivante, sinon au champ (Safari ne focalise pas un bouton cliqué, les autres le perdent à sa disparition).
    afterRenderEffect(() => {
      const items = this.items();
      const removal = this.removal;
      if (!removal || items.some((item) => item.id === removal.id)) return;
      this.removal = null;
      (this.removeButtons()[removal.index]?.nativeElement ?? this.textarea().nativeElement).focus();
    });

    // Hauteur du champ : remise à auto, mesure, puis bornée entre minRows et maxRows lignes (`field-sizing` est hors Baseline 2024).
    afterRenderEffect(() => {
      this.value();
      this.width();
      const rows = { min: this.minRows(), max: this.maxRows() };
      const element = this.textarea().nativeElement;
      this.renderer.setStyle(element, 'height', 'auto');
      const style = getComputedStyle(element);
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) || 0;
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) || 0;
      const min = lineHeight * rows.min + padding;
      const max = lineHeight * rows.max + padding;
      const height = Math.max(min, Math.min(element.scrollHeight, max));
      if (height > 0) this.renderer.setStyle(element, 'height', `${height}px`);
    });
  }

  focus(options?: FocusOptions): void {
    this.textarea().nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    this.lockedValue = null; // une saisie lève le verrou sans attendre le prochain rendu
    this.clearRefusals();
    this.value.set((event.target as HTMLTextAreaElement).value);
  }

  /** Le champ perd le focus : « touché » seulement si le focus sort du composant (pas vers le trombone ou l'envoi). */
  protected onBlur(event: FocusEvent): void {
    this.leave(event.relatedTarget);
  }

  /** Le focus quitte un autre élément du composant (trombone, envoi, vignette) ; la sortie du champ est vue par `onBlur`. */
  protected onFocusOut(event: FocusEvent): void {
    if (event.target !== this.textarea().nativeElement) this.leave(event.relatedTarget);
  }

  private leave(next: EventTarget | null): void {
    if (next instanceof Node && this.host.nativeElement.contains(next)) return;
    this.blurred.set(true);
    this.touch.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || !this.entersSends()) return;
    event.preventDefault();
    this.trySend();
  }

  protected onSendClick(): void {
    // Le focus reste (ou revient) dans le champ quand l'envoi est refusé.
    if (!this.trySend()) this.focus();
  }

  protected onFilesChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onPaste(event: ClipboardEvent): void {
    const files = Array.from(event.clipboardData?.files ?? []);
    // Texte seul, ou texte et image (cellules Excel ou Word, qui portent aussi une image) : le collage natif insère le texte brut, rien n'est joint.
    if (files.length === 0 || event.clipboardData?.types?.includes('text/plain')) return;
    event.preventDefault();
    if (this.canAttach()) this.addFiles(files);
  }

  protected onDrag(event: DragEvent): void {
    if (!dragHasFiles(event)) return;
    event.preventDefault(); // sans cela, le navigateur ouvrirait le fichier déposé
    event.dataTransfer.dropEffect = this.canAttach() ? 'copy' : 'none';
    this.dragging.set(this.canAttach());
  }

  protected onDragLeave(event: DragEvent): void {
    if (dragLeftZone(event)) this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (!dragHasFiles(event)) return;
    event.preventDefault();
    this.dragging.set(false);
    if (this.canAttach()) this.addFiles(droppedFiles(event.dataTransfer));
  }

  protected onBoxAnimationEnd(event: AnimationEvent): void {
    const box = this.box().nativeElement;
    if (event.target === box) this.renderer.removeClass(box, SHAKE_CLASS);
  }

  protected onRemove(id: string, index: number): void {
    this.removal = { id, index };
    this.clearRefusals();
    this.remove.emit(id);
  }

  protected onPreviewError(url: string): void {
    this.brokenPreviews.update((broken) => new Set(broken).add(url));
  }

  /** Trie les fichiers (choix, dépôt, collage) : type d'abord, puis place restante. Un refus s'affiche et secoue le rectangle. */
  private addFiles(files: File[]): void {
    if (files.length === 0) return;
    const max = this.maxFiles();
    const { accepted, refused } = filterFiles(files, {
      accept: this.accept(), room: max === null ? Infinity : max - this.items().length, multiple: true, skipEmpty: true,
    });
    this.refusals.set(refused);
    if (accepted.length) this.filesAdded.emit(accepted);
    if (refused.length) {
      this.rejected.emit(refused);
      this.shake();
    }
  }

  private clearRefusals(): void {
    if (this.refusals().length > 0) this.refusals.set([]);
  }

  /** Relance la secousse même si la précédente n'est pas finie (la classe est retirée, le style recalculé, puis reposée). */
  private shake(): void {
    const box = this.box().nativeElement;
    this.renderer.removeClass(box, SHAKE_CLASS);
    void box.offsetWidth;
    this.renderer.addClass(box, SHAKE_CLASS);
  }

  /** « Entrée envoie » : lu à chaque appui, jamais figé (le pointeur peut changer avec un clavier branché). */
  private entersSends(): boolean {
    const mode = this.enterSends();
    return mode === 'auto' ? !(window.matchMedia?.('(pointer: coarse)').matches ?? false) : mode;
  }

  private trySend(): boolean {
    const text = this.value().trim();
    const items = this.items();
    const blocked: LcMessageSendBlockedReason | null =
      this.sending() || this.lockedValue !== null ? 'sending'
        : items.some((item) => item.status === 'uploading') ? 'uploading'
          : !text && items.length === 0 ? 'empty'
            : null;
    if (blocked) {
      this.sendBlocked.emit(blocked);
      return false;
    }
    this.lockedValue = this.value();
    this.lockedItems = this.itemIds();
    this.send.emit({ text });
    return true;
  }
}
