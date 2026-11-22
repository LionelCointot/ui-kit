import { CdkTrapFocus, LiveAnnouncer } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  AnimationCallbackEvent, ChangeDetectionStrategy, Component, ElementRef, Injector, ViewEncapsulation, afterNextRender, booleanAttribute, computed, contentChildren,
  effect, inject, input, linkedSignal, model, signal, untracked, viewChild,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  LC_LABELS, LC_LOCALE, LC_OVERLAY_CLOSING_CLASS, LcButtonComponent, LcFormatService, LcIconComponent, LcSkeletonComponent, isoToLocalDate,
  lcDetachAnimated, lcPrefersReducedMotion, lcUniqueId,
} from '@lionelcointot/ui-angular';
import { LcAlertComponent, LcEmptyStateComponent } from '@lionelcointot/ui-angular/feedback';
import { LcSheetComponent, LcTooltipDirective } from '@lionelcointot/ui-angular/overlay';
import { LcCellDirective } from '../table/cell.directive';
import { LC_TABLE_MAX_ROWS, LcSort, columnAlign, nextSort } from '../table/table-model';
import { LcColumnFilterComponent, LcNativeDatePickerDirective } from './column-filter.component';
import {
  LC_EMPTY_QUERY, LcDataColumn, LcDataSource, LcDateRange, LcDistinctValue, LcFilterValue, LcPage, LcTableQuery,
  cleanFilterValue, isDateRangeInverted, isFilterActive, lcLocalSource, withFilter,
} from './data-table-model';

/** Cartes du téléphone qui entrent en cascade au premier affichage ; les suivantes apparaissent sans animation. */
const REVEAL_CARDS = 8;

/** Sous cette largeur (768 px), le tableau passe en cartes : mêmes ruptures que le CSS. */
const NARROW = '(max-width: 47.99em)';

/** Écart minimal (px) à partir duquel une ligne est considérée déplacée. */
const MOVE_THRESHOLD_PX = 0.5;

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
    LcNativeDatePickerDirective,
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
    const sortState = sort?.columnId === column.key ? sort.direction : 'none';
    const summary = active ? this.summary(column, value) : '';
    const state = !active ? null : column.filter?.type === 'multi' ? this.text.valuesChosen((value as readonly string[]).length) : summary;
    const cut = column.label.lastIndexOf(' ') + 1;
    return {
      column, active, sortState, labelHead: column.label.slice(0, cut), labelTail: column.label.slice(cut),
      ariaSort: sortState === 'asc' ? 'ascending' : sortState === 'desc' ? 'descending' : null,
      sortIcon: sortState === 'asc' ? 'arrow-up' : sortState === 'desc' ? 'arrow-down' : 'arrow-up-down',
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
  /** Vrai dès qu'une page a été affichée : la cascade du premier affichage est finie, les changements suivants animent la différence. */
  private readonly settled = signal(false);
  private listShown = false;
  /** Positions des lignes avant le dernier changement : le glissement (un seul par changement) part de là. */
  private diff: ReadonlyMap<Element, number> | undefined;
  /** Lignes retirées encore en fondu de sortie : le glissement attend leur retrait, les lignes conservées restent à leur place d'avant. */
  private leaving = 0;
  /** Lignes ajoutées masquées pendant le fondu des sortantes : elles gardent leur masquage jusqu'au glissement, qui les fait apparaître. */
  private readonly hidden = new WeakSet<Element>();

  constructor() {
    // Avant le rendu des lignes (les effets de composant précèdent son gabarit) : positions actuelles, puis glissement après le rendu.
    effect(() => {
      if (!this.loaded()) return;
      this.rows();
      untracked(() => {
        const before = this.listShown ? this.rowTops() : null;
        this.listShown = true;
        if (!before) return;
        this.settled.set(true);
        this.diff = before;
        afterNextRender(() => (this.leaving ? this.freeze(before) : this.glide()), { injector: this.injector });
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

  /** Rang de cascade d'une carte du téléphone (8 premières, premier affichage), sinon `null`. */
  protected cascadeIndex(index: number): number | null {
    return this.narrow() && !this.settled() && index < REVEAL_CARDS ? index : null;
  }

  /** Fondu de sortie d'une ligne (`animate.leave`) ; quand la dernière a disparu, les lignes conservées glissent d'un trait. Sans animation (réduction de mouvement…) : retrait immédiat. */
  protected fadeOut({ target, animationComplete }: AnimationCallbackEvent): void {
    const timing = this.timing('--lc-overlay-exit-duration', '--lc-overlay-easing');
    if (!timing) return animationComplete();
    target.setAttribute('data-leaving', '');
    this.leaving++;
    target.animate({ opacity: [1, 0] }, { ...timing, fill: 'forwards' }).finished.catch(() => undefined).then(() => {
      animationComplete();
      requestAnimationFrame(() => {
        if (--this.leaving === 0) this.glide();
      });
    });
  }

  /** Fondu de sortie d'une pastille (`animate.leave`) : elle sort du flux à sa place, la rangée se resserre aussitôt et sa hauteur finale est connue. */
  protected fadeOutChip({ target, animationComplete }: AnimationCallbackEvent): void {
    const timing = this.timing('--lc-sys-duration-fast', '--lc-overlay-easing');
    if (!timing) return animationComplete();
    const chip = target as HTMLElement;
    const { offsetLeft, offsetTop, offsetWidth } = chip;
    chip.setAttribute('data-leaving', '');
    Object.assign(chip.style, { left: `${offsetLeft}px`, top: `${offsetTop}px`, width: `${offsetWidth}px` });
    chip.animate({ opacity: [1, 0] }, { ...timing, fill: 'forwards' }).finished.catch(() => undefined).then(animationComplete);
  }

  /** Applique un changement qui déplace le bloc de la liste (rangée de pastilles qui se resserre) : le bloc entier glisse d'un trait de sa place d'avant à sa place d'après. */
  private slideList(change: () => void): void {
    const scroll = this.host.querySelector<HTMLElement>('.lc-data-table__scroll');
    const from = scroll?.getBoundingClientRect().top;
    change();
    if (!scroll || from === undefined) return;
    afterNextRender(() => {
      const move = this.timing('--lc-list-move-duration', '--lc-list-move-easing');
      const delta = from - scroll.getBoundingClientRect().top;
      if (move && Math.abs(delta) >= MOVE_THRESHOLD_PX) scroll.animate({ transform: [`translateY(${delta}px)`, 'none'] }, move);
    }, { injector: this.injector });
  }

  /** Durée et courbe d'une animation de liste lues en CSS calculé ; `null` sans Web Animations API ou en réduction de mouvement (la règle globale ne la couvre pas). */
  private timing(duration: string, easing: string): KeyframeAnimationOptions | null {
    if (typeof this.host.animate !== 'function' || lcPrefersReducedMotion()) return null;
    const style = getComputedStyle(this.host);
    const raw = style.getPropertyValue(duration).trim();
    const ms = parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000);
    if (!(ms > 0)) return null;
    return { duration: ms, easing: style.getPropertyValue(easing).trim() || undefined };
  }

  /** Position verticale de chaque ligne (hors lignes en fondu de sortie), glissement du bloc de la liste (`slideList`) compris : il part déjà de l'ancienne place, le départ de la ligne s'en déduit donc tel quel. `layout` annule d'abord animations et décalages posés des lignes, pour lire la mise en page. */
  private rowTops(layout = false): Map<Element, number> {
    const rows = [...this.host.querySelectorAll<HTMLElement>('tbody tr:not(.lc-data-table__state):not([data-leaving])')];
    if (layout) {
      rows.forEach((row) => {
        row.getAnimations?.().forEach((animation) => animation.cancel());
        row.style.transform = '';
        if (!this.hidden.has(row)) row.style.opacity = '';
      });
    }
    return new Map(rows.map((row) => [row, row.getBoundingClientRect().top]));
  }

  /** Des lignes sortent encore : les conservées restent à leur place d'avant (transform inverse) et les ajoutées sont masquées, jusqu'au glissement. */
  private freeze(before: ReadonlyMap<Element, number>): void {
    for (const [row, top] of this.rowTops(true)) {
      const from = before.get(row);
      const style = (row as HTMLElement).style;
      if (from === undefined || this.hidden.has(row)) {
        this.hidden.add(row);
        style.opacity = '0';
      } else if (Math.abs(from - top) >= MOVE_THRESHOLD_PX) style.transform = `translateY(${from - top}px)`;
    }
  }

  private glide(): void {
    const before = this.diff;
    this.diff = undefined;
    if (before) this.animateDiff(before);
  }

  /** FLIP : lignes conservées glissent de leur ancienne place à la nouvelle ; lignes ajoutées apparaissent en fondu. */
  private animateDiff(before: ReadonlyMap<Element, number>): void {
    const move = this.timing('--lc-list-move-duration', '--lc-list-move-easing');
    const enter = this.timing('--lc-overlay-enter-duration', '--lc-overlay-easing');
    for (const [row, top] of this.rowTops(true)) {
      const from = before.get(row);
      if (from === undefined || this.hidden.has(row)) {
        if (enter) row.animate({ opacity: [0, 1] }, enter);
        this.hidden.delete(row);
        (row as HTMLElement).style.opacity = '';
      } else if (move && Math.abs(from - top) >= MOVE_THRESHOLD_PX) {
        row.animate({ transform: [`translateY(${from - top}px)`, 'none'] }, move);
      }
    }
  }

  protected cellText(column: LcDataColumn<T>, row: T): string {
    return this.format.format(column.value?.(row), column.format);
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
