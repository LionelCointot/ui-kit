import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { LcCountUpDirective, LcFlashDirective, LcFormatService, LcIconComponent, LcRevealDirective, LcSkeletonComponent, LcValueFormat, lcRevealHost } from '@lionelcointot/ui-angular';

export interface LcKpiDelta {
  readonly value: number;
  readonly format: LcValueFormat;
  readonly trend: 'up' | 'down' | 'flat';
  readonly sentiment: 'positive' | 'negative' | 'neutral';
}

const TREND_ICONS = { up: 'chevron-up', down: 'chevron-down', flat: 'minus' } as const;

/**
 * Carte indicateur (entrée `tilt`, chiffre qui compte) : libellé, valeur principale (chiffres proportionnels), variation (icône de tendance,
 * signe et texte : jamais la couleur seule) et précision. L'emplacement `[lcKpiVisual]` accueille une sparkline.
 */
@Component({
  selector: 'lc-kpi-card',
  imports: [LcIconComponent, LcSkeletonComponent, LcCountUpDirective, LcFlashDirective],
  providers: lcRevealHost('tilt'),
  hostDirectives: [{ directive: LcRevealDirective, inputs: ['lcReveal', 'lcRevealIndex'] }],
  template: `
    <p class="lc-kpi-card__label">{{ label() }}</p>
    @if (loading()) {
      <lc-skeleton shape="text" width="60%" height="2rem" />
    } @else {
      @if (counted()) {
        <!-- Le comptage démarre au montage, sans délai de couche, comme sur le site : la carte, elle, entre à 100 ms + rang × rythme. -->
        <p class="lc-kpi-card__value" [class.lc-kpi-card__value--stale]="stale()" [lcCountUp]="value() ?? 0" [lcCountUpFormat]="format()" [lcFlash]="value()"></p>
      } @else {
        <p class="lc-kpi-card__value" [class.lc-kpi-card__value--stale]="stale()">{{ displayText() }}</p>
      }
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
  host: {
    class: 'lc-kpi-card',
    role: 'group',
    '[attr.aria-label]': 'accessibleName()',
    '[attr.aria-busy]': "loading() ? 'true' : null",
  },
})
export class LcKpiCardComponent {
  private readonly formatService = inject(LcFormatService);

  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  readonly format = input<LcValueFormat>('number');
  /**
   * Texte affiché à la place de la valeur numérique formatée (ex. « 7 ans et 4 mois », « Dès l'achat », « Aucun ») ;
   * il nomme aussi la carte pour les technologies d'assistance. `null` : la valeur est formatée selon `format`.
   */
  readonly valueText = input<string | null>(null);
  readonly delta = input<LcKpiDelta>();
  readonly hint = input<string>();
  readonly loading = input(false, { transform: booleanAttribute });
  /** Valeur atténuée pendant un recalcul. */
  readonly stale = input(false, { transform: booleanAttribute });

  /** Une valeur numérique sans texte libre : le chiffre compte jusqu'à elle (`lcCountUp`) et flashe à chaque changement. */
  protected readonly counted = computed(() => this.valueText() === null && this.value() !== null);
  protected readonly displayText = computed(() => this.valueText() ?? this.formatService.format(this.value(), this.format()));
  /** Nom du groupe : libellé et valeur affichée (le texte libre remplace le nombre). */
  protected readonly accessibleName = computed(() => (this.loading() ? this.label() : `${this.label()} : ${this.displayText()}`));
  protected readonly trendIcon = computed(() => TREND_ICONS[this.delta()?.trend ?? 'flat']);
  protected readonly deltaText = computed(() => {
    const delta = this.delta();
    if (!delta) return '';
    const sign = delta.value > 0 ? '+' : delta.value < 0 ? '−' : '';
    return `${sign}${this.formatService.format(Math.abs(delta.value), delta.format)}`;
  });
}
