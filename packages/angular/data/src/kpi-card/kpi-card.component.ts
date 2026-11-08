import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { LcFormatService, LcIconComponent, LcSkeletonComponent, LcValueFormat } from '@lionelcointot/ui-angular';

export interface LcKpiDelta {
  readonly value: number;
  readonly format: LcValueFormat;
  readonly trend: 'up' | 'down' | 'flat';
  readonly sentiment: 'positive' | 'negative' | 'neutral';
}

const TREND_ICONS = { up: 'chevron-up', down: 'chevron-down', flat: 'minus' } as const;

/**
 * Carte indicateur : libellé, valeur principale (chiffres proportionnels), variation (icône de tendance,
 * signe et texte : jamais la couleur seule) et précision. L'emplacement `[lcKpiVisual]` accueille une sparkline.
 */
@Component({
  selector: 'lc-kpi-card',
  imports: [LcIconComponent, LcSkeletonComponent],
  template: `
    <p class="lc-kpi-card__label">{{ label() }}</p>
    @if (loading()) {
      <lc-skeleton shape="text" width="60%" height="2rem" />
    } @else {
      <p class="lc-kpi-card__value" [class.lc-kpi-card__value--stale]="stale()">{{ valueText() }}</p>
      @if (delta(); as change) {
        <p class="lc-kpi-card__delta" [class]="'lc-kpi-card__delta--' + change.sentiment">
          <lc-icon [name]="trendIcon()" />
          <span>{{ deltaText() }}</span>
        </p>
      }
      @if (hint()) {
        <p class="lc-kpi-card__hint">{{ hint() }}</p>
      }
    }
    <div class="lc-kpi-card__visual"><ng-content select="[lcKpiVisual]" /></div>
  `,
  styleUrl: './kpi-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-kpi-card', '[attr.aria-busy]': "loading() ? 'true' : null" },
})
export class LcKpiCardComponent {
  private readonly formatService = inject(LcFormatService);

  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  readonly format = input<LcValueFormat>('number');
  readonly delta = input<LcKpiDelta>();
  readonly hint = input<string>();
  readonly loading = input(false, { transform: booleanAttribute });
  /** Valeur atténuée pendant un recalcul. */
  readonly stale = input(false, { transform: booleanAttribute });

  protected readonly valueText = computed(() => this.formatService.format(this.value(), this.format()));
  protected readonly trendIcon = computed(() => TREND_ICONS[this.delta()?.trend ?? 'flat']);
  protected readonly deltaText = computed(() => {
    const delta = this.delta();
    if (!delta) return '';
    const sign = delta.value > 0 ? '+' : delta.value < 0 ? '−' : '';
    return `${sign}${this.formatService.format(Math.abs(delta.value), delta.format)}`;
  });
}
