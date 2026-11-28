import { ChangeDetectionStrategy, Component, booleanAttribute, computed, contentChild, effect, inject, input } from '@angular/core';
import { LC_LABELS, LcCountUpDirective, LcFlashDirective, LcFormatService, LcIconComponent, LcRevealDirective, LcSkeletonComponent, LcThemeColor, LcValueFormat, lcRevealHost } from '@lionelcointot/ui-angular';
import { LcKpiCardLinkDirective } from './kpi-card-link.directive';

export interface LcKpiDelta {
  readonly value: number;
  readonly format: LcValueFormat;
  readonly trend: 'up' | 'down' | 'flat';
  readonly sentiment: 'positive' | 'negative' | 'neutral';
}

const TREND_ICONS = { up: 'arrow-up', down: 'arrow-down', flat: 'arrow-right' } as const;

/**
 * Carte indicateur (entrée `tilt`, chiffre qui compte) : libellé, valeur principale (chiffres tabulaires), pied ancré en bas avec la variation
 * (flèche de tendance et signe à l'écran, mot de tendance pour les lecteurs d'écran : jamais la couleur seule) et la précision. `fillMode="solid"` : tuile pleine de `themeColor`. L'emplacement `[lcKpiVisual]` accueille une sparkline.
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
      <div class="lc-kpi-card__footer">
        @if (delta(); as change) {
          <p class="lc-kpi-card__delta" [class]="'lc-kpi-card__delta--' + change.sentiment">
            <lc-icon [name]="trendIcon()" />
            <span>{{ deltaText() }}</span>
            <span class="lc-kpi-card__trend lc-visually-hidden">{{ trendWord() }}</span>
          </p>
        }
        @if (hint()) {
          <p class="lc-kpi-card__hint">{{ hint() }}</p>
        }
        @if (link()) {
          <lc-icon class="lc-kpi-card__chevron" name="chevron-right" aria-hidden="true" />
        }
      </div>
    }
    <div class="lc-kpi-card__visual"><ng-content select="[lcKpiVisual]" /></div>
    <ng-content select="a[lcKpiCardLink]" />
  `,
  styleUrl: './kpi-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-kpi-card',
    '[class]': 'variantClass()',
    '[attr.role]': "link() ? null : 'group'",
    '[attr.aria-label]': 'link() ? null : accessibleName()',
    '[attr.aria-busy]': "loading() ? 'true' : null",
  },
})
export class LcKpiCardComponent {
  private readonly formatService = inject(LcFormatService);
  private readonly labels = inject(LC_LABELS);

  constructor() {
    effect(() => this.link()?.name.set(this.linkName()));
  }

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
  /** Couleur de la tuile pleine (`fillMode="solid"`) ; sans effet en contour. */
  readonly themeColor = input<LcThemeColor>('neutral');
  readonly fillMode = input<'outline' | 'solid'>('outline');
  /** `horizontal` : libellé et pied à gauche, chiffre à droite. */
  readonly layout = input<'vertical' | 'horizontal'>('vertical');

  /** Ancre projetée : toute la carte devient le lien (le nom accessible passe de la carte à l'ancre). */
  protected readonly link = contentChild(LcKpiCardLinkDirective);

  protected readonly variantClass = computed(
    () => `lc-kpi-card--${this.fillMode()} lc-kpi-card--${this.themeColor()} lc-kpi-card--${this.layout()}${this.link() ? ' lc-kpi-card--linked' : ''}`,
  );

  /** Une valeur numérique sans texte libre : le chiffre compte jusqu'à elle (`lcCountUp`) et flashe à chaque changement. */
  protected readonly counted = computed(() => this.valueText() === null && this.value() !== null);
  protected readonly displayText = computed(() => this.valueText() ?? this.formatService.format(this.value(), this.format()));
  /** Nom du groupe : libellé et valeur affichée (le texte libre remplace le nombre). */
  protected readonly accessibleName = computed(() => (this.loading() ? this.label() : `${this.label()} : ${this.displayText()}`));
  /** « libellé : valeur, variation tendance, précision » : les parties absentes sont omises (en chargement, le libellé seul). */
  protected readonly linkName = computed(() => {
    if (this.loading()) return this.label();
    const change = this.delta();
    const parts = [this.accessibleName(), change && `${this.deltaText()} ${this.trendWord()}`, this.hint()];
    return parts.filter(Boolean).join(', ');
  });
  protected readonly trendIcon = computed(() => TREND_ICONS[this.delta()?.trend ?? 'flat']);
  /** Mot de la tendance, jamais sans `delta` (le gabarit le garde) : une variation nulle dit « stable » (`flat`). */
  protected readonly trendWord = computed(() => {
    const { kpiTrendUp, kpiTrendDown, kpiTrendFlat } = this.labels;
    return { up: kpiTrendUp, down: kpiTrendDown, flat: kpiTrendFlat }[this.delta()?.trend ?? 'flat'];
  });
  protected readonly deltaText = computed(() => {
    const delta = this.delta();
    if (!delta) return '';
    const sign = delta.value > 0 ? '+' : delta.value < 0 ? '−' : '';
    return `${sign}${this.formatService.format(Math.abs(delta.value), delta.format)}`;
  });
}
