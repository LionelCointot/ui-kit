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
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { LC_LABELS, LcButtonComponent, LcIconComponent, joinIds, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';
import type { LcFileUploadItem } from '../file-upload/file-upload.component';
import { filterFiles, type LcFileRefusal } from '../shared/file-filter';

/** Pourquoi un envoi n'a pas été émis : rien à envoyer, envoi en cours (ou déjà parti), pièce jointe en cours d'envoi. */
export type LcMessageSendBlockedReason = 'empty' | 'sending' | 'uploading';

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
    <div #box class="lc-message-composer__box" [class.lc-message-composer__box--invalid]="showInvalid()">
      <!-- M3 : vignettes (role="list"), calque de dépôt et message de refus -->
      <textarea #textarea class="lc-message-composer__text" [id]="inputId()" [rows]="minRows()"
        [value]="value()" [disabled]="disabled()" [readOnly]="readonly() || sending()"
        [attr.maxlength]="maxLength() ?? null" [attr.placeholder]="placeholder() || null"
        [attr.aria-label]="ariaLabel() || null" [attr.aria-invalid]="showInvalid() ? 'true' : null"
        [attr.aria-required]="isRequired() ? 'true' : null" [attr.aria-describedby]="describedBy()"
        (input)="onInput($event)" (keydown)="onKeydown($event)" (blur)="onBlur()"></textarea>
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
    </div>
    <span class="lc-visually-hidden" role="status">{{ statusText() }}</span>
  `,
  styleUrl: './message-composer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcMessageComposerComponent) }],
  host: {
    class: 'lc-message-composer',
    '[class.lc-message-composer--disabled]': 'disabled()',
  },
})
export class LcMessageComposerComponent implements FormValueControl<string>, LcFormFieldControl {
  private readonly field = inject(LC_FORM_FIELD, { optional: true });
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);
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
  private readonly blurred = signal(false);
  private readonly width = signal(0);
  /** Verrou anti-double envoi : levé quand `sending` retombe ou que le texte change. */
  private lockedValue: string | null = null;
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
        : this.counterState() === 'near' ? this.labels.composerLimitNear : '');
  protected readonly counterText = computed(() => this.labels.composerCount(this.value().length, this.maxLength() ?? 0));

  constructor() {
    effect(() => {
      const value = this.value();
      const sending = this.sending();
      untracked(() => {
        if (value !== this.lockedValue || (this.wasSending && !sending)) this.lockedValue = null;
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
      const bar = this.bar().nativeElement;
      bar.addEventListener('click', onBarClick, true);
      this.destroyRef.onDestroy(() => bar.removeEventListener('click', onBarClick, true));
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver((entries) => this.width.set(Math.round(entries[0]?.contentRect.width ?? 0)));
      observer.observe(this.box().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // Hauteur du champ : remise à auto, mesure, puis bornée entre minRows et maxRows lignes (`field-sizing` est hors Baseline 2024).
    afterRenderEffect(() => {
      this.value();
      this.width();
      const rows = { min: this.minRows(), max: this.maxRows() };
      const element = this.textarea().nativeElement;
      this.renderer.setStyle(element, 'height', 'auto');
      const style = getComputedStyle(element);
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 0;
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
    this.value.set((event.target as HTMLTextAreaElement).value);
  }

  protected onBlur(): void {
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

  /** Point d'accroche M3 : le dépôt et le collage appelleront aussi cette méthode. */
  protected addFiles(files: File[]): void {
    const max = this.maxFiles();
    const { accepted, refused } = filterFiles(files, {
      accept: this.accept(), room: max === null ? Infinity : max - this.items().length, multiple: true, skipEmpty: true,
    });
    if (accepted.length) this.filesAdded.emit(accepted);
    if (refused.length) this.rejected.emit(refused);
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
    this.send.emit({ text });
    return true;
  }
}
