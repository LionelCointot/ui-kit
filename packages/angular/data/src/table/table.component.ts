import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, booleanAttribute, computed, contentChildren, effect, inject, input, isDevMode, model, output, signal } from '@angular/core';
import { LC_LABELS, LcFormatService, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcCellDirective } from './cell.directive';
import {
  LC_TABLE_MAX_ROWS, LcSort, LcTableColumn, LcTableGrouping, buildTableModel, columnAlign, nextSort,
} from './table-model';

let nextId = 0;

/**
 * Tableau de données : `<table>` natif, tri côté client par défaut, ou émis seulement avec `sortMode="external"` (en-tête-bouton, `aria-sort`, `[(sort)]`), groupes repliables
 * avec sous-totaux, ligne de totaux, en-tête et première colonne collants. Limité à 2 000 lignes (ADR-0004).
 * Cellules personnalisées par `<ng-template lcCell="idColonne" let-row>`.
 * Espacement horizontal des cellules : variable CSS `--lc-table-cell-padding-inline` (défaut `space-4`, `space-3` en `compact`), à poser sur `lc-table` ou un ancêtre.
 */
@Component({
  selector: 'lc-table',
  imports: [NgTemplateOutlet, LcIconComponent],
  template: `
    <div class="lc-table__scroll" tabindex="0" role="region" [attr.aria-label]="caption()">
      <table class="lc-table__table">
        <caption class="lc-table__caption" [class.lc-table__caption--hidden]="captionHidden()">{{ caption() }}</caption>
        <thead>
          <tr>
            @if (selectable()) {
              <th scope="col" class="lc-table__cell lc-table__select">
                <label class="lc-table__select-hit">
                  <input type="checkbox" class="lc-checkbox" [attr.aria-label]="selectionLabel() ?? labels.selectAll"
                    [attr.aria-describedby]="selectAllHint() ? hintId : null" [checked]="headerState().checked"
                    [indeterminate]="headerState().indeterminate" [disabled]="selectableKeys().length === 0" (change)="toggleAll()" />
                </label>
              </th>
            }
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
          @for (item of model().items; track item.id) {
            @if (item.kind === 'group') {
              <tr class="lc-table__group">
                @if (selectable()) {
                  <td class="lc-table__cell lc-table__select"></td>
                }
                @for (column of columns(); track column.id; let first = $first) {
                  <td [class]="cellClass(column)">
                    @if (first) {
                      <button type="button" class="lc-table__toggle" [attr.aria-expanded]="item.expanded"
                        [attr.aria-label]="(item.expanded ? labels.collapseGroup : labels.expandGroup) + ' ' + item.label"
                        (click)="toggleGroup(item.key, item.expanded)">
                        <lc-icon [name]="item.expanded ? 'chevron-down' : 'chevron-right'" />
                        <span>{{ item.label }}</span>
                      </button>
                    } @else {
                      {{ summaryText(column, item.summary) }}
                    }
                  </td>
                }
              </tr>
            } @else {
              <tr [class]="rowClasses(item.row)">
                @if (selectable()) {
                  <td class="lc-table__cell lc-table__select">
                    <label class="lc-table__select-hit">
                      <input type="checkbox" class="lc-checkbox" [attr.aria-label]="rowSelectionLabel()?.(item.row) ?? labels.selectRow"
                        [checked]="selection().has(trackBy()(item.row))" [disabled]="!isRowSelectable()(item.row)" (change)="toggleRow(item.row)" />
                    </label>
                  </td>
                }
                @for (column of columns(); track column.id) {
                  <td [class]="cellClass(column)">
                    @if (cellTemplates().get(column.id); as template) {
                      <ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="{ $implicit: item.row, column: column }" />
                    } @else {
                      {{ cellText(column, item.row) }}
                    }
                  </td>
                }
              </tr>
            }
          } @empty {
            <tr class="lc-table__empty">
              <td [attr.colspan]="columns().length + (selectable() ? 1 : 0)">{{ emptyMessage() ?? labels.noData }}</td>
            </tr>
          }
        </tbody>
        @if (footer(); as totals) {
          <tfoot>
            <tr>
              @if (selectable()) {
                <td class="lc-table__cell lc-table__select"></td>
              }
              @for (column of columns(); track column.id; let first = $first) {
                <td [class]="cellClass(column)">
                  @if (totals[column.id] !== undefined) {
                    {{ summaryText(column, totals) }}
                  } @else if (first) {
                    {{ labels.total }}
                  }
                </td>
              }
            </tr>
          </tfoot>
        }
      </table>
    </div>
    @if (selectable()) {
      @if (selectAllHint(); as hint) {
        <p class="lc-table__notice" [id]="hintId">{{ hint }}</p>
      }
      <p class="lc-table__sr-only" aria-live="polite">{{ announcement() }}</p>
    }
    @if (model().truncated) {
      <p class="lc-table__notice" role="status">{{ labels.truncatedRows(maxRows) }}</p>
    }
  `,
  styleUrl: './table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-table',
    '[class.lc-table--sticky-header]': 'stickyHeader()',
    '[class.lc-table--selectable]': 'selectable()',
    '[class.lc-table--compact]': "density() === 'compact'",
  },
})
export class LcTableComponent<T> {
  protected readonly labels = inject(LC_LABELS);
  private readonly format = inject(LcFormatService);

  readonly data = input.required<readonly T[]>();
  readonly columns = input.required<readonly LcTableColumn<T>[]>();
  readonly trackBy = input.required<(row: T) => unknown>();
  readonly caption = input.required<string>();
  readonly captionHidden = input(false, { transform: booleanAttribute });
  readonly groupBy = input<LcTableGrouping<T>>();
  readonly footer = input<Readonly<Record<string, unknown>>>();
  readonly sort = model<LcSort | null>(null);
  /** `client` (défaut) : le tableau trie `data` selon `sort`. `external` : il n'émet que le tri demandé (tri fait par le serveur) et affiche `data` dans son ordre. */
  readonly sortMode = input<'client' | 'external'>('client');
  readonly stickyHeader = input(false, { transform: booleanAttribute });
  readonly density = input<'comfortable' | 'compact'>('comfortable');
  readonly emptyMessage = input<string>();
  /** Colonne de cases à cocher en tête ; `selection` porte les clés `trackBy` des lignes cochées (nouveau `Set` à chaque changement). */
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly selection = model<ReadonlySet<unknown>>(new Set());
  readonly isRowSelectable = input<(row: T) => boolean>(() => true);
  readonly rowSelectionLabel = input<(row: T) => string>();
  readonly selectionLabel = input<string>();
  /** Aide sous le tableau, reliée à la case d'en-tête (`aria-describedby`). */
  readonly selectAllHint = input<string>();
  /** Classes posées sur la ligne de données (pas sur les groupes ni le pied). Pour un fond, poser `--lc-table-row-background` : le survol du kit s'y mélange. */
  readonly rowClass = input<(row: T) => string | readonly string[] | null>();
  readonly groupToggled = output<{ key: string; expanded: boolean }>();

  protected readonly hintId = `lc-table-hint-${nextId++}`;
  /** Dernier texte annoncé : écrit seulement par un geste dans le tableau, jamais par `selection.set` du parent ni par `data`. */
  protected readonly announcement = signal('');
  /** Clés des lignes cochables de tout `data` (groupes repliés compris). */
  protected readonly selectableKeys = computed(() => {
    const keyOf = this.trackBy();
    const test = this.isRowSelectable();
    const keys = this.data().filter((row) => test(row)).map((row) => keyOf(row));
    return keys;
  });
  private readonly selectedCount = computed(() => this.selectableKeys().filter((key) => this.selection().has(key)).length);
  protected readonly headerState = computed(() => {
    const count = this.selectedCount();
    return { checked: count > 0 && count === this.selectableKeys().length, indeterminate: count > 0 && count < this.selectableKeys().length };
  });
  private readonly warnDuplicateKeys = effect(() => {
    if (!isDevMode() || !this.selectable()) return;
    const keyOf = this.trackBy();
    const keys = this.data().map((row) => keyOf(row));
    if (new Set(keys).size !== keys.length) console.warn('lc-table: `trackBy` renvoie deux fois la même clé, la sélection est ambiguë.');
  });
  protected readonly maxRows = LC_TABLE_MAX_ROWS;
  protected readonly cellTemplates = computed(() => new Map(this.cells().map((cell) => [cell.lcCell(), cell.template])));
  private readonly cells = contentChildren(LcCellDirective);
  private readonly expandedOverrides = signal<ReadonlyMap<string, boolean>>(new Map());

  protected readonly model = computed(() => buildTableModel<T>({
    data: this.data(),
    columns: this.columns(),
    trackBy: this.trackBy(),
    sort: this.sortMode() === 'client' ? this.sort() : null,
    grouping: this.groupBy(),
    expandedOverrides: this.expandedOverrides(),
  }));

  protected toggleRow(row: T): void {
    const key = this.trackBy()(row);
    const next = new Set(this.selection());
    if (!next.delete(key)) next.add(key);
    this.commitSelection(next);
  }

  protected toggleAll(): void {
    const next = new Set(this.selection());
    const select = !this.headerState().checked;
    for (const key of this.selectableKeys()) select ? next.add(key) : next.delete(key);
    this.commitSelection(next);
  }

  private commitSelection(next: Set<unknown>): void {
    this.selection.set(next);
    this.announcement.set(this.labels.selectionCount(this.selectedCount(), this.selectableKeys().length));
  }

  protected rowClasses(row: T): string | readonly string[] | null {
    return this.rowClass()?.(row) ?? null;
  }

  protected cellClass(column: LcTableColumn<T>): string {
    const sticky = column.sticky ? ` lc-table__cell--sticky-${column.sticky}` : '';
    return `lc-table__cell lc-table__cell--${columnAlign(column)}${sticky}`;
  }

  protected cellText(column: LcTableColumn<T>, row: T): string {
    return this.format.format(column.value(row), column.format);
  }

  protected summaryText(column: LcTableColumn<T>, values: Readonly<Record<string, unknown>>): string {
    const value = values[column.id];
    return value === undefined ? '' : this.format.format(value, column.format);
  }

  protected ariaSort(column: LcTableColumn<T>): 'ascending' | 'descending' | null {
    const sort = this.sort();
    if (!column.sortable || sort?.columnId !== column.id) return null;
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIcon(column: LcTableColumn<T>): string {
    const sort = this.sort();
    if (sort?.columnId !== column.id) return 'arrow-up-down';
    return sort.direction === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  protected toggleSort(column: LcTableColumn<T>): void {
    this.sort.set(nextSort(this.sort(), column.id));
  }

  protected toggleGroup(key: string, expanded: boolean): void {
    this.expandedOverrides.update((map) => new Map(map).set(key, !expanded));
    this.groupToggled.emit({ key, expanded: !expanded });
  }
}
