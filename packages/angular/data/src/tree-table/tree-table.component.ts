import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, afterNextRender, ElementRef, TemplateRef, booleanAttribute, computed, contentChildren, effect, inject, input, isDevMode,
  linkedSignal, model, output, signal, viewChild,
} from '@angular/core';
import { LC_LABELS, LC_REVEAL_ANIMATION, LcFormatService, LcIconComponent, LcSkeletonComponent, LcStaggerDirective, lcDataState, lcPrefersReducedMotion, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcCellDirective } from '../table/cell.directive';
import { LcSort, LcTableColumn, nextSort } from '../table/table-model';
import { ariaSort, cellClass, cellText, sortDirection, sortIcon } from '../table/table-shared';
import { LC_TREE_TABLE_MAX_ROWS, LcTreeTableRow, buildTreeTableModel } from './tree-table-model';

/**
 * Tableau hiérarchique (motif ARIA `treegrid`) : un seul arrêt de tabulation dans les lignes, flèches haut et bas,
 * droite (déplie ou descend au premier enfant), gauche (replie ou remonte au parent), Début, Fin, Entrée ou Espace
 * (bascule), `*` (déplie les frères). Tri parmi les frères de chaque niveau, filtre qui garde et déplie les ancêtres
 * des résultats. Limité à 2 000 lignes visibles. Les cellules se personnalisent par
 * `<ng-template lcCell="idColonne" let-node let-level="level">`. Styles partagés avec `lc-table` (`--lc-table-*`).
 */
@Component({
  selector: 'lc-tree-table',
  imports: [NgTemplateOutlet, LcIconComponent, LcSkeletonComponent],
  hostDirectives: [LcStaggerDirective],
  template: `
    <div class="lc-table__scroll">
      <table class="lc-table__table" role="treegrid" [attr.aria-labelledby]="captionId">
        <caption class="lc-table__caption" [id]="captionId" [class.lc-table__caption--hidden]="captionHidden()">{{ caption() }}</caption>
        <thead>
          <tr>
            @for (column of columns(); track column.id) {
              <th scope="col" [class]="cellClass(column)" [style.width]="column.width ?? null" [attr.aria-sort]="ariaSort(sortDirection(column))">
                @if (column.sortable) {
                  <button type="button" class="lc-table__sort" (click)="toggleSort(column)">
                    <span>{{ column.header }}</span>
                    <lc-icon class="lc-table__sort-icon" [name]="sortIcon(sortDirection(column))" />
                  </button>
                } @else {
                  {{ column.header }}
                }
              </th>
            }
          </tr>
        </thead>
        <tbody #body (keydown)="onKeydown($event)" (focusin)="onFocusin($event)" (mousedown)="onMousedown($event)" (click)="onClick($event)" (animationend)="onRevealEnd($event)" (animationcancel)="onRevealEnd($event)">
          @if (state() === 'loading') {
            @for (row of skeletonRows; track row) {
              <tr class="lc-tree-table__skeleton-row" role="row">
                <td [attr.colspan]="columns().length"><lc-skeleton /></td>
              </tr>
            }
          } @else {
          @for (row of rows(); track row.key; let rowIndex = $index) {
            <tr class="lc-tree-table__row" role="row" [class.lc-reveal]="entering() && rowIndex < revealRows" [style.--lc-reveal-rank]="rowIndex" [attr.aria-level]="row.level" [attr.aria-posinset]="row.position"
              [attr.aria-setsize]="row.setSize" [attr.aria-expanded]="row.hasChildren ? row.expanded : null"
              [attr.tabindex]="rowIndex === activeIndex() ? 0 : -1" [style.--_level]="row.level - 1">
              @for (view of columnViews(); track view.column.id; let first = $first) {
                <td [class]="view.cellClass">
                  @if (first) {
                    <span class="lc-tree-table__first">
                      @if (row.hasChildren) {
                        <button type="button" class="lc-table__toggle lc-tree-table__toggle" tabindex="-1" aria-hidden="true">
                          <lc-icon [name]="row.expanded ? 'chevron-down' : 'chevron-right'" />
                        </button>
                      } @else {
                        <span class="lc-tree-table__spacer"></span>
                      }
                      <span class="lc-tree-table__content">
                        @if (view.template; as template) {
                          <ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="context(view.column, row)" />
                        } @else {
                          {{ cellText(format, view.column, row.node) }}
                        }
                      </span>
                    </span>
                  } @else {
                    @if (view.template; as template) {
                      <ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="context(view.column, row)" />
                    } @else {
                      {{ cellText(format, view.column, row.node) }}
                    }
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr class="lc-table__empty" role="row">
              <td [attr.colspan]="columns().length">{{ emptyMessage() || labels.noData }}</td>
            </tr>
          }
          }
        </tbody>
      </table>
    </div>
    @if (model().truncated) {
      <p class="lc-table__notice" role="status">{{ labels.truncatedRows(maxRows) }}</p>
    }
  `,
  styleUrls: ['../table/table.component.css', './tree-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-table lc-tree-table',
    '[class.lc-table--sticky-header]': 'stickyHeader()',
    '[class.lc-table--compact]': "density() === 'compact'",
    '[class.lc-tree-table--stale]': 'reloading()',
    '[attr.aria-busy]': "state() === 'loading' || reloading() ? 'true' : null",
  },
})
export class LcTreeTableComponent<T> {
  protected readonly labels = inject(LC_LABELS);
  protected readonly format = inject(LcFormatService);
  protected readonly cellClass = cellClass;
  protected readonly ariaSort = ariaSort;
  protected readonly cellText = cellText;
  protected readonly sortIcon = sortIcon;

  /** Nœuds racines. `undefined` : squelette ; `null` ou `[]` : état vide. */
  readonly data = input.required<readonly T[] | null | undefined>();
  /** Squelette même avec des données. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Rechargement : données gardées, atténuées. Sans effet pendant le squelette. */
  readonly stale = input(false, { transform: booleanAttribute });
  /** Enfants d'un nœud. */
  readonly children = input.required<(node: T) => readonly T[] | null | undefined>();
  /** Colonnes (type de `lc-table`) ; la première porte le bouton de dépliage et l'indentation. */
  readonly columns = input.required<readonly LcTableColumn<T>[]>();
  /** Identité stable d'un nœud. */
  readonly trackBy = input.required<(node: T) => unknown>();
  readonly caption = input.required<string>();
  readonly captionHidden = input(false, { transform: booleanAttribute });
  /** Tri parmi les frères, à chaque niveau. */
  readonly sort = model<LcSort | null>(null);
  /** Identités des nœuds dépliés. */
  readonly expanded = model<ReadonlySet<unknown>>(new Set());
  /** Déplie tous les nœuds au départ, jusqu'à la première bascule d'un utilisateur. */
  readonly expandAllInitially = input(false, { transform: booleanAttribute });
  /** Un nœud est affiché si lui ou un descendant passe ; les ancêtres des résultats sont dépliés. */
  readonly filter = input<((node: T) => boolean) | undefined>(undefined);
  readonly stickyHeader = input(false, { transform: booleanAttribute });
  readonly density = input<'comfortable' | 'compact'>('comfortable');
  /** Texte de l'état vide (défaut ou chaîne vide : `LC_LABELS.noData`). */
  readonly emptyMessage = input<string>();
  readonly rowToggled = output<{ node: T; expanded: boolean }>();

  protected readonly maxRows = LC_TREE_TABLE_MAX_ROWS;
  protected readonly skeletonRows = [0, 1, 2];
  protected readonly state = computed(() => lcDataState(this.data(), this.loading()));
  protected readonly reloading = computed(() => this.stale() && this.state() === 'ready');
  /** Lignes de l'entrée en cascade : celles de la première page ; les suivantes, hors écran, apparaissent d'un coup (pas une animation par ligne d'un grand arbre). */
  protected readonly revealRows = 30;
  /**
   * Vrai jusqu'à la fin de l'entrée en cascade de l'affichage initial. Ensuite, ni dépli ni repli ne rejouent rien : `lcReveal` (sortie `animate.leave`) garderait
   * les lignes repliées dans le DOM le temps de leur sortie, et la navigation au clavier, qui vise les lignes par leur position dans le DOM, perdrait le focus.
   */
  protected readonly entering = signal(true);
  protected readonly captionId = lcUniqueId('tree-table-caption');
  /** Dernière ligne active : sa clé et son index (la clé seule ne distingue pas deux lignes de même identité). */
  private readonly activeRow = signal<{ key: string; index: number } | null>(null);
  private readonly cells = contentChildren(LcCellDirective);
  private readonly cellTemplates = computed(() => new Map(this.cells().map((cell) => [cell.lcCell(), cell.template])));
  /** Par colonne : classe et gabarit de cellule, calculés une fois pour toutes les lignes. */
  protected readonly columnViews = computed(() =>
    this.columns().map((column) => ({ column, cellClass: this.cellClass(column), template: this.cellTemplates().get(column.id) ?? null })),
  );
  private readonly body = viewChild.required<ElementRef<HTMLTableSectionElement>>('body');
  /** Vrai tant que `expandAllInitially` ou un filtre s'applique (jusqu'à la première bascule) : le filtre déplie les ancêtres des résultats. */
  private readonly allExpanded = computed(() => (this.expandAllInitially() || !!this.filter()) && !this.toggled());
  /** Une bascule de l'utilisateur rend `expanded` prioritaire ; un nouveau filtre repart du dépliage automatique. */
  private readonly toggled = linkedSignal<((node: T) => boolean) | undefined, boolean>({ source: this.filter, computation: () => false });

  protected readonly model = computed(() => {
    const everything = this.allExpanded();
    const expanded = this.expanded();
    return buildTreeTableModel<T>({
      data: this.data() ?? [],
      children: this.children(),
      columns: this.columns(),
      trackBy: this.trackBy(),
      sort: this.sort(),
      isExpanded: (id) => everything || expanded.has(id),
      filter: this.filter(),
    });
  });
  protected readonly rows = computed(() => this.model().rows);
  /** Index de la seule ligne dans l'ordre de tabulation : la dernière active, sinon la première. */
  protected readonly activeIndex = computed(() => {
    const rows = this.rows();
    const active = this.activeRow();
    if (!active) return 0;
    if (rows[active.index]?.key === active.key) return active.index;
    return Math.max(0, rows.findIndex((row) => row.key === active.key));
  });

  constructor() {
    // Mouvement réduit : `motion.css` ne joue aucune entrée, ni fin ni annulation n'arriveront ; l'entrée est close au premier rendu d'un arbre non vide.
    afterNextRender(() => {
      if (this.rows().length && lcPrefersReducedMotion()) this.entering.set(false);
    });
    if (isDevMode()) {
      effect(() => {
        if (this.model().truncated) {
          console.warn(`[lc-tree-table] Plus de ${LC_TREE_TABLE_MAX_ROWS} lignes visibles : seules les ${LC_TREE_TABLE_MAX_ROWS} premières sont affichées. Filtrez ou repliez des nœuds.`);
        }
      });
      effect(() => {
        const rows = this.rows();
        if (new Set(rows.map((row) => row.key)).size < rows.length) {
          console.warn('[lc-tree-table] `trackBy` renvoie la même identité pour plusieurs lignes visibles : leur dépliage est lié. Fournissez une identité unique par nœud.');
        }
      });
    }
  }

  protected context(column: LcTableColumn<T>, row: LcTreeTableRow<T>): unknown {
    return { $implicit: row.node, column, level: row.level };
  }

  protected sortDirection(column: LcTableColumn<T>): LcSort['direction'] | null {
    return column.sortable ? sortDirection(this.sort(), column.id) : null;
  }

  protected toggleSort(column: LcTableColumn<T>): void {
    this.sort.set(nextSort(this.sort(), column.id));
  }

  /** Ligne (`tr` du corps) qui est la cible directe d'un évènement du corps du tableau, ou `null` (cellule, contrôle de cellule). */
  private rowOf(event: Event): { element: HTMLTableRowElement; index: number } | null {
    const element = event.target;
    if (!(element instanceof HTMLTableRowElement) || element.parentElement !== this.body().nativeElement) return null;
    return { element, index: element.sectionRowIndex };
  }

  /** Fin (ou annulation : ligne retirée) de l'entrée d'une ligne ; la dernière de la cascade clôt l'entrée. */
  protected onRevealEnd(event: AnimationEvent): void {
    const row = this.rowOf(event);
    if (row && event.animationName === LC_REVEAL_ANIMATION && row.index >= Math.min(this.rows().length, this.revealRows) - 1) this.entering.set(false);
  }

  protected onFocusin(event: FocusEvent): void {
    const target = this.rowOf(event);
    if (target) this.markActive(target.index);
  }

  /** Le bouton de dépliage (souris seulement, `aria-hidden`) ne prend jamais le focus : il reste sur la ligne. */
  protected onMousedown(event: MouseEvent): void {
    if (event.target instanceof Element && event.target.closest('.lc-tree-table__toggle')) event.preventDefault();
  }

  protected onClick(event: MouseEvent): void {
    const toggle = event.target instanceof Element ? event.target.closest('.lc-tree-table__toggle') : null;
    const rowElement = toggle?.closest('tr');
    const row = rowElement ? this.rows()[rowElement.sectionRowIndex] : undefined;
    if (!rowElement || !row) return;
    // Filet pour un focus donné au bouton sans `mousedown` (lecteur d'écran, automatisation) : la navigation clavier continue.
    this.focusRow(rowElement.sectionRowIndex);
    this.setExpanded([row], !row.expanded);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Les touches saisies dans un contenu de cellule (champ, lien) ne sont pas détournées.
    const target = this.rowOf(event);
    const row = target ? this.rows()[target.index] : undefined;
    if (!target || !row || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = target.index;
    switch (event.key) {
      case 'ArrowDown':
        this.focusRow(index + 1);
        break;
      case 'ArrowUp':
        this.focusRow(index - 1);
        break;
      case 'Home':
        this.focusRow(0);
        break;
      case 'End':
        this.focusRow(this.rows().length - 1);
        break;
      case 'ArrowRight':
        if (row.hasChildren && !row.expanded) this.setExpanded([row], true);
        else if (row.hasChildren) this.focusRow(index + 1);
        break;
      case 'ArrowLeft':
        if (row.hasChildren && row.expanded) this.setExpanded([row], false);
        else if (row.parentIndex >= 0) this.focusRow(row.parentIndex);
        break;
      case 'Enter':
      case ' ':
        if (row.hasChildren) this.setExpanded([row], !row.expanded);
        break;
      case '*':
        this.setExpanded(this.rows().filter((sibling) => sibling.parentIndex === row.parentIndex && sibling.hasChildren && !sibling.expanded), true);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  /** Donne le focus à la ligne d'index donné (sans effet hors des bornes : pas de bouclage). */
  private focusRow(index: number): void {
    const element = this.body().nativeElement.rows[index];
    if (!element) return;
    this.markActive(index);
    element.focus();
  }

  private markActive(index: number): void {
    const key = this.rows()[index]?.key;
    if (key !== undefined) this.activeRow.set({ key, index });
  }

  /** Bascule des lignes parentes : le modèle `expanded` devient la référence dès la première bascule. */
  private setExpanded(rows: readonly LcTreeTableRow<T>[], expanded: boolean): void {
    const changing = rows.filter((row) => row.hasChildren && row.expanded !== expanded);
    if (changing.length === 0) return;
    const next = new Set<unknown>(this.allExpanded() ? this.model().parentIds : this.expanded());
    for (const row of changing) {
      if (expanded) next.add(row.id);
      else next.delete(row.id);
    }
    this.toggled.set(true);
    this.expanded.set(next);
    for (const row of changing) this.rowToggled.emit({ node: row.node, expanded });
  }
}
