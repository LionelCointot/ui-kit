import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  isDevMode,
  linkedSignal,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { LC_LABELS, LcButtonComponent, LcFillDirective, LcFormatService, LcIconComponent, joinIds, lcUniqueId } from '@lionelcointot/ui-angular';
import { fileSizeText } from '../shared/file-display';
import { dragHasFiles, dragLeftZone, filterFiles, type LcFileRefusal, type LcFileRejectionReason } from '../shared/file-filter';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';

/** État d'un fichier, fourni par l'application : en attente, en cours d'envoi, terminé, en erreur. */
export type LcFileUploadStatus = 'pending' | 'uploading' | 'done' | 'error';

/** Une ligne de la liste. L'application la fournit et la met à jour : le composant n'envoie rien lui-même. */
export interface LcFileUploadItem {
  /** Identifiant stable, rendu par les sorties `remove` et `retry`. */
  readonly id: string;
  readonly name: string;
  /** Taille en octets. */
  readonly size: number;
  readonly status: LcFileUploadStatus;
  /** Avancement de 0 à 100 (état `uploading`) ; absent ou `null` : barre indéterminée. */
  readonly progress?: number | null;
  /** Message affiché et annoncé en état `error` (sinon un texte par défaut). */
  readonly errorMessage?: string;
  /** Adresse d'un aperçu d'image, fournie par l'application (le composant ne crée ni ne révoque d'adresse d'objet). */
  readonly previewUrl?: string;
  /** Remplace le texte d'état par défaut (hors erreur). */
  readonly statusLabel?: string;
  /** Faux : une ligne en erreur n'affiche pas « Réessayer ». Défaut : réessayable. */
  readonly retryable?: boolean;
}

export type { LcFileRejectionReason };

export type LcFileUploadRejection = LcFileRefusal;

interface RowView {
  readonly item: LcFileUploadItem;
  readonly preview: string | null;
  readonly previewIcon: string;
  readonly meta: string;
  readonly metaIcon: string | null;
  readonly progress: number | null;
  readonly errorText: string;
  readonly progressLabel: string;
  readonly removeLabel: string;
  readonly retryLabel: string;
  readonly retryable: boolean;
}

/**
 * Choix de fichiers : un bouton qui ouvre le sélecteur natif et une zone de dépôt (complément à la souris),
 * puis la liste des fichiers avec leur état. Le composant **n'envoie rien** : il émet les fichiers choisis
 * (`filesAdded`), l'application les traite et met `items` à jour (progression, erreur, aperçu).
 * Hors de `lc-form-field`, `ariaLabel` donne son nom accessible au groupe.
 *
 * @example
 * <lc-form-field label="Pièces jointes" hint="3 fichiers au plus">
 *   <lc-file-upload accept="image/*" multiple [maxFiles]="3" [items]="items()"
 *     (filesAdded)="add($event)" (remove)="remove($event)" (retry)="retry($event)" />
 * </lc-form-field>
 */
@Component({
  selector: 'lc-file-upload',
  imports: [LcButtonComponent, LcFillDirective, LcIconComponent],
  template: `
    <div class="lc-file-upload__zone" [class.lc-file-upload__zone--active]="dragging()"
      (dragenter)="onDrag($event)" (dragover)="onDrag($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
      <span class="lc-file-upload__hint">{{ labels.fileUploadDropHint }}</span>
      <input #native type="file" hidden tabindex="-1" aria-hidden="true"
        [attr.accept]="accept() || null" [multiple]="multiple()" (change)="onNativeChange($event)" />
      <button #choose lcButton type="button" fillMode="outline" themeColor="primary" class="lc-file-upload__choose"
        [disabled]="disabled()" [attr.aria-disabled]="full() ? 'true' : null" [attr.aria-describedby]="full() ? limitId : null"
        (click)="open()">
        <lc-icon [name]="chooseIcon()" />{{ chooseLabel() }}
      </button>
    </div>
    @if (full()) {
      <p class="lc-file-upload__limit" [id]="limitId">{{ limitText() }}</p>
    }
    @if (rows().length > 0) {
      <ul class="lc-file-upload__list" [attr.aria-label]="labels.fileUploadList">
        @for (row of rows(); track row.item.id; let index = $index) {
          <li class="lc-file-upload__row" [class.lc-file-upload__row--error]="row.item.status === 'error'">
            <div class="lc-file-upload__preview">
              @if (row.preview) {
                <img [src]="row.preview" alt="" (error)="onPreviewError(row.preview)" />
              } @else {
                <lc-icon [name]="row.previewIcon" />
              }
            </div>
            <div class="lc-file-upload__info">
              <span class="lc-file-upload__name">
                {{ row.item.name }}
              </span>
              @if (row.meta) {
                <span class="lc-file-upload__meta">
                  @if (row.metaIcon) {
                    <lc-icon [name]="row.metaIcon" [class]="'lc-file-upload__status lc-file-upload__status--' + row.item.status" />
                  }
                  {{ row.meta }}
                </span>
              }
              @if (row.item.status === 'uploading') {
                <div class="lc-file-upload__bar" [class.lc-file-upload__bar--indeterminate]="row.progress === null"
                  role="progressbar" aria-valuemin="0" aria-valuemax="100"
                  [attr.aria-valuenow]="row.progress" [attr.aria-label]="row.progressLabel">
                  <span class="lc-file-upload__bar-fill" [lcFill]="(row.progress ?? 100) / 100"></span>
                </div>
              }
              @if (row.item.status === 'error') {
                <p class="lc-file-upload__error" role="alert"><lc-icon name="circle-alert" /><span>{{ row.errorText }}</span></p>
                @if (row.retryable) {
                  <button lcButton type="button" fillMode="outline" themeColor="neutral" size="small" class="lc-file-upload__retry"
                    [disabled]="disabled()" [attr.aria-label]="row.retryLabel" (click)="retry.emit(row.item.id)">
                    <lc-icon name="rotate-ccw" />{{ labels.retry }}
                  </button>
                }
              }
            </div>
            @if (removeLabelVisible()) {
              <button #removeButton lcButton type="button" fillMode="outline" themeColor="neutral" size="small" class="lc-file-upload__remove"
                [disabled]="disabled()" [attr.aria-label]="row.removeLabel" (click)="onRemove(row.item.id, index)">
                {{ labels.fileUploadRemoveShort }}
              </button>
            } @else {
              <button #removeButton lcButton type="button" iconOnly fillMode="flat" themeColor="neutral"
                [disabled]="disabled()" [attr.aria-label]="row.removeLabel" (click)="onRemove(row.item.id, index)">
                <lc-icon name="x" />
              </button>
            }
          </li>
        }
      </ul>
    }
    <div class="lc-visually-hidden" role="status" aria-live="polite">{{ announcement() }}</div>
  `,
  styleUrl: './file-upload.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcFileUploadComponent) }],
  host: {
    class: 'lc-file-upload',
    role: 'group',
    '[attr.id]': 'id()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabel() ? null : (field?.labelId ?? null)',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '[class.lc-file-upload--disabled]': 'disabled()',
    '[class.lc-file-upload--full-width-mobile]': 'fullWidthMobile()',
    '[class.lc-file-upload--invalid]': 'field?.showInvalid() ?? false',
  },
})
export class LcFileUploadComponent implements LcFormFieldControl {
  protected readonly labels = inject(LC_LABELS);
  protected readonly field = inject(LC_FORM_FIELD, { optional: true });
  private readonly format = inject(LcFormatService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Fichiers affichés, fournis et tenus à jour par l'application. */
  readonly items = input<readonly LcFileUploadItem[]>([]);
  /** Types acceptés, au format de l'attribut natif : `image/png,image/jpeg`, `image/*`, `.pdf`. Vide : tous. */
  readonly accept = input('');
  /** Plusieurs fichiers par choix (comme l'attribut natif ; sans lui, un seul fichier est pris par choix). */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Nombre maximal de fichiers dans `items` ; atteint, le choix est inactif et le texte de limite s'affiche. `null` : sans limite. */
  readonly maxFiles = input<number | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Faux : le poids du fichier n'est ni affiché ni annoncé ; la ligne garde seulement son état. */
  readonly showSize = input(true, { transform: booleanAttribute });
  /** Icône du bouton de choix. */
  readonly chooseIcon = input('upload');
  /** Icône d'une ligne en erreur sans vignette. */
  readonly errorPlaceholderIcon = input('file-text');
  /** Vrai : sous 480 px de largeur disponible, le bouton de choix prend toute la largeur. */
  readonly fullWidthMobile = input(false, { transform: booleanAttribute });
  /** Vrai : le retrait est un bouton avec son mot visible (`labels.fileUploadRemoveShort`) au lieu de la seule croix. */
  readonly removeLabelVisible = input(false, { transform: booleanAttribute });
  /** Nom accessible hors de `lc-form-field` (sinon le libellé du champ est utilisé). */
  readonly ariaLabel = input<string>();
  readonly id = input<string>(lcUniqueId('file-upload'));

  /** Fichiers choisis et acceptés (type et nombre respectés). */
  readonly filesAdded = output<File[]>();
  /** Fichiers refusés avec la raison, pour que l'application le dise à sa façon. */
  readonly rejected = output<LcFileUploadRejection[]>();
  /** Identifiant de la ligne à retirer ; l'application la retire de `items` (ou non). */
  readonly remove = output<string>();
  /** Identifiant de la ligne à renvoyer. */
  readonly retry = output<string>();

  readonly controlId = computed(() => this.id());
  readonly labelable = false;

  protected readonly limitId = lcUniqueId('file-upload-limit');
  protected readonly dragging = signal(false);

  private readonly nativeInput = viewChild.required<ElementRef<HTMLInputElement>>('native');
  private readonly chooseButton = viewChild.required('choose', { read: ElementRef<HTMLButtonElement> });
  private readonly removeButtons = viewChildren('removeButton', { read: ElementRef<HTMLButtonElement> });
  /** Adresses d'aperçu qui n'ont pas pu se charger : la ligne passe à l'icône d'image indisponible. */
  private readonly brokenPreviews = signal<ReadonlySet<string>>(new Set());
  private removal: { id: string; index: number } | null = null;

  protected readonly full = computed(() => this.isFull(this.items().length));
  protected readonly describedBy = computed(() => joinIds(this.field?.describedBy()));
  protected readonly chooseLabel = computed(() => (this.multiple() ? this.labels.fileUploadChooseMany : this.labels.fileUploadChoose));
  protected readonly limitText = computed(() => this.labels.fileUploadLimitReached(this.maxFiles() ?? 0));

  protected readonly rows = computed<readonly RowView[]>(() => {
    const broken = this.brokenPreviews();
    return this.items().map((item) => {
      const error = item.status === 'error';
      const progress = Number.isFinite(item.progress) ? Math.round(Math.min(100, Math.max(0, item.progress as number))) : null;
      const status = {
        pending: this.labels.fileUploadPending,
        uploading: this.labels.fileUploadUploading(progress),
        done: this.labels.fileUploadDone,
        error: '',
      }[item.status];
      const state = item.statusLabel || status;
      const size = this.showSize() ? this.sizeText(item.size) : '';
      const preview = item.previewUrl && !broken.has(item.previewUrl) ? item.previewUrl : null;
      return {
        item,
        preview,
        previewIcon: item.previewUrl ? 'image-off' : error ? this.errorPlaceholderIcon() : 'file-text',
        meta: error ? size : [size, state].filter(Boolean).join(' · '),
        metaIcon: { pending: 'clock', uploading: null, done: 'circle-check', error: null }[item.status],
        progress,
        errorText: item.errorMessage || this.labels.fileUploadFailed,
        progressLabel: this.labels.fileUploadProgress(item.name),
        removeLabel: this.labels.fileUploadRemove(item.name),
        retryLabel: this.labels.fileUploadRetry(item.name),
        retryable: item.retryable !== false,
      };
    });
  });

  /**
   * Annonce polie : début et fin d'envoi, retrait, limite atteinte. Jamais à chaque pourcentage ; les erreurs
   * s'annoncent par le `role="alert"` de leur ligne. Sans changement notable, le texte précédent reste.
   */
  protected readonly announcement = linkedSignal<readonly LcFileUploadItem[], string>({
    source: this.items,
    computation: (items, previous) => {
      if (!previous) return '';
      const before = new Map(previous.source.map((item) => [item.id, item]));
      const messages: string[] = [];
      for (const item of items) {
        const status = before.get(item.id)?.status;
        if (item.status === 'uploading' && status !== 'uploading') messages.push(this.labels.fileUploadProgress(item.name));
        else if (item.status === 'done' && status !== 'done') messages.push(this.labels.fileUploadAnnounceDone(item.name));
      }
      const removed = this.removal && !items.some((item) => item.id === this.removal?.id) ? before.get(this.removal.id) : undefined;
      if (removed) messages.push(this.labels.fileUploadAnnounceRemoved(removed.name));
      if (this.isFull(items.length) && !this.isFull(previous.source.length)) messages.push(this.limitText());
      return messages.length > 0 ? messages.join('. ') : previous.value;
    },
  });

  constructor() {
    // Après un retrait, le focus passe à la ligne suivante, sinon à la précédente, sinon au bouton de choix
    // (le navigateur le laisserait sur <body>). Si le focus a été déplacé ailleurs entre-temps, on n'y touche pas.
    afterRenderEffect(() => {
      const items = this.items();
      const removal = this.removal;
      if (!removal || items.some((item) => item.id === removal.id)) return;
      this.removal = null;
      const active = this.document.activeElement;
      if (active && active !== this.document.body) return;
      const buttons = this.removeButtons();
      (buttons[Math.min(removal.index, buttons.length - 1)] ?? this.chooseButton()).nativeElement.focus();
    });

    if (isDevMode()) {
      afterNextRender(() => {
        if (!this.ariaLabel() && !this.field && !this.host.hasAttribute('aria-labelledby')) {
          console.warn('[lc-file-upload] ariaLabel est obligatoire hors de lc-form-field.');
        }
      });
    }
  }

  focus(options?: FocusOptions): void {
    this.chooseButton().nativeElement.focus(options);
  }

  protected open(): void {
    if (!this.disabled() && !this.full()) this.nativeInput().nativeElement.click();
  }

  protected onNativeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.receive(input.files);
    input.value = ''; // permet de rechoisir le même fichier
  }

  protected onDrag(event: DragEvent): void {
    if (!dragHasFiles(event)) return;
    event.preventDefault(); // sans cela, le navigateur ouvrirait le fichier déposé
    const blocked = this.disabled() || this.full();
    event.dataTransfer.dropEffect = blocked ? 'none' : 'copy';
    this.dragging.set(!blocked);
  }

  protected onDragLeave(event: DragEvent): void {
    if (dragLeftZone(event)) this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (!dragHasFiles(event)) return;
    event.preventDefault();
    this.dragging.set(false);
    this.receive(event.dataTransfer.files);
  }

  protected onRemove(id: string, index: number): void {
    this.removal = { id, index };
    this.remove.emit(id);
  }

  protected onPreviewError(url: string): void {
    this.brokenPreviews.update((broken) => new Set(broken).add(url));
  }

  private isFull(count: number): boolean {
    const max = this.maxFiles();
    return max !== null && count >= max;
  }

  /** Trie les fichiers reçus : type d'abord, puis place restante (et un seul fichier sans `multiple`). */
  private receive(list: FileList | null): void {
    if (!list || list.length === 0 || this.disabled()) return;
    const max = this.maxFiles();
    const room = max === null ? Infinity : Math.max(0, max - this.items().length);
    const { accepted, refused } = filterFiles(Array.from(list), { accept: this.accept(), room, multiple: this.multiple() });
    if (accepted.length > 0) this.filesAdded.emit(accepted);
    if (refused.length > 0) this.rejected.emit(refused);
  }

  private sizeText(bytes: number): string {
    return fileSizeText(bytes, this.labels.fileSizeUnits, (value) => this.format.number(value));
  }
}
