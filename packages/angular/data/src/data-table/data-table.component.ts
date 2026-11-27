import { CdkTrapFocus, LiveAnnouncer } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  AnimationCallbackEvent, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, ViewEncapsulation, afterNextRender, booleanAttribute, computed, contentChildren,
  effect, inject, input, linkedSignal, model, signal, untracked, viewChild,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  LC_LABELS, LC_LOCALE, LC_OVERLAY_CLOSING_CLASS, LcButtonComponent, LcFlipDirective, LcFormatService, LcIconComponent, LcRevealDirective, LcSkeletonComponent, isoToLocalDate,
  lcAnimate, lcCssMs, lcDetachAnimated, lcFlipPlay, lcFlipRead, lcPrefersReducedMotion, lcUniqueId,
} from '@lionelcointot/ui-angular';
import { LcAlertComponent, LcEmptyStateComponent } from '@lionelcointot/ui-angular/feedback';
import { LcSheetComponent, LcTooltipDirective } from '@lionelcointot/ui-angular/overlay';
import { LcCellDirective } from '../table/cell.directive';
import { LC_TABLE_MAX_ROWS, LcSort, columnAlign, nextSort } from '../table/table-model';
import { ariaSort, cellText, sortIcon } from '../table/table-shared';
import { LcColumnFilterComponent, LcNativeDatePickerDirective } from './column-filter.component';
import {
  LC_EMPTY_QUERY, LcDataColumn, LcDataSource, LcDateRange, LcDistinctValue, LcFilterValue, LcPage, LcTableQuery,
  cleanFilterValue, isDateRangeInverted, isFilterActive, lcLocalSource, withFilter,
} from './data-table-model';

/** Lignes qui entrent en cascade à l'ouverture et après un changement de filtre ; les suivantes apparaissent sans animation. */
const REVEAL_ROWS = 8;

/** Sous cette largeur (768 px), le tableau passe en cartes : mêmes ruptures que le CSS. */
const NARROW = '(max-width: 47.99em)';

/** Menu : sous l'entonnoir, calé à droite puis à gauche ; au-dessus s'il manque de place. */
const MENU_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', panelClass: 'lc-overlay--above' },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', panelClass: 'lc-overlay--above' },
];

interface HeaderView<T> {
  readonly column: LcDataColumn<T>;
  /** Libellé sans son dernier mot (peut passer à la ligne) et dernier mot (reste collé aux icônes). */
  readonly labelHead: string;
  readonly labelTail: string;
  readonly active: boolean;
  readonly sortState: 'none' | 'asc' | 'desc';
  readonly ariaSort: 'ascending' | 'descending' | null;
  readonly sortIcon: string;
  readonly funnelLabel: string;
  readonly funnelTip: string;
}

interface ChipView<T> {
  readonly column: LcDataColumn<T>;
  readonly key: string;
  readonly label: string;
  readonly summary: string;
  readonly shortSummary: string;
}

/**
 * Tableau de données filtrable par colonne. L'application déclare ses colonnes (`filter` : `multi`, `dateRange`, `text`, `single`),
 * fournit une source (tableau local, ou `rows` et `distinct` côté serveur) et reçoit la requête par `[(query)]`.
 * Ordinateur : entonnoir dans l'en-tête et menu ancré ; ligne « N sur total » si un filtre est actif.
 * Sous 768 px : cartes, bouton « Filtres (N) », panneau plein écran, pastilles (`chips`).
 * Cellules personnalisées par `<ng-template lcCell="cle" let-row>` (`let-column` y reçoit la `LcDataColumn`). Limité à 2 000 lignes affichées (ADR-0004).
 */
@Component({
  selector: 'lc-data-table',
  imports: [
    NgTemplateOutlet, CdkConnectedOverlay, CdkTrapFocus, LcIconComponent, LcButtonComponent, LcSkeletonComponent, LcAlertComponent,
    LcEmptyStateComponent, LcSheetComponent, LcTooltipDirective, LcColumnFilterComponent,
    LcNativeDatePickerDirective, LcRevealDirective, LcFlipDirective,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css',
  // Le menu (panneau CDK) et le SVG des icônes sont hors de la vue encapsulée : classes préfixées `lc-data-table__`.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-data-table',
    '[class.lc-data-table--chips-always]': "chips() === 'always'",
    '[class.lc-data-table--chips-never]': "chips() === 'never'",
  },
})
export class LcDataTableComponent<T> {
  protected readonly labels = inject(LC_LABELS);
  protected readonly text = this.labels.dataTable;
  private readonly format = inject(LcFormatService);
  private readonly locale = inject(LC_LOCALE).locale;
  private readonly announcer = inject(LiveAnnouncer);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  /** Lignes locales (le kit filtre, compte et trie) ou source serveur. */
  readonly source = input.required<LcDataSource<T> | readonly T[]>();
  readonly columns = input.required<readonly LcDataColumn<T>[]>();
  readonly trackBy = input.required<(row: T) => unknown>();
  /** Légende du tableau ; le nombre de lignes et les filtres actifs y sont ajoutés. */
  readonly caption = input.required<string>();
  readonly captionHidden = input(false, { transform: booleanAttribute });
  /** Filtres et tri ; émis (`queryChange`) à chaque application, effacement, retrait de pastille et tri. */
  readonly query = model<LcTableQuery>(LC_EMPTY_QUERY);
  /** Pastilles des filtres actifs : `auto` sous 768 px seulement, `always`, `never`. */
  readonly chips = input<'auto' | 'always' | 'never'>('auto');
  /** Message du tableau vide sans filtre (défaut : « Aucune donnée »). */
  readonly emptyMessage = input<string>();

  protected readonly uid = lcUniqueId('data-table');
  protected readonly menuPositions = MENU_POSITIONS;
  protected readonly cellTemplates = computed(() => new Map(this.cells().map((cell) => [cell.lcCell(), cell.template])));
  private readonly cells = contentChildren(LcCellDirective);
  protected readonly narrow = toSignal(inject(BreakpointObserver).observe(NARROW).pipe(map((state) => state.matches)), { initialValue: false });

  protected readonly dataSource = computed<LcDataSource<T>>(() => {
    const source = this.source();
    return Array.isArray(source) ? lcLocalSource(source as readonly T[], this.columns()) : (source as LcDataSource<T>);
  });

  protected readonly result = rxResource({
    params: () => ({ source: this.dataSource(), query: this.query() }),
    stream: ({ params }) => params.source.rows(params.query),
  });
  /** Dernière page reçue : gardée pendant un rechargement ou après une erreur. */
  private readonly page = linkedSignal<LcPage<T> | undefined, LcPage<T> | undefined>({
    source: () => (this.result.hasValue() ? this.result.value() : undefined),
    computation: (page, previous) => page ?? previous?.value,
  });
  protected readonly loaded = computed(() => this.page() !== undefined);
  protected readonly count = computed(() => this.page()?.rows.length ?? 0);
  protected readonly total = computed(() => this.page()?.total ?? 0);
  protected readonly rows = computed(() => (this.page()?.rows ?? []).slice(0, LC_TABLE_MAX_ROWS));
  protected readonly truncated = computed(() => this.count() > LC_TABLE_MAX_ROWS);

  protected readonly filterColumns = computed(() => this.columns().filter((column) => column.filter));
  protected readonly sortableColumns = computed(() => this.columns().filter((column) => column.sortable));
  protected readonly activeColumns = computed(() => this.filterColumns().filter((column) => isFilterActive(this.query().filters[column.key])));
  /** Libellés des valeurs `multi` reçus de `distinct` (résumés des pastilles et des entonnoirs). */
  private readonly valueLabels = signal<Readonly<Record<string, ReadonlyMap<string, string>>>>({});

  /** Colonnes visibles sur ordinateur : étendue des lignes d'état (chargement, erreur, vide). */
  protected readonly span = computed(() => this.columns().filter((column) => !column.cardOnly).length);

  protected readonly minWidth = computed(() => {
    const parts = this.columns().filter((column) => !column.cardOnly).map((column) => column.width ?? column.minWidth).filter(Boolean);
    return parts.length ? `calc(${parts.join(' + ')})` : null;
  });

  protected readonly headers = computed<readonly HeaderView<T>[]>(() => this.columns().map((column) => {
    const value = this.query().filters[column.key];
    const active = !!column.filter && isFilterActive(value);
    const sort = this.query().sort;
    const direction = sort?.columnId === column.key ? sort.direction : null;
    const sortState = direction ?? 'none';
    const summary = active ? this.summary(column, value) : '';
    const state = !active ? null : column.filter?.type === 'multi' ? this.text.valuesChosen((value as readonly string[]).length) : summary;
    const cut = column.label.lastIndexOf(' ') + 1;
    return {
      column, active, sortState, labelHead: column.label.slice(0, cut), labelTail: column.label.slice(cut),
      ariaSort: ariaSort(direction),
      sortIcon: sortIcon(direction),
      funnelLabel: this.text.filterColumn(column.label, state),
      funnelTip: active ? this.text.activeFilterTooltip(this.summary(column, value, true)) : this.text.filterTooltip,
    };
  }));

  protected readonly chipViews = computed<readonly ChipView<T>[]>(() => this.activeColumns().map((column) => {
    const value = this.query().filters[column.key];
    return {
      column, key: column.key, label: column.chipLabel ?? column.label,
      summary: this.summary(column, value), shortSummary: this.summary(column, value, true),
    };
  }));

  protected readonly captionText = computed(() => {
    const filters = this.chipViews().map((chip) => `${chip.column.label} (${chip.summary})`).join(', ');
    return `${this.caption()} : ${this.text.rows(this.count())}, ${this.text.captionFilters(filters || null)}.`;
  });

  protected readonly sortValue = computed(() => {
    const sort = this.query().sort;
    return sort ? `${sort.columnId}:${sort.direction}` : '';
  });

  // ---------- Menu (ordinateur) ----------
  protected readonly menuColumn = signal<LcDataColumn<T> | null>(null);
  protected readonly menuOrigin = signal<HTMLElement>(this.host);
  protected readonly menuDraft = signal<LcFilterValue | undefined>(undefined);
  private readonly menuFilter = viewChild<LcColumnFilterComponent<T>>('menuFilter');
  private readonly menuOverlay = viewChild(CdkConnectedOverlay);
  protected readonly menuCanClear = computed(() => {
    const column = this.menuColumn();
    return !!column && (isFilterActive(this.query().filters[column.key]) || isFilterActive(this.menuDraft()));
  });

  // ---------- Panneau (téléphone) ----------
  /** Contenu monté : de l'ouverture jusqu'à `closed` (fin de la sortie de la feuille). */
  protected readonly panelOpen = signal(false);
  /** État ouvert de la feuille : faux dès l'intention de fermer, la sortie joue encore. */
  protected readonly panelVisible = signal(false);
  protected readonly panelSection = signal<string | null>(null);
  /** Sections dépliées au moins une fois depuis l'ouverture : leur filtre reste rendu pendant le repli animé. */
  private readonly panelOpened = signal<ReadonlySet<string>>(new Set());
  protected readonly panelDraft = signal<Readonly<Record<string, LcFilterValue>>>({});
  protected readonly panelQuery = computed<LcTableQuery>(() => {
    const filters: Record<string, LcFilterValue> = {};
    for (const [key, value] of Object.entries(this.panelDraft())) {
      const clean = cleanFilterValue(value);
      if (clean !== undefined && !(typeof clean === 'object' && !Array.isArray(clean) && isDateRangeInverted(clean as LcDateRange))) filters[key] = clean;
    }
    return { filters, sort: this.query().sort };
  });
  private readonly panelResult = rxResource({
    params: () => (this.panelOpen() ? { source: this.dataSource(), query: this.panelQuery() } : undefined),
    stream: ({ params }) => params.source.rows(params.query),
  });
  protected readonly panelCount = computed(() => (this.panelResult.hasValue() ? this.panelResult.value().rows.length : null));
  protected readonly panelHasDraft = computed(() => Object.values(this.panelDraft()).some((value) => isFilterActive(value)));
  protected readonly panelSections = computed(() => this.filterColumns().map((column) => {
    const value = this.panelDraft()[column.key];
    const active = isFilterActive(value);
    const open = this.panelSection() === column.key;
    return { column, open, rendered: open || this.panelOpened().has(column.key), active, summary: active ? this.summary(column, value) : this.text.all };
  }));

  /** Début de l'annonce faite quand la page demandée arrive (« Filtre État appliqué. ») ; le nombre de lignes la complète. */
  private pendingAnnouncement: string | null = null;
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  /** Filtres des lignes affichées (`null` : rien encore affiché) : un changement de filtre reconstruit la liste, un tri ou une suppression la fait glisser (`lcFlip`). */
  private shownFilters: string | null = null;
  /** Les lignes qui apparaissent le font en cascade : à l'ouverture et après un changement de filtre, pas après un tri ou une suppression. */
  private readonly cascading = signal(true);
  /** La cascade qui suit un changement de filtre a sa courbe (`entrance`). */
  protected readonly refill = signal(false);
  /** Liste vide pendant `table.refill-delay` après un changement de filtre ; les lignes sont ensuite recréées, aucune n'est conservée. */
  protected readonly holding = signal(false);
  private holdTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.holdTimer));
    // Avant le rendu des lignes (les effets de composant précèdent son gabarit) : un changement de filtre vide la liste d'un coup.
    effect(() => {
      if (!this.loaded()) return;
      this.rows();
      untracked(() => {
        const filters = JSON.stringify(this.query().filters);
        const first = this.shownFilters === null;
        const changed = !first && filters !== this.shownFilters;
        this.shownFilters = filters;
        this.cascading.set(first || changed);
        this.refill.set(changed);
        const delay = changed && !lcPrefersReducedMotion() ? lcCssMs(getComputedStyle(this.host), '--lc-table-refill-delay') : 0;
        if (!(delay > 0)) return; // sans délai (réduction de mouvement…) : les lignes se remplacent à la volée
        // Le corps est masqué le temps du rendu : les lignes retirées n'ont aucune sortie à jouer (`lcReveal`), la liste est vide d'un coup.
        const body = this.body()?.nativeElement;
        if (body) {
          body.hidden = true;
          afterNextRender(() => (body.hidden = false), { injector: this.injector });
        }
        this.holding.set(true);
        clearTimeout(this.holdTimer);
        this.holdTimer = setTimeout(() => this.holding.set(false), delay);
      });
    });
    effect(() => {
      if (!this.result.hasValue()) return;
      const count = this.result.value().rows.length;
      if (this.pendingAnnouncement === null) return;
      const rows = this.text.rows(count);
      this.announcer.announce(`${this.pendingAnnouncement} ${rows.charAt(0).toUpperCase()}${rows.slice(1)}.`, 'polite');
      this.pendingAnnouncement = null;
    });
    effect(() => {
      if (this.narrow() && untracked(() => this.menuColumn())) this.closeMenu(false);
    });
  }

  /** Rang de cascade d'une ligne (les 8 premières, à l'ouverture et après un changement de filtre), sinon `null` : pas d'entrée. */
  protected cascadeIndex(index: number): number | null {
    return this.cascading() && index < REVEAL_ROWS ? index : null;
  }

  /** Fondu de sortie d'une pastille (`animate.leave`) : elle sort du flux à sa place, la rangée se resserre aussitôt et sa hauteur finale est connue. */
  protected fadeOutChip({ target, animationComplete }: AnimationCallbackEvent): void {
    if (lcPrefersReducedMotion()) return animationComplete();
    const chip = target as HTMLElement;
    const { offsetLeft, offsetTop, offsetWidth } = chip;
    chip.setAttribute('data-leaving', '');
    Object.assign(chip.style, { left: `${offsetLeft}px`, top: `${offsetTop}px`, width: `${offsetWidth}px` });
    lcAnimate(chip, [{ opacity: 1 }, { opacity: 0 }], { duration: 'fast', easing: '--lc-overlay-easing', fill: 'forwards' }).finished.catch(() => undefined).then(animationComplete);
  }

  /** Applique un changement qui déplace le bloc de la liste (rangée de pastilles qui se resserre) : le bloc entier glisse d'un trait de sa place d'avant à sa place d'après. */
  private slideList(change: () => void): void {
    const scroll = this.host.querySelector<HTMLElement>('.lc-data-table__scroll');
    const before = lcFlipRead(scroll ? [scroll] : []);
    change();
    if (scroll) afterNextRender(() => lcFlipPlay(before, lcFlipRead([scroll])), { injector: this.injector });
  }

  protected cellText(column: LcDataColumn<T>, row: T): string {
    return cellText(this.format, column, row);
  }

  protected align(column: LcDataColumn<T>): string {
    return columnAlign(column);
  }

  protected rememberLabels(key: string, values: readonly LcDistinctValue[]): void {
    const labels = new Map(values.filter((value) => value.label).map((value) => [value.value, value.label as string]));
    if (labels.size) this.valueLabels.update((all) => ({ ...all, [key]: labels }));
  }

  // ---------- Tri ----------
  protected toggleSort(column: LcDataColumn<T>): void {
    this.setQuery({ ...this.query(), sort: nextSort(this.query().sort, column.key) });
  }

  protected onSortSelect(value: string): void {
    const [columnId, direction] = value.split(':');
    const sort: LcSort | null = columnId ? { columnId, direction: direction === 'desc' ? 'desc' : 'asc' } : null;
    this.setQuery({ ...this.query(), sort });
  }

  // ---------- Menu ----------
  protected toggleMenu(column: LcDataColumn<T>, button: HTMLElement): void {
    const closing = this.menuElement()?.classList.contains(LC_OVERLAY_CLOSING_CLASS);
    this.menuElement()?.classList.remove(LC_OVERLAY_CLOSING_CLASS);
    if (this.menuColumn()?.key === column.key) {
      if (!closing) this.closeMenu(true);
      return;
    }
    this.menuOrigin.set(button);
    this.menuDraft.set(this.query().filters[column.key]);
    this.menuColumn.set(column);
    // Le corps du filtre place lui-même le focus sur sa première commande ; sinon (chargement), le focus va sur le menu.
    afterNextRender(() => {
      const menu = document.getElementById(`${this.uid}-menu`);
      if (menu && !menu.contains(document.activeElement)) menu.focus();
    }, { injector: this.injector });
  }

  protected closeMenu(returnFocus: boolean): void {
    const column = this.menuColumn();
    if (!column || this.menuElement()?.classList.contains(LC_OVERLAY_CLOSING_CLASS)) return;
    if (returnFocus) this.focusLater(`${this.uid}-funnel-${column.key}`);
    // Fondu de sortie : la colonne reste affichée jusqu'à l'événement `detach` du panneau, qui la vide.
    const overlay = this.menuOverlay()?.overlayRef;
    if (overlay?.hasAttached()) void lcDetachAnimated(overlay);
    else this.menuColumn.set(null);
  }

  private menuElement(): HTMLElement | undefined {
    return this.menuOverlay()?.overlayRef?.overlayElement;
  }

  protected onMenuOutsideClick(event: MouseEvent): void {
    if (this.menuOrigin().contains(event.target as Node)) return;
    this.closeMenu(false);
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.closeMenu(true);
  }

  protected applyMenu(): void {
    const column = this.menuColumn();
    const filter = this.menuFilter();
    if (!column || !filter) return;
    if (!filter.canApply()) {
      if (column.filter?.type === 'dateRange') filter.focusDate();
      return;
    }
    const cleared = cleanFilterValue(this.menuDraft()) === undefined;
    this.setQuery(withFilter(this.query(), column.key, this.menuDraft()), cleared ? this.text.announceCleared(column.label) : this.text.announceApplied(column.label));
    this.closeMenu(true);
  }

  protected clearMenu(): void {
    const column = this.menuColumn();
    if (!column) return;
    this.setQuery(withFilter(this.query(), column.key, undefined), this.text.announceCleared(column.label));
    this.closeMenu(true);
  }

  // ---------- Résumé, pastilles ----------
  protected clearAll(): void {
    this.slideList(() => this.setQuery({ ...this.query(), filters: {} }, this.text.announceAllCleared));
    const first = this.filterColumns()[0];
    this.focusLater(this.narrow() || !first ? `${this.uid}-filters` : `${this.uid}-funnel-${first.key}`);
  }

  protected editChip(column: LcDataColumn<T>): void {
    if (this.narrow()) {
      this.openPanel(column.key);
      return;
    }
    const button = document.getElementById(`${this.uid}-funnel-${column.key}`);
    if (button) this.toggleMenu(column, button);
  }

  protected removeChip(key: string): void {
    const keys = this.chipViews().map((chip) => chip.key);
    const index = keys.indexOf(key);
    const next = keys[index + 1] ?? keys[index - 1];
    const column = this.columns().find((candidate) => candidate.key === key);
    this.slideList(() => this.setQuery(withFilter(this.query(), key, undefined), this.text.announceRemoved(column?.label ?? key)));
    this.focusLater(next ? `${this.uid}-chip-${next}` : `${this.uid}-filters`);
  }

  // ---------- Panneau ----------
  protected openPanel(section: string | null = null): void {
    this.closeMenu(false);
    this.panelDraft.set({ ...this.query().filters });
    this.panelOpened.set(new Set());
    this.showSection(section);
    this.panelOpen.set(true);
    this.panelVisible.set(true); // réouverture pendant la sortie comprise : la feuille repart de sa position
  }

  /** Fin de la sortie de la feuille (croix, Échap, geste, « Afficher » : rien n'est appliqué ici) : le contenu est démonté. */
  protected onPanelClosed(): void {
    if (!this.panelOpen()) return;
    this.panelOpen.set(false);
    this.panelSection.set(null);
    this.focusLater(`${this.uid}-filters`);
  }

  protected toggleSection(key: string): void {
    this.showSection(this.panelSection() === key ? null : key);
  }

  private showSection(key: string | null): void {
    this.panelSection.set(key);
    if (key) this.panelOpened.update((opened) => new Set(opened).add(key));
  }

  protected setDraft(key: string, value: LcFilterValue | undefined): void {
    this.panelDraft.update((draft) => {
      const next = { ...draft };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  protected clearPanel(): void {
    this.panelDraft.set({});
    this.announcer.announce(this.text.announceDraftCleared, 'polite');
  }

  protected applyPanel(): void {
    const inverted = this.filterColumns().find((column) => column.filter?.type === 'dateRange'
      && isDateRangeInverted(this.panelDraft()[column.key] as LcDateRange | undefined));
    if (inverted) {
      this.showSection(inverted.key);
      this.focusLater(`${this.uid}-panel-${inverted.key}-from`);
      return;
    }
    this.setQuery({ ...this.query(), filters: this.panelQuery().filters }, this.text.announceFiltersApplied);
    this.panelVisible.set(false);
  }

  // ---------- Outils ----------
  /** Résumé lisible d'un filtre ; `short` abrège une liste au-delà de deux valeurs (« A, B +2 »). */
  private summary(column: LcDataColumn<T>, value: LcFilterValue | undefined, short = false): string {
    const filter = column.filter;
    if (!filter || value === undefined) return '';
    switch (filter.type) {
      case 'multi': {
        const known = this.valueLabels()[column.key];
        const names = (value as readonly string[]).map((entry) => filter.format?.(entry) ?? known?.get(entry) ?? (entry || this.text.emptyValue));
        return short && names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
      }
      case 'text':
        return this.text.quoted(String(value).trim());
      case 'single':
        return filter.options.find((option) => option.value === value)?.label ?? String(value);
      case 'dateRange': {
        const range = value as LcDateRange;
        const day = new Intl.DateTimeFormat(this.locale, { day: 'numeric', month: 'short' });
        const from = range.from ? isoToLocalDate(range.from) : null;
        const to = range.to ? isoToLocalDate(range.to) : null;
        if (from && to) return day.formatRange(from, to);
        return from ? this.text.since(day.format(from)) : to ? this.text.until(day.format(to)) : '';
      }
    }
  }

  private setQuery(query: LcTableQuery, announcement: string | null = null): void {
    this.pendingAnnouncement = announcement;
    this.query.set(query);
  }

  private focusLater(id: string): void {
    afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
  }
}
