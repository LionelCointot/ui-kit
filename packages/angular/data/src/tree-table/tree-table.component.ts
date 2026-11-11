import { FocusKeyManager } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, Injector, TemplateRef, booleanAttribute, computed, contentChildren, effect, inject, input, isDevMode,
  linkedSignal, model, output, signal, viewChild, viewChildren,
} from '@angular/core';
import { LC_LABELS, LcFormatService, LcIconComponent, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcCellDirective } from '../table/cell.directive';
import { LcSort, LcTableColumn, columnAlign, nextSort } from '../table/table-model';
import { LcTreeRowDirective } from './tree-row.directive';
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
  imports: [NgTemplateOutlet, LcIconComponent, LcTreeRowDirective],
  template: `
    <div class="lc-table__scroll">
      <table class="lc-table__table" role="treegrid" [attr.aria-labelledby]="captionId">
        <caption class="lc-table__caption" [id]="captionId" [class.lc-table__caption--hidden]="captionHidden()">{{ caption() }}</caption>
        <thead>
          <tr>
            @for (column of columns(); track column.id) {
              <th scope="col" [class]="cellClass(column)" [style.width]="column.width ?? null" [attr.aria-sort]="ariaSort(column)">
                @if (column.sortable) {
                  <button type="button" class="lc-table__sort" (click)="toggleSort(column)">
                    <span>{{ column.header }}</span>
                    <lc-icon class="lc-table__sort-icon" [name]="sortIcon(column)" />
                  </button>
                } @else {
                  {{ column.header }}
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.key; let rowIndex = $index) {
            <tr lcTreeRow class="lc-tree-table__row" role="row" [attr.aria-level]="row.level" [attr.aria-posinset]="row.position"
              [attr.aria-setsize]="row.setSize" [attr.aria-expanded]="row.hasChildren ? row.expanded : null"
              [attr.tabindex]="row.key === activeKey() ? 0 : -1" [style.--_level]="row.level - 1"
              (focus)="activeRowKey.set(row.key)" (keydown)="onKeydown($event, row, rowIndex)">
              @for (column of columns(); track column.id; let first = $first) {
                <td [class]="cellClass(column)">
                  @if (first) {
                    <span class="lc-tree-table__first">
                      @if (row.hasChildren) {
                        <button type="button" class="lc-table__toggle lc-tree-table__toggle" tabindex="-1" aria-hidden="true"
                          (click)="toggleFromPointer(row)">
                          <lc-icon [name]="row.expanded ? 'chevron-down' : 'chevron-right'" />
                        </button>
                      } @else {
                        <span class="lc-tree-table__spacer"></span>
                      }
                      <span class="lc-tree-table__content">
                        <ng-container [ngTemplateOutlet]="cellOutlet(column)" [ngTemplateOutletContext]="context(column, row)" />
                      </span>
                    </span>
                  } @else {
                    <ng-container [ngTemplateOutlet]="cellOutlet(column)" [ngTemplateOutletContext]="context(column, row)" />
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr class="lc-table__empty" role="row">
              <td [attr.colspan]="columns().length">{{ emptyMessage() ?? labels.noData }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (model().truncated) {
      <p class="lc-table__notice" role="status">{{ labels.truncatedRows(maxRows) }}</p>
    }

    <ng-template #textCell let-node let-column="column">{{ cellText(column, node) }}</ng-template>
  `,
  styleUrls: ['../table/table.component.css', './tree-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-table lc-tree-table',
    '[class.lc-table--sticky-header]': 'stickyHeader()',
    '[class.lc-table--compact]': "density() === 'compact'",
  },
})
export class LcTreeTableComponent<T> {
  protected readonly labels = inject(LC_LABELS);
  private readonly format = inject(LcFormatService);
  private readonly injector = inject(Injector);

  /** Nœuds racines. */
  readonly data = input.required<readonly T[]>();
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
  readonly emptyMessage = input<string>();
  readonly rowToggled = output<{ node: T; expanded: boolean }>();

  protected readonly maxRows = LC_TREE_TABLE_MAX_ROWS;
  protected readonly captionId = lcUniqueId('tree-table-caption');
  protected readonly activeRowKey = signal<string | null>(null);
  private readonly cells = contentChildren(LcCellDirective);
  private readonly cellTemplates = computed(() => new Map(this.cells().map((cell) => [cell.lcCell(), cell.template])));
  private readonly rowItems = viewChildren(LcTreeRowDirective);
  private readonly textCell = viewChild.required<TemplateRef<unknown>>('textCell');
  /** Vrai tant que `expandAllInitially` ou un filtre s'applique (jusqu'à la première bascule) : le filtre déplie les ancêtres des résultats. */
  private readonly allExpanded = computed(() => (this.expandAllInitially() || !!this.filter()) && !this.toggled());
  /** Une bascule de l'utilisateur rend `expanded` prioritaire ; un nouveau filtre repart du dépliage automatique. */
  private readonly toggled = linkedSignal<((node: T) => boolean) | undefined, boolean>({ source: this.filter, computation: () => false });
  private readonly keyManager = new FocusKeyManager<LcTreeRowDirective>(this.rowItems, this.injector).withVerticalOrientation().withHomeAndEnd();

  protected readonly model = computed(() => {
    const everything = this.allExpanded();
    const expanded = this.expanded();
    return buildTreeTableModel<T>({
      data: this.data(),
      children: this.children(),
      columns: this.columns(),
      trackBy: this.trackBy(),
      sort: this.sort(),
      isExpanded: (id) => everything || expanded.has(id),
      filter: this.filter(),
    });
  });
  protected readonly rows = computed(() => this.model().rows);
  /** Seule ligne dans l'ordre de tabulation : la dernière active, sinon la première. */
  protected readonly activeKey = computed(() => {
    const rows = this.rows();
    const key = this.activeRowKey();
    return rows.some((row) => row.key === key) ? key : (rows[0]?.key ?? null);
  });

  constructor() {
    this.keyManager.change.subscribe((index) => {
      const key = this.rows()[index]?.key;
      if (key !== undefined) this.activeRowKey.set(key);
    });
    if (isDevMode()) {
      effect(() => {
        if (this.model().truncated) {
          console.warn(`[lc-tree-table] Plus de ${LC_TREE_TABLE_MAX_ROWS} lignes visibles : seules les ${LC_TREE_TABLE_MAX_ROWS} premières sont affichées. Filtrez ou repliez des nœuds.`);
        }
      });
    }
  }

  protected cellClass(column: LcTableColumn<T>): string {
    const sticky = column.sticky ? ` lc-table__cell--sticky-${column.sticky}` : '';
    return `lc-table__cell lc-table__cell--${columnAlign(column)}${sticky}`;
  }

  protected cellText(column: LcTableColumn<T>, node: T): string {
    return this.format.format(column.value(node), column.format);
  }

  protected cellOutlet(column: LcTableColumn<T>): TemplateRef<unknown> {
    return this.cellTemplates().get(column.id) ?? this.textCell();
  }

  protected context(column: LcTableColumn<T>, row: LcTreeTableRow<T>): unknown {
    return { $implicit: row.node, column, level: row.level };
  }

  protected ariaSort(column: LcTableColumn<T>): 'ascending' | 'descending' | null {
    const sort = this.sort();
    if (!column.sortable || sort?.columnId !== column.id) return null;
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIcon(column: LcTableColumn<T>): string {
    const sort = this.sort();
    if (sort?.columnId !== column.id) return 'chevron-down';
    return sort.direction === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  protected toggleSort(column: LcTableColumn<T>): void {
    this.sort.set(nextSort(this.sort(), column.id));
  }

  protected toggleFromPointer(row: LcTreeTableRow<T>): void {
    this.setExpanded([row], !row.expanded);
  }

  protected onKeydown(event: KeyboardEvent, row: LcTreeTableRow<T>, index: number): void {
    // Les touches saisies dans un contenu de cellule (champ, lien) ne sont pas détournées.
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    this.keyManager.updateActiveItem(index);
    switch (event.key) {
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
        this.keyManager.onKeydown(event);
        return;
    }
    event.preventDefault();
  }

  private focusRow(index: number): void {
    this.keyManager.setActiveItem(index);
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
