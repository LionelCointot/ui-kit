import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { LC_LABELS, LcFormatService, LcSize } from '@lionelcointot/ui-angular';

export type LcMeterColor = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

/**
 * Jauge statique (`role="meter"`) : une mesure dans une plage connue (taux de remplissage, quota).
 * Pour la progression d'une tâche, utiliser `lc-progress-bar`. Une valeur `null` signifie « non mesuré ».
 * La couleur ne porte jamais seule la lecture : `showValue` affiche la valeur, `aria-valuetext` la fournit.
 */
@Component({
  selector: 'lc-meter',
  template: `
    <span class="lc-meter__track" aria-hidden="true">
      <span class="lc-meter__fill" [style.inline-size.%]="fillPercent()"></span>
    </span>
    @if (showValue()) {
      <span class="lc-meter__value">{{ displayText() }}</span>
    }
  `,
  styleUrl: './meter.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-meter',
    role: 'meter',
    '[class]': "'lc-meter--' + themeColor() + ' lc-meter--' + size()",
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'ariaValue()',
    '[attr.aria-valuetext]': 'ariaText()',
  },
})
export class LcMeterComponent {
  private readonly labels = inject(LC_LABELS);
  private readonly format = inject(LcFormatService);

  /** Valeur mesurée ; `null` : non mesuré (piste vide). */
  readonly value = input.required<number | null>();
  readonly min = input(0);
  readonly max = input(100);
  /** Nom accessible de la jauge. */
  readonly label = input.required<string>();
  /** Texte lu par les technologies d'assistance ; défaut : la valeur formatée. */
  readonly valueText = input<string>();
  readonly themeColor = input<LcMeterColor>('primary');
  readonly size = input<LcSize>('small');
  readonly showValue = input(false, { transform: booleanAttribute });

  private readonly measured = computed(() => {
    const value = this.value();
    return value === null || Number.isNaN(value) ? null : value;
  });

  /** Remplissage de 0 à 100 : valeur recadrée dans les bornes, `0` sans mesure ou plage vide. */
  protected readonly fillPercent = computed(() => {
    const value = this.measured();
    const span = this.max() - this.min();
    if (value === null || span <= 0) return 0;
    return Math.min(100, Math.max(0, ((value - this.min()) / span) * 100));
  });

  /** `aria-valuenow` reste la valeur fournie (non recadrée) ; sans mesure, la borne basse (attribut requis par le rôle). */
  protected readonly ariaValue = computed(() => this.measured() ?? this.min());
  protected readonly displayText = computed(() => {
    const value = this.measured();
    return value === null ? this.format.number(null) : (this.valueText() ?? this.format.number(value));
  });
  protected readonly ariaText = computed(() => (this.measured() === null ? this.labels.noValue : this.displayText()));
}
