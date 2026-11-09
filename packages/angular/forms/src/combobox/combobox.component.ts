import { ActiveDescendantKeyManager, Highlightable } from '@angular/cdk/a11y';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  TemplateRef,
  ViewContainerRef,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
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
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  LC_DEFAULTS,
  LC_LABELS,
  LcButtonComponent,
  LcFillMode,
  LcIconComponent,
  LcRounded,
  LcSize,
  LcSpinnerComponent,
  joinIds,
  lcUniqueId,
} from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';
import { LcComboboxOptionDirective } from './combobox-option.directive';
import { LcHighlightComponent } from './highlight.component';
import { lcFilterOptions, lcNormalizeSearchText } from './search-text';

/** Entrée de la liste : une option ou, en cas d'erreur de recherche, l'action « Réessayer ». */
type ComboboxEntry<T> = (OptionEntry<T> | RetryEntry) & Highlightable;

interface EntryBase {
  readonly id: string;
  readonly disabled: false;
}

interface OptionEntry<T> extends EntryBase {
  readonly kind: 'option';
  readonly item: T;
  readonly key: string;
  readonly label: string;
}

interface RetryEntry extends EntryBase {
  readonly kind: 'retry';
}

/** Fonction de recherche asynchrone : doit honorer `signal` (annulation) et renvoyer la liste complète des propositions. */
export type LcComboboxSearch<T> = (text: string, signal: AbortSignal) => Promise<readonly T[]>;

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

const ANNOUNCE_DELAY_MS = 500;
const ASYNC_MIN_LENGTH = 2;

/** Erreur « trop de requêtes » : reconnue par `status === 429` ou `kind === 'rate-limited'` (sans dépendre d'un type précis). */
function isRateLimited(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { status?: unknown; kind?: unknown };
  return candidate.status === 429 || candidate.kind === 'rate-limited';
}

/** Les styles actifs sont portés par le gabarit (`activeIndex`) : le gestionnaire n'a rien à appliquer. */
const NO_STYLES = { setActiveStyles: () => undefined, setInactiveStyles: () => undefined };

/**
 * Liste filtrable (motif ARIA « combobox avec liste ») : un `input` natif (`role="combobox"`) et un panneau CDK Overlay
 * (`role="listbox"`). La focalisation reste dans le champ (`aria-activedescendant`) ; le clavier vient de
 * `ActiveDescendantKeyManager`. Implémente `FormValueControl<T | null>` (Signal Forms) et `[(value)]`.
 *
 * Mode local : `options` filtrées en mémoire (`filterKeys`, `lcFilterOptions`).
 *
 * @example
 * <lc-combobox [options]="cities" [displayWith]="cityName" [trackBy]="cityId" [(value)]="city" ariaLabel="Ville" />
 */
@Component({
  selector: 'lc-combobox',
  imports: [LcButtonComponent, LcIconComponent, LcSpinnerComponent, LcHighlightComponent, NgTemplateOutlet],
  template: `
    <div #frame class="lc-combobox__frame" (click)="focus()">
      <input #input class="lc-combobox__input" type="text" role="combobox" autocomplete="off" autocapitalize="off"
        spellcheck="false" aria-autocomplete="list" [id]="inputId()" [value]="text()" [disabled]="disabled()"
        [readOnly]="readonly()" [attr.placeholder]="placeholder() || null" [attr.aria-label]="ariaLabel() || null"
        [attr.aria-expanded]="open()" [attr.aria-controls]="controlsId()" [attr.aria-activedescendant]="activeId()"
        [attr.aria-invalid]="showInvalid() ? 'true' : null" [attr.aria-required]="isRequired() ? 'true' : null"
        [attr.aria-describedby]="describedBy()" [attr.aria-readonly]="readonly() ? 'true' : null"
        (input)="onInput($event)" (focus)="onFocus()" (blur)="onBlur()" (keydown)="onKeydown($event)" (click)="onInputClick()" />
      @if (status() === 'loading') {
        <lc-spinner class="lc-combobox__spinner" size="small" [label]="labels.comboboxSearching" />
      }
      @if (showClear()) {
        <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" rounded="full" size="small"
          class="lc-combobox__clear" tabindex="-1" [attr.aria-label]="labels.comboboxClear"
          (mousedown)="$event.preventDefault()" (click)="clear(); $event.stopPropagation()"><lc-icon name="x" /></button>
      }
      <lc-icon class="lc-combobox__chevron" name="chevron-down" aria-hidden="true" />
    </div>
    @if (showHint()) {
      <p class="lc-combobox__hint" [id]="hintId"><lc-icon name="circle-alert" />{{ labels.comboboxChooseProposal }}</p>
    }
    <ng-template #panel>
      @if (entries().length > 0 || panelMessage()) {
        <div class="lc-combobox-panel" (mousedown)="$event.preventDefault()">
          @if (panelMessage(); as message) {
            <p class="lc-combobox-panel__message">{{ message }}</p>
          }
          @if (entries().length > 0) {
            <ul class="lc-combobox-panel__list" role="listbox" [id]="listId" [attr.aria-busy]="status() === 'loading' ? 'true' : null"
              [attr.aria-label]="ariaLabel() || null" [attr.aria-labelledby]="ariaLabel() ? null : (field?.labelId ?? null)">
              @for (entry of entries(); track entry.id; let index = $index) {
                <li role="option" class="lc-combobox-panel__option" [id]="entry.id"
                  [class.lc-combobox-panel__option--active]="index === activeIndex()"
                  [class.lc-combobox-panel__option--retry]="entry.kind === 'retry'"
                  [attr.aria-selected]="entry.kind === 'option' ? entry.key === selectedKey() : null"
                  (click)="activate(index)" (mousemove)="hover(index)">
                  @if (entry.kind === 'option') {
                    @if (optionTemplate(); as option) {
                      <ng-container [ngTemplateOutlet]="option.template"
                        [ngTemplateOutletContext]="{ $implicit: entry.item, text: query(), selected: entry.key === selectedKey() }" />
                    } @else {
                      <span [lcHighlight]="entry.label" [lcHighlightTerm]="query()"></span>
                    }
                    @if (entry.key === selectedKey()) {
                      <lc-icon class="lc-combobox-panel__check" name="check" />
                    }
                  } @else {
                    <span class="lc-combobox-panel__retry"><lc-icon name="rotate-ccw" />{{ labels.comboboxRetry }}</span>
                  }
                </li>
              }
            </ul>
          }
        </div>
      }
    </ng-template>
    <span class="lc-visually-hidden" aria-live="polite">{{ announcement() }}</span>
  `,
  styleUrl: './combobox.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcComboboxComponent) }],
  host: {
    class: 'lc-combobox',
    '[class]': 'frameClasses()',
    '[class.lc-combobox--invalid]': 'showInvalid() || showHint()',
    '[class.lc-combobox--disabled]': 'disabled()',
    '[class.lc-combobox--readonly]': 'readonly()',
    '[class.lc-combobox--open]': 'open()',
  },
})
export class LcComboboxComponent<T> implements FormValueControl<T | null>, LcFormFieldControl {
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly defaults = inject(LC_DEFAULTS);
  protected readonly labels = inject(LC_LABELS);
  protected readonly field = inject(LC_FORM_FIELD, { optional: true });

  /** Élément sélectionné (`null` : aucun). */
  readonly value = model<T | null>(null);
  /** Mode local : éléments proposés, filtrés en mémoire. */
  readonly options = input<readonly T[] | null>(null);
  /** Mode asynchrone (exclusif avec `options`) : recherche du texte saisi, annulée par la recherche suivante. */
  readonly search = input<LcComboboxSearch<T> | null>(null);
  /** Texte du champ après sélection (obligatoire). */
  readonly displayWith = input.required<(item: T) => string>();
  /** Clé stable d'un élément : égalité de valeur et identifiants d'options (obligatoire). */
  readonly trackBy = input.required<(item: T) => string>();
  /** Textes comparés au texte saisi en mode local (défaut : `displayWith`). */
  readonly filterKeys = input<((item: T) => readonly string[]) | undefined>(undefined);
  /** Caractères saisis avant de chercher ou d'afficher des propositions (défaut : 0 en local, 2 en asynchrone). */
  readonly minLength = input<number | undefined>(undefined);
  /** Anti-rebond de la recherche asynchrone, en millisecondes. */
  readonly debounceMs = input(200);
  /** Nombre maximal de propositions affichées en mode local. */
  readonly maxResults = input(50);
  /** Ouvre la liste à la prise de focus (défaut : oui en local, non en asynchrone). */
  readonly openOnFocus = input<boolean | undefined>(undefined);
  /** Bouton « Effacer ». */
  readonly clearable = input(true, { transform: booleanAttribute });
  readonly placeholder = input('');
  /** Identifiant du champ (généré), relié au libellé de `lc-form-field`. */
  readonly inputId = input<string>(lcUniqueId('combobox'));
  /** Nom accessible quand le contrôle est utilisé hors de `lc-form-field`. */
  readonly ariaLabel = input<string>();
  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
  readonly rounded = input<LcRounded | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Force l'état invalide (sinon déduit de `lc-form-field` et de `[formField]`). */
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  /** Sélection faite par l'utilisateur (jamais lors d'une valeur posée par le code). */
  readonly selectionChange = output<T | null>();
  /** Erreur de la fonction `search` (le panneau affiche alors l'état d'erreur et « Réessayer »). */
  readonly searchFailed = output<unknown>();
  /** Émis quand le focus quitte le champ (champ « touché » pour Signal Forms). */
  readonly touch = output<void>();

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;

  protected readonly listId = lcUniqueId('listbox');
  protected readonly hintId = lcUniqueId('combobox-hint');
  protected readonly optionTemplate = contentChild(LcComboboxOptionDirective);

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly frameRef = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly panelRef = viewChild.required<TemplateRef<unknown>>('panel');

  protected readonly open = signal(false);
  protected readonly status = signal<SearchStatus>('idle');
  private readonly errorKind = signal<'unavailable' | 'rate-limited'>('unavailable');
  private readonly remoteItems = signal<readonly T[]>([]);
  protected readonly announcement = signal('');
  protected readonly activeIndex = signal(-1);
  /** Texte saisi par l'utilisateur et servant au filtre (vide après une sélection). */
  protected readonly query = signal('');
  private readonly focused = signal(false);
  private readonly blurred = signal(false);

  /** Texte du champ : celui de la valeur, ou la saisie en cours quand la saisie a remis la valeur à `null`. */
  protected readonly text = linkedSignal<T | null, string>({
    source: this.value,
    computation: (value, previous) => {
      if (value !== null) return this.displayWith()(value);
      if (!previous) return '';
      const previousValue = previous.source;
      const edited = previousValue === null || previous.value !== this.displayWith()(previousValue);
      return edited ? previous.value : '';
    },
  });

  private readonly keys = computed(() => {
    const filterKeys = this.filterKeys();
    const displayWith = this.displayWith();
    return filterKeys ?? ((item: T) => [displayWith(item)]);
  });

  private readonly mode = computed<'local' | 'async' | 'none'>(() =>
    this.options() !== null ? 'local' : this.search() !== null ? 'async' : 'none');
  protected readonly minLengthResolved = computed(() => this.minLength() ?? (this.mode() === 'async' ? ASYNC_MIN_LENGTH : 0));
  protected readonly openOnFocusResolved = computed(() => this.openOnFocus() ?? this.mode() !== 'async');
  private readonly belowMinLength = computed(() => this.query().trim().length < this.minLengthResolved());

  private readonly items = computed<readonly T[]>(() => {
    if (this.belowMinLength()) return [];
    return this.mode() === 'async'
      ? this.remoteItems()
      : lcFilterOptions(this.options() ?? [], this.query(), this.keys(), this.maxResults());
  });

  protected readonly entries = computed<readonly ComboboxEntry<T>[]>(() => {
    if (this.mode() === 'async' && this.status() === 'error' && !this.belowMinLength()) {
      return [{ kind: 'retry', id: `${this.listId}-retry`, disabled: false, ...NO_STYLES }];
    }
    const trackBy = this.trackBy();
    const displayWith = this.displayWith();
    return this.items().map((item, index): ComboboxEntry<T> => ({
      kind: 'option', id: `${this.listId}-${index}`, disabled: false, item, key: trackBy(item), label: displayWith(item), ...NO_STYLES,
    }));
  });

  /** Texte d'état au-dessus (ou à la place) de la liste : erreur, recherche, texte trop court, aucun résultat. */
  protected readonly panelMessage = computed<string | null>(() => {
    if (this.belowMinLength()) return this.labels.comboboxMinLength(this.minLengthResolved());
    if (this.mode() === 'async') {
      const status = this.status();
      if (status === 'error') return this.errorKind() === 'rate-limited' ? this.labels.comboboxTooManyRequests : this.labels.comboboxSearchUnavailable;
      if (status === 'loading' && this.entries().length === 0) return this.labels.comboboxSearching;
      if (status === 'idle') return null;
    }
    return this.entries().length === 0 ? this.labels.comboboxNoResults : null;
  });

  protected readonly selectedKey = computed(() => {
    const value = this.value();
    return value === null ? null : this.trackBy()(value);
  });
  protected readonly activeId = computed(() => (this.open() ? (this.entries()[this.activeIndex()]?.id ?? null) : null));
  protected readonly controlsId = computed(() => (this.open() && this.entries().length > 0 ? this.listId : null));
  protected readonly showClear = computed(() => this.clearable() && this.text() !== '' && !this.disabled() && !this.readonly());
  /** Texte saisi sans proposition choisie, une fois le champ quitté. */
  protected readonly showHint = computed(() => !this.focused() && this.text().trim() !== '' && this.value() === null);
  protected readonly showInvalid = computed(() =>
    this.field ? this.field.showInvalid() : this.invalid() && (this.touched() || this.blurred()));
  protected readonly isRequired = computed(() => this.required() || (this.field?.isRequired() ?? false));
  protected readonly describedBy = computed(() => joinIds(this.showHint() ? this.hintId : null, this.field?.describedBy()));
  protected readonly frameClasses = computed(() => {
    const size = this.size() ?? this.defaults.size;
    const fillMode = this.fillMode() ?? this.defaults.fillMode;
    const rounded = this.rounded() ?? this.defaults.rounded;
    return `lc-combobox lc-combobox--${size} lc-combobox--${fillMode} lc-combobox--rounded-${rounded}`;
  });

  private overlayRef?: OverlayRef;
  private abortController?: AbortController;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private announceTimer?: ReturnType<typeof setTimeout>;
  private readonly keyManager = new ActiveDescendantKeyManager<ComboboxEntry<T>>(this.entries, this.injector).withWrap();

  constructor() {
    this.keyManager.change.subscribe((index) => this.activeIndex.set(index));
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      this.cancelPending();
      clearTimeout(this.announceTimer);
      this.keyManager.destroy();
      this.overlayRef?.dispose();
    });
    effect(() => {
      const index = this.activeIndex();
      const id = untracked(() => this.entries()[index]?.id);
      if (id) document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' });
    });
    if (isDevMode()) {
      afterNextRender(() => {
        if (this.options() !== null && this.search() !== null) {
          console.warn('[lc-combobox] `options` et `search` fournis ensemble : `search` est ignoré.');
        } else if (this.mode() === 'none') {
          console.warn('[lc-combobox] fournir `options` (mode local) ou `search` (mode asynchrone).');
        }
      });
    }
  }

  focus(options?: FocusOptions): void {
    this.inputRef().nativeElement.focus(options);
  }

  protected onFocus(): void {
    this.focused.set(true);
    if (this.openOnFocusResolved() && !this.readonly()) this.openPanel();
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.blurred.set(true);
    this.closePanel();
    this.selectIfSingleMatch();
    this.touch.emit();
  }

  protected onInputClick(): void {
    if (this.openOnFocusResolved() && !this.open() && !this.readonly()) this.openPanel();
  }

  protected onInput(event: Event): void {
    const typed = (event.target as HTMLInputElement).value;
    this.text.set(typed);
    this.query.set(typed);
    const value = this.value();
    if (value !== null && typed !== this.displayWith()(value)) {
      this.value.set(null);
      this.selectionChange.emit(null);
    }
    if (!this.open()) this.attachPanel();
    this.refreshResults();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        this.onArrow(event);
        break;
      case 'Enter':
        this.onEnter(event);
        break;
      case 'Escape':
        this.onEscape(event);
        break;
      case 'Tab':
        this.closePanel();
        break;
      default:
        break;
    }
  }

  protected activate(index: number): void {
    const entry = this.entries()[index];
    if (entry?.kind === 'option') this.select(entry.item);
    else if (entry?.kind === 'retry') this.runSearch(true);
  }

  protected hover(index: number): void {
    if (index !== this.activeIndex()) this.keyManager.setActiveItem(index);
  }

  protected clear(): void {
    const hadValue = this.value() !== null;
    this.text.set('');
    this.query.set('');
    if (hadValue) {
      this.value.set(null);
      this.selectionChange.emit(null);
    }
    this.focus();
    if (this.openOnFocusResolved()) this.openPanel();
  }

  private onArrow(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.readonly()) return;
    const down = event.key === 'ArrowDown';
    if (!this.open()) {
      this.openPanel();
      if (event.altKey) return;
      if (!down) this.keyManager.setActiveItem(this.entries().length - 1);
      return;
    }
    if (event.altKey) return;
    if (down) this.keyManager.setNextItemActive();
    else this.keyManager.setPreviousItemActive();
  }

  private onEnter(event: KeyboardEvent): void {
    if (!this.open()) return;
    const entry = this.entries()[this.activeIndex()];
    if (!entry) return;
    event.preventDefault();
    this.activate(this.activeIndex());
  }

  private onEscape(event: KeyboardEvent): void {
    if (this.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.closePanel();
    } else if (this.text() !== '' && !this.readonly()) {
      event.preventDefault();
      event.stopPropagation();
      this.clear();
    }
  }

  private select(item: T): void {
    this.value.set(item);
    this.query.set('');
    this.selectionChange.emit(item);
    this.closePanel();
  }

  /** À la sortie du champ : le texte égal à une seule option (comparaison normalisée) la sélectionne. */
  private selectIfSingleMatch(): void {
    const typed = lcNormalizeSearchText(this.text());
    if (!typed || this.value() !== null) return;
    const displayWith = this.displayWith();
    const candidates = this.mode() === 'local' ? (this.options() ?? []) : this.remoteItems();
    const matches = candidates.filter((item) => lcNormalizeSearchText(displayWith(item)) === typed);
    if (matches.length === 1) this.select(matches[0]);
  }

  private openPanel(): void {
    if (this.open() || this.readonly() || this.disabled()) return;
    this.attachPanel();
    if (this.mode() === 'async' && (this.status() === 'idle' || this.status() === 'error')) this.runSearch(true);
    else this.keyManager.setActiveItem(this.initialActiveIndex());
  }

  private attachPanel(): void {
    if (this.readonly() || this.disabled()) return;
    const frame = this.frameRef().nativeElement;
    this.overlayRef ??= this.overlay.create({
      positionStrategy: this.overlay.position().flexibleConnectedTo(frame).withFlexibleDimensions(true).withViewportMargin(8)
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        ]),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass: 'lc-combobox-overlay',
    });
    this.overlayRef.updateSize({ width: frame.getBoundingClientRect().width });
    this.overlayRef.attach(new TemplatePortal(this.panelRef(), this.viewContainerRef));
    this.open.set(true);
  }

  private closePanel(): void {
    if (!this.open()) return;
    this.overlayRef?.detach();
    this.open.set(false);
    this.keyManager.setActiveItem(-1);
    if (this.status() === 'loading') {
      this.cancelPending();
      this.status.set('idle');
    }
  }

  /** Après une saisie : recherche asynchrone, ou nouveau filtre local avec annonce du nombre de résultats. */
  private refreshResults(): void {
    if (this.mode() === 'async') {
      this.runSearch(false);
      return;
    }
    this.keyManager.setActiveItem(this.initialActiveIndex());
    this.scheduleAnnouncement();
  }

  /** Lance la recherche du texte saisi ; la précédente est annulée, seul le dernier résultat est affiché. */
  private runSearch(immediate: boolean): void {
    this.cancelPending();
    const search = this.search();
    const text = this.query().trim();
    if (!search || this.belowMinLength()) {
      this.remoteItems.set([]);
      this.status.set('idle');
      this.keyManager.setActiveItem(-1);
      return;
    }
    const controller = new AbortController();
    this.abortController = controller;
    this.status.set('loading');
    this.keyManager.setActiveItem(-1);
    const execute = async (): Promise<void> => {
      try {
        const result = await search(text, controller.signal);
        if (controller.signal.aborted) return;
        this.remoteItems.set(result);
        this.status.set('ready');
        this.keyManager.setActiveItem(this.initialActiveIndex());
        this.scheduleAnnouncement();
      } catch (error) {
        if (controller.signal.aborted) return;
        this.errorKind.set(isRateLimited(error) ? 'rate-limited' : 'unavailable');
        this.remoteItems.set([]);
        this.status.set('error');
        this.keyManager.setActiveItem(0);
        this.searchFailed.emit(error);
      }
    };
    const delay = immediate ? 0 : this.debounceMs();
    if (delay > 0) this.debounceTimer = setTimeout(() => void execute(), delay);
    else void execute();
  }

  private cancelPending(): void {
    clearTimeout(this.debounceTimer);
    this.abortController?.abort();
    this.abortController = undefined;
  }

  /** Une annonce `aria-live` par recherche, 500 ms après la fin : nombre de propositions ou « Aucun résultat ». */
  private scheduleAnnouncement(): void {
    clearTimeout(this.announceTimer);
    this.announcement.set('');
    this.announceTimer = setTimeout(() => {
      if (!this.open() || this.belowMinLength()) return;
      const count = this.items().length;
      this.announcement.set(count === 0 ? this.labels.comboboxNoResults : this.labels.comboboxResultsCount(count));
    }, ANNOUNCE_DELAY_MS);
  }

  /** Avec une saisie : première proposition ; sinon l'élément sélectionné. */
  private initialActiveIndex(): number {
    const entries = this.entries();
    if (entries.length === 0) return -1;
    if (this.query().trim() !== '') return 0;
    const selected = this.selectedKey();
    return selected === null ? -1 : entries.findIndex((entry) => entry.kind === 'option' && entry.key === selected);
  }
}
