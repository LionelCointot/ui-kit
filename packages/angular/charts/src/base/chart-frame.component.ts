import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, model, output } from '@angular/core';
import { LC_LABELS, LcIconComponent, LcSkeletonComponent, lcUniqueId } from '@lionelcointot/ui-angular';
import type { EChartsCoreOption } from '../echarts-registry';
import type { LcChartPointSelect, LcChartTable, LcLegendItem } from '../types';
import { LcChartHostComponent, LcChartNavigationSeries } from './chart-host.component';

/**
 * Cadre d'un graphique (interne) : titre, description, légende HTML, zone de tracé (squelette, vide, tracé),
 * bouton « Voir les données » et vue tableau native. Rôle `figure` nommé par le titre.
 */
@Component({
  selector: 'lc-chart-frame',
  imports: [LcChartHostComponent, LcIconComponent, LcSkeletonComponent],
  template: `
    <p class="lc-chart-frame__title" [id]="titleId" [class.lc-chart-frame__hidden]="titleHidden()">{{ title() }}</p>
    @if (description()) {
      <p class="lc-chart-frame__description" [id]="descriptionId" [class.lc-chart-frame__hidden]="titleHidden()">{{ description() }}</p>
    }
    @if (legend().length >= 2) {
      <ul class="lc-chart-frame__legend">
        @for (item of legend(); track item.id) {
          <li>
            @if (legendToggleable()) {
              <button type="button" class="lc-chart-frame__legend-item" [attr.aria-pressed]="!item.hidden"
                [class.lc-chart-frame__legend-item--off]="item.hidden" (click)="legendToggle.emit(item.id)">
                <span class="lc-chart-frame__swatch" [class.lc-chart-frame__swatch--line]="item.shape === 'line'"
                  [class.lc-chart-frame__swatch--dashed]="item.dashed" [style.--lc-swatch-color]="item.color">
                  @if (item.shape === 'line' && item.symbol) {
                    <span class="lc-chart-frame__symbol" [class]="'lc-chart-frame__symbol--' + item.symbol"></span>
                  }
                </span>
                @if (item.icon) {
                  <lc-icon class="lc-chart-frame__role-icon" [name]="item.icon" />
                }
                <span>{{ item.label }}</span>
              </button>
            } @else {
              <span class="lc-chart-frame__legend-item">
                <span class="lc-chart-frame__swatch" [class.lc-chart-frame__swatch--line]="item.shape === 'line'"
                  [class.lc-chart-frame__swatch--dashed]="item.dashed" [style.--lc-swatch-color]="item.color">
                  @if (item.shape === 'line' && item.symbol) {
                    <span class="lc-chart-frame__symbol" [class]="'lc-chart-frame__symbol--' + item.symbol"></span>
                  }
                </span>
                @if (item.icon) {
                  <lc-icon class="lc-chart-frame__role-icon" [name]="item.icon" />
                }
                <span>{{ item.label }}</span>
              </span>
            }
          </li>
        }
      </ul>
    }
    <div class="lc-chart-frame__plot" [style.min-height]="height()">
      @if (loading()) {
        <lc-skeleton shape="rect" width="100%" [height]="height()" />
      } @else if (empty()) {
        <p class="lc-chart-frame__empty" [style.height]="height()">{{ emptyMessage() || labels.noData }}</p>
      } @else {
        <lc-chart-host class="lc-chart-frame__chart" [class.lc-chart-frame__chart--stale]="stale()"
          [option]="option()" [ariaLabel]="title()" [height]="height()" [navigation]="navigation()" [categoryCount]="categoryCount()"
          (pointSelect)="pointSelect.emit($event)" />
      }
    </div>
    @if (table() && !empty() && !loading()) {
      <button type="button" class="lc-chart-frame__data-toggle" [attr.aria-expanded]="showDataTable()" [attr.aria-controls]="tableId"
        (click)="showDataTable.set(!showDataTable())">
        {{ showDataTable() ? labels.hideData : labels.showData }}
      </button>
      @if (showDataTable()) {
        <div class="lc-chart-frame__table-wrap" [id]="tableId" tabindex="0" role="region" [attr.aria-label]="title()">
          <table class="lc-chart-frame__table">
            <caption class="lc-chart-frame__hidden">{{ title() }}</caption>
            <thead>
              <tr>
                @for (column of table()!.columns; track $index) {
                  <th scope="col">{{ column }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of table()!.rows; track $index) {
                <tr>
                  @for (cell of row; track $index; let first = $first) {
                    @if (first) {
                      <th scope="row">{{ cell }}</th>
                    } @else {
                      <td>{{ cell }}</td>
                    }
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styleUrl: './chart-frame.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-chart-frame',
    role: 'figure',
    '[attr.aria-labelledby]': 'titleId',
    '[attr.aria-describedby]': 'description() ? descriptionId : null',
    '[attr.aria-busy]': "loading() || stale() ? 'true' : null",
  },
})
export class LcChartFrameComponent {
  protected readonly labels = inject(LC_LABELS);
  protected readonly titleId = lcUniqueId('chart-title');
  protected readonly descriptionId = lcUniqueId('chart-description');
  protected readonly tableId = lcUniqueId('chart-table');

  readonly title = input.required<string>();
  readonly titleHidden = input(false, { transform: booleanAttribute });
  readonly description = input<string>();
  readonly height = input('280px');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly stale = input(false, { transform: booleanAttribute });
  readonly empty = input(false, { transform: booleanAttribute });
  readonly emptyMessage = input<string>();
  readonly legend = input<readonly LcLegendItem[]>([]);
  readonly legendToggleable = input(true, { transform: booleanAttribute });
  readonly table = input<LcChartTable | null>(null);
  readonly showDataTable = model(false);
  readonly option = input<EChartsCoreOption | null>(null);
  readonly navigation = input<readonly LcChartNavigationSeries[]>([]);
  readonly categoryCount = computed(() => Math.max(0, ...this.navigation().map((series) => series.values.length)));
  readonly legendToggle = output<string>();
  readonly pointSelect = output<LcChartPointSelect>();
}
