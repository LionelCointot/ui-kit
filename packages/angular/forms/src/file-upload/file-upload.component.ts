import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { LC_LABELS, LcButtonComponent, LcFormatService, LcIconComponent, joinIds, lcUniqueId } from '@lionelcointot/ui-angular';
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
}

/** Raison du refus d'un fichier : type non accepté, ou nombre maximal de fichiers dépassé. */
export type LcFileRejectionReason = 'type' | 'count';

export interface LcFileUploadRejection {
  readonly file: File;
  readonly reason: LcFileRejectionReason;
}

interface RowView {
  readonly item: LcFileUploadItem;
  readonly stem: string;
  readonly extension: string;
  readonly preview: string | null;
  readonly previewIcon: string;
  readonly meta: string;
  readonly metaIcon: string | null;
  readonly progress: number | null;
  readonly errorText: string;
  readonly progressLabel: string;
  readonly removeLabel: string;
  readonly retryLabel: string;
}

/** Vrai si le fichier correspond à `accept` (types MIME, `type/*` ou extensions, comme l'attribut natif). */
function matchesAccept(file: File, accept: string): boolean {
  const tokens = accept.split(',').map((token) => token.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) =>
    token.startsWith('.') ? name.endsWith(token) : token.endsWith('/*') ? type.startsWith(token.slice(0, -1)) : type === token);
}

/** Sépare « rapport-final.pdf » en radical et extension, pour couper le radical seul si le nom est trop long. */
function splitName(name: string): { stem: string; extension: string } {
  const dot = name.lastIndexOf('.');
  return dot > 0 && name.length - dot <= 8 ? { stem: name.slice(0, dot), extension: name.slice(dot) } : { stem: name, extension: '' };
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
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <div class="lc-file-upload__zone" [class.lc-file-upload__zone--active]="dragging()"
      (dragenter)="onDrag($event)" (dragover)="onDrag($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
      <span class="lc-file-upload__hint">{{ labels.fileUploadDropHint }}</span>
      <input #native type="file" hidden tabindex="-1" aria-hidden="true"
        [attr.accept]="accept() || null" [multiple]="multiple()" (change)="onNativeChange($event)" />
      <button #choose lcButton type="button" fillMode="outline" themeColor="primary" class="lc-file-upload__choose"
        [disabled]="disabled()" [attr.aria-disabled]="full() ? 'true' : null" [attr.aria-describedby]="full() ? limitId : null"
        (click)="open()">
        <lc-icon name="upload" />{{ chooseLabel() }}
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
              <span class="lc-file-upload__name" [class.lc-file-upload__name--cut]="cutNames().has(row.item.id)" [attr.title]="row.item.name">
                <span #stem class="lc-file-upload__stem">{{ row.stem }}</span><span class="lc-file-upload__extension">{{ row.extension }}</span>
              </span>
              <span class="lc-file-upload__meta">
                @if (row.metaIcon) {
                  <lc-icon [name]="row.metaIcon" [class]="'lc-file-upload__status lc-file-upload__status--' + row.item.status" />
                }
                {{ row.meta }}
              </span>
              @if (row.item.status === 'uploading') {
                <div class="lc-file-upload__bar" [class.lc-file-upload__bar--indeterminate]="row.progress === null"
                  role="progressbar" aria-valuemin="0" aria-valuemax="100"
                  [attr.aria-valuenow]="row.progress" [attr.aria-label]="row.progressLabel">
                  <span class="lc-file-upload__bar-fill" [style.width.%]="row.progress"></span>
                </div>
              }
              @if (row.item.status === 'error') {
                <p class="lc-file-upload__error" role="alert"><lc-icon name="circle-alert" /><span>{{ row.errorText }}</span></p>
                <button lcButton type="button" fillMode="outline" themeColor="neutral" size="small" class="lc-file-upload__retry"
                  [disabled]="disabled()" [attr.aria-label]="row.retryLabel" (click)="retry.emit(row.item.id)">
                  <lc-icon name="rotate-ccw" />{{ labels.retry }}
                </button>
              }
            </div>
            <button #removeButton lcButton type="button" iconOnly fillMode="flat" themeColor="neutral"
              [disabled]="disabled()" [attr.aria-label]="row.removeLabel" (click)="onRemove(row.item.id, index)">
              <lc-icon name="x" />
            </button>
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
  private readonly stems = viewChildren('stem', { read: ElementRef<HTMLElement> });
  /** Lignes dont le radical du nom est coupé : elles affichent « … » juste avant l'extension (voir `measureNames`). */
  protected readonly cutNames = signal<ReadonlySet<string>>(new Set());

  protected readonly full = computed(() => this.isFull(this.items().length));
  protected readonly describedBy = computed(() => joinIds(this.field?.describedBy()));
  protected readonly chooseLabel = computed(() => (this.multiple() ? this.labels.fileUploadChooseMany : this.labels.fileUploadChoose));
  protected readonly limitText = computed(() => this.labels.fileUploadLimitReached(this.maxFiles() ?? 0));

  protected readonly rows = computed<readonly RowView[]>(() => {
    const broken = this.brokenPreviews();
    return this.items().map((item) => {
      const { stem, extension } = splitName(item.name);
      const error = item.status === 'error';
      const progress = Number.isFinite(item.progress) ? Math.round(Math.min(100, Math.max(0, item.progress as number))) : null;
      const status = {
        pending: this.labels.fileUploadPending,
        uploading: this.labels.fileUploadUploading(progress),
        done: this.labels.fileUploadDone,
        error: '',
      }[item.status];
      const size = this.sizeText(item.size);
      const preview = item.previewUrl && !broken.has(item.previewUrl) ? item.previewUrl : null;
      return {
        item,
        stem,
        extension,
        preview,
        previewIcon: item.previewUrl ? 'image-off' : 'file-text',
        meta: error ? size : `${size} · ${item.statusLabel || status}`,
        metaIcon: { pending: 'clock', uploading: null, done: 'circle-check', error: null }[item.status],
        progress,
        errorText: item.errorMessage || this.labels.fileUploadFailed,
        progressLabel: this.labels.fileUploadProgress(item.name),
        removeLabel: this.labels.fileUploadRemove(item.name),
        retryLabel: this.labels.fileUploadRetry(item.name),
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

    afterRenderEffect(() => this.measureNames());
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.measureNames());
      observer.observe(this.host);
      destroyRef.onDestroy(() => observer.disconnect());
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

  /**
   * Repère les noms dont le radical déborde. `text-overflow: ellipsis` laisserait un vide (jusqu'à un caractère) entre « … »
   * et l'extension : le radical est donc coupé net et le « … » est posé contre l'extension (`--cut`).
   */
  private measureNames(): void {
    const rows = this.rows();
    const cut = new Set<string>();
    this.stems().forEach((stem, index) => {
      const element = stem.nativeElement;
      if (element.scrollWidth > element.clientWidth && rows[index]) cut.add(rows[index].item.id);
    });
    const current = this.cutNames();
    if (cut.size !== current.size || [...cut].some((id) => !current.has(id))) this.cutNames.set(cut);
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
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault(); // sans cela, le navigateur ouvrirait le fichier déposé
    const blocked = this.disabled() || this.full();
    event.dataTransfer.dropEffect = blocked ? 'none' : 'copy';
    this.dragging.set(!blocked);
  }

  protected onDragLeave(event: DragEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
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
    const room = Math.min(max === null ? Infinity : Math.max(0, max - this.items().length), this.multiple() ? Infinity : 1);
    const accepted: File[] = [];
    const refused: LcFileUploadRejection[] = [];
    for (const file of Array.from(list)) {
      if (!matchesAccept(file, this.accept())) refused.push({ file, reason: 'type' });
      else if (accepted.length >= room) refused.push({ file, reason: 'count' });
      else accepted.push(file);
    }
    if (accepted.length > 0) this.filesAdded.emit(accepted);
    if (refused.length > 0) this.rejected.emit(refused);
  }

  /** Taille lisible, unités du kit (1 Ko = 1 000 octets) : « 2,3 Mo ». */
  private sizeText(bytes: number): string {
    let value = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
    let unit = 0;
    let shown = Math.round(value);
    // On passe à l'unité supérieure quand la valeur arrondie atteint 1 000 (999 999 o : « 1 Mo », pas « 1 000 Ko »).
    while (shown >= 1000 && unit < 3) {
      value /= 1000;
      unit += 1;
      shown = Number(value.toFixed(value >= 100 ? 0 : 1)); // décimale nulle omise : « 2 Mo », pas « 2,0 Mo »
    }
    return `${this.format.number(shown)} ${this.labels.fileSizeUnits[unit]}`;
  }
}
