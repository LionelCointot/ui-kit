import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, booleanAttribute, computed, contentChildren, inject, input, model, output, signal } from '@angular/core';
import { LC_LABELS, LcFormatService, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcCellDirective } from './cell.directive';
import {
  LC_TABLE_MAX_ROWS, LcSort, LcTableColumn, LcTableGrouping, buildTableModel, columnAlign, nextSort,
} from './table-model';

/**
 * Tableau de données : `<table>` natif, tri côté client (en-tête-bouton, `aria-sort`), groupes repliables
 * avec sous-totaux, ligne de totaux, en-tête et première colonne collants. Limité à 2 000 lignes (ADR-0004).
 * Cellules personnalisées par `<ng-template lcCell="idColonne" let-row>`.
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
              <tr>
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
              <td [attr.colspan]="columns().length">{{ emptyMessage() ?? labels.noData }}</td>
            </tr>
          }
        </tbody>
        @if (footer(); as totals) {
          <tfoot>
            <tr>
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
    @if (model().truncated) {
      <p class="lc-table__notice" role="status">{{ labels.truncatedRows(maxRows) }}</p>
    }
  `,
  styleUrl: './table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-table',
    '[class.lc-table--sticky-header]': 'stickyHeader()',
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
  readonly stickyHeader = input(false, { transform: booleanAttribute });
  readonly density = input<'comfortable' | 'compact'>('comfortable');
  readonly emptyMessage = input<string>();
  readonly groupToggled = output<{ key: string; expanded: boolean }>();

  protected readonly maxRows = LC_TABLE_MAX_ROWS;
  protected readonly cellTemplates = computed(() => new Map(this.cells().map((cell) => [cell.lcCell(), cell.template])));
  private readonly cells = contentChildren(LcCellDirective);
  private readonly expandedOverrides = signal<ReadonlyMap<string, boolean>>(new Map());

  protected readonly model = computed(() => buildTableModel<T>({
    data: this.data(),
    columns: this.columns(),
    trackBy: this.trackBy(),
    sort: this.sort(),
    grouping: this.groupBy(),
    expandedOverrides: this.expandedOverrides(),
  }));

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
    if (sort?.columnId !== column.id) return 'chevron-down';
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
