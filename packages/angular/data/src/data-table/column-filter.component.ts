import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, linkedSignal, model, output, signal,
  untracked, viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LC_LABELS, LcButtonComponent, LcIconComponent, LcSkeletonComponent } from '@lionelcointot/ui-angular';
import { LcAlertComponent } from '@lionelcointot/ui-angular/feedback';
import { LcDateRangeInputComponent, type LcDateInterval } from '@lionelcointot/ui-angular/forms';
import {
  LcDataColumn, LcDataSource, LcDateRange, LcDistinctValue, LcFilterValue, LcTableQuery,
  fromDateInterval, isDateRange, normalizeText, orderDistinct, toDateInterval,
} from './data-table-model';

/** Au-delà de ce nombre de valeurs, une recherche apparaît au-dessus de la liste. */
const SEARCH_THRESHOLD = 8;

interface ValueOption {
  readonly value: string;
  readonly label: string;
  readonly count: number;
  readonly icon: string | null;
}

/**
 * Corps d'un filtre de colonne (interne à `lc-data-table`), commun au menu de l'ordinateur et au panneau du téléphone.
 * Filtre `multi` : demande les valeurs distinctes à la source à sa création (requête sans le filtre de sa colonne).
 */
@Component({
  selector: 'lc-column-filter',
  imports: [LcIconComponent, LcButtonComponent, LcSkeletonComponent, LcAlertComponent, LcDateRangeInputComponent],
  template: `
    @switch (column().filter?.type) {
      @case ('multi') {
        @if (values.isLoading()) {
          <div class="lc-column-filter__loading" aria-busy="true">
            <p class="lc-column-filter__loading-text"><lc-icon name="refresh-cw" class="lc-column-filter__spin" />{{ labels.loadingValues }}</p>
            @for (line of skeletonLines; track line) {
              <div class="lc-column-filter__skeleton-row">
                <lc-skeleton shape="rect" width="var(--lc-sys-icon-size-md)" height="var(--lc-sys-icon-size-md)" />
                <lc-skeleton class="lc-column-filter__skeleton-label" />
                <lc-skeleton width="var(--lc-sys-space-6)" />
              </div>
            }
          </div>
        } @else if (values.error()) {
          <lc-alert kind="error" [title]="labels.valuesError" [live]="true">
            <p class="lc-column-filter__error-text">{{ applied() ? labels.valuesErrorKept : labels.valuesErrorUnchanged }}</p>
            <button lcButton type="button" fillMode="outline" themeColor="neutral" size="small" class="lc-column-filter__retry" (click)="retry()">
              <lc-icon name="refresh-cw" />{{ retryLabel }}
            </button>
          </lc-alert>
        } @else if (!options().length) {
          <div class="lc-column-filter__empty">
            <lc-icon name="funnel-x" />
            <strong>{{ labels.noValues }}</strong>
            <p>{{ labels.noValuesHint }}</p>
          </div>
        } @else {
          @if (options().length > searchThreshold) {
            <div class="lc-column-filter__search">
              <lc-icon name="search" />
              <input class="lc-input" type="search" autocomplete="off" [id]="idPrefix() + '-search'" [attr.aria-label]="labels.searchValues"
                [placeholder]="labels.searchValues" [value]="search()" (input)="search.set($any($event.target).value)" />
            </div>
          }
          <div class="lc-column-filter__list" role="group" [attr.aria-label]="labels.valuesGroup(column().label)" (keydown)="onListKeydown($event)">
            @if (visible().length) {
              <label class="lc-column-filter__option lc-column-filter__option--all">
                <input type="checkbox" class="lc-checkbox" [checked]="allChecked()" [indeterminate]="someChecked()" [tabIndex]="current() === 0 ? 0 : -1"
                  (focus)="current.set(0)" (change)="toggleAll($any($event.target).checked)" />
                <span class="lc-column-filter__label">{{ search() ? labels.selectResults(visible().length) : labels.selectAll }}</span>
                <span class="lc-column-filter__count">{{ visibleTotal() }}</span>
              </label>
              @for (option of visible(); track option.value; let index = $index) {
                <label class="lc-column-filter__option" [class.lc-column-filter__option--zero]="!option.count">
                  <input type="checkbox" class="lc-checkbox" [checked]="checked().includes(option.value)" [tabIndex]="current() === index + 1 ? 0 : -1"
                    (focus)="current.set(index + 1)" (change)="toggle(option.value, $any($event.target).checked)" />
                  <span class="lc-column-filter__label">
                    @if (option.icon) {
                      <lc-icon [name]="option.icon" />
                    }
                    {{ option.label }}
                  </span>
                  <span class="lc-column-filter__count">{{ option.count }}</span>
                </label>
              }
            } @else {
              <p class="lc-column-filter__note">{{ labels.noMatch(search()) }}</p>
            }
          </div>
          <p class="lc-column-filter__note">{{ labels.valuesNote(options().length) }}</p>
        }
      }
      @case ('dateRange') {
        <lc-date-range-input class="lc-column-filter__range" [inputId]="idPrefix() + '-from'" [ariaLabel]="periodLabel()"
          [value]="interval()" (valueChange)="setInterval($event)" />
        <p class="lc-column-filter__note">{{ labels.datesNote }}</p>
      }
      @case ('text') {
        @if (textFilter(); as filter) {
          <div class="lc-column-filter__field">
            <label [for]="idPrefix() + '-text'">{{ filter.label }}</label>
            <input class="lc-input" type="search" autocomplete="off" [id]="idPrefix() + '-text'" [value]="text()"
              [attr.aria-describedby]="filter.hint ? idPrefix() + '-hint' : null"
              (input)="value.set($any($event.target).value)" (keydown.enter)="$event.preventDefault(); submitted.emit()" />
            @if (filter.hint) {
              <span class="lc-column-filter__note" [id]="idPrefix() + '-hint'">{{ filter.hint }}</span>
            }
          </div>
        }
      }
      @case ('single') {
        <fieldset class="lc-column-filter__radios">
          <legend class="lc-column-filter__hidden">{{ column().label }}</legend>
          @for (option of singleOptions(); track option.value) {
            <label class="lc-column-filter__option">
              <input type="radio" class="lc-radio" [name]="idPrefix() + '-single'" [checked]="value() === option.value" (change)="value.set(option.value)" />
              <span class="lc-column-filter__label">{{ option.label }}</span>
            </label>
          }
        </fieldset>
      }
    }
  `,
  styleUrl: './column-filter.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-column-filter' },
})
export class LcColumnFilterComponent<T> {
  protected readonly labels = inject(LC_LABELS).dataTable;
  private readonly rootLabels = inject(LC_LABELS);
  protected readonly retryLabel = this.rootLabels.retry;
  private readonly announcer = inject(LiveAnnouncer);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  readonly column = input.required<LcDataColumn<T>>();
  readonly source = input.required<LcDataSource<T>>();
  /** Requête des autres filtres : celui de la colonne en est retiré avant l'appel à `distinct`. */
  readonly context = input.required<LcTableQuery>();
  /** Un filtre est déjà appliqué à cette colonne (message d'erreur). */
  readonly applied = input(false);
  readonly idPrefix = input.required<string>();
  /** Place le focus sur la première commande à l'ouverture et à la fin du chargement. */
  readonly autofocus = input(true);
  /** Brouillon du filtre. */
  readonly value = model<LcFilterValue | undefined>();
  /** Entrée dans le champ texte. */
  readonly submitted = output<void>();
  readonly valuesLoaded = output<readonly LcDistinctValue[]>();

  protected readonly searchThreshold = SEARCH_THRESHOLD;
  protected readonly skeletonLines = [0, 1, 2, 3];
  protected readonly search = signal('');
  /** Case qui reçoit le focus par Tab (la liste est un seul arrêt de tabulation ; flèches pour circuler). Revient à 0 à chaque recherche. */
  protected readonly current = linkedSignal({ source: this.search, computation: () => 0 });

  private readonly distinctParams = computed(() => {
    const column = this.column();
    if (column.filter?.type !== 'multi') return undefined;
    const filters = { ...this.context().filters };
    delete filters[column.key];
    return { key: column.key, query: { ...this.context(), filters }, source: this.source() };
  }, { equal: (a, b) => a?.source === b?.source && JSON.stringify(a?.query) === JSON.stringify(b?.query) && a?.key === b?.key });

  protected readonly values = rxResource({
    params: () => this.distinctParams(),
    stream: ({ params }) => params.source.distinct(params.key, params.query),
  });

  protected readonly checked = computed(() => (Array.isArray(this.value()) ? (this.value() as readonly string[]) : []));

  /** Valeurs ordonnées ; une valeur cochée absente de la réponse reste, avec 0. */
  protected readonly options = computed<readonly ValueOption[]>(() => {
    const filter = this.column().filter;
    if (filter?.type !== 'multi' || !this.values.hasValue()) return [];
    const loaded = this.values.value();
    const known = new Set(loaded.map((entry) => entry.value));
    const all = [...loaded, ...this.checked().filter((value) => !known.has(value)).map((value) => ({ value, count: 0 }))];
    return orderDistinct(all, filter.order).map((entry) => ({
      value: entry.value,
      label: entry.label ?? filter.format?.(entry.value) ?? (entry.value || this.labels.emptyValue),
      count: entry.count,
      icon: filter.icon?.(entry.value) ?? null,
    }));
  });

  protected readonly visible = computed(() => {
    const query = normalizeText(this.search());
    return query ? this.options().filter((option) => normalizeText(option.label).includes(query)) : this.options();
  });
  protected readonly visibleTotal = computed(() => this.visible().reduce((sum, option) => sum + option.count, 0));
  private readonly visibleChecked = computed(() => this.visible().filter((option) => this.checked().includes(option.value)).length);
  protected readonly allChecked = computed(() => this.visible().length > 0 && this.visibleChecked() === this.visible().length);
  protected readonly someChecked = computed(() => this.visibleChecked() > 0 && !this.allChecked());

  private readonly rangeField = viewChild(LcDateRangeInputComponent);
  protected readonly periodLabel = computed(() => `${this.column().label} : ${this.rootLabels.datePeriod.toLowerCase()}`);
  private readonly range = computed<LcDateRange>(() => (isDateRange(this.value()) ? (this.value() as LcDateRange) : {}));
  protected readonly interval = linkedSignal<LcDateRange, LcDateInterval>({
    source: this.range,
    computation: (range, previous) => toDateInterval(range, previous?.value),
  });
  protected readonly text = computed(() => (typeof this.value() === 'string' ? (this.value() as string) : ''));
  protected readonly textFilter = computed(() => (this.column().filter?.type === 'text' ? (this.column().filter as { label: string; hint?: string }) : null));
  protected readonly singleOptions = computed(() => {
    const filter = this.column().filter;
    return filter?.type === 'single' ? filter.options : [];
  });

  /** Valeurs distinctes en cours de chargement (`aria-busy` du menu). */
  readonly loading = computed(() => this.values.isLoading());

  /** Le brouillon peut être appliqué : valeurs chargées et non vides (`multi`), période dans l'ordre (`dateRange`). */
  readonly canApply = computed(() => {
    const type = this.column().filter?.type;
    if (type === 'multi') return this.values.hasValue() && !this.values.isLoading() && this.options().length > 0;
    if (type === 'dateRange') return !this.rangeField()?.orderInvalid();
    return true;
  });

  constructor() {
    effect(() => {
      const status = this.values.status();
      const label = untracked(() => this.column().label);
      if (status === 'loading' || status === 'reloading') {
        this.announcer.announce(this.labels.announceLoadingValues(label), 'polite');
      } else if (status === 'resolved') {
        const count = untracked(() => this.options().length);
        this.announcer.announce(count ? this.labels.valuesAvailable(count) : this.labels.noValues, 'polite');
        untracked(() => this.valuesLoaded.emit(this.values.value() ?? []));
        this.focusFirstLater();
      } else if (status === 'error') {
        afterNextRender(() => this.host.querySelector<HTMLElement>('.lc-column-filter__retry')?.focus(), { injector: this.injector });
      }
    });
    afterNextRender(() => {
      if (this.column().filter?.type !== 'multi') this.focusFirst();
    });
  }

  /** Première zone du champ de période ; utilisé par le parent pour placer le focus sur une période refusée. */
  focusDate(): void {
    this.rangeField()?.focus();
  }

  protected retry(): void {
    this.announcer.announce(this.labels.retrying, 'polite');
    this.host.closest<HTMLElement>('[tabindex="-1"]')?.focus();
    this.values.reload();
  }

  protected toggle(value: string, on: boolean): void {
    const rest = this.checked().filter((candidate) => candidate !== value);
    this.value.set(on ? [...rest, value] : rest);
  }

  protected toggleAll(on: boolean): void {
    const visible = this.visible().map((option) => option.value);
    const rest = this.checked().filter((value) => !visible.includes(value));
    this.value.set(on ? [...rest, ...visible] : rest);
  }

  protected setInterval(interval: LcDateInterval): void {
    this.interval.set(interval);
    this.value.set(fromDateInterval(interval));
  }

  /** Flèches haut et bas, Début et Fin : d'une case à l'autre. */
  protected onListKeydown(event: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const boxes = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
    const index = boxes.indexOf(event.target as HTMLInputElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? boxes.length - 1
      : Math.min(boxes.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)));
    boxes[next].focus();
    boxes[next].scrollIntoView?.({ block: 'nearest' });
  }

  private focusFirstLater(): void {
    afterNextRender(() => this.focusFirst(), { injector: this.injector });
  }

  /** Focus sur la première commande, sauf si le focus est déjà dans le filtre. */
  private focusFirst(): void {
    if (!this.autofocus()) return;
    if (this.column().filter?.type === 'dateRange') {
      this.focusDate();
      return;
    }
    const active = this.host.ownerDocument.activeElement;
    if (active && active !== this.host && this.host.contains(active)) return;
    this.host.querySelector<HTMLElement>(
      'input[type=radio]:checked, input[type=search], input:not([disabled]), button:not([disabled])',
    )?.focus();
  }
}
