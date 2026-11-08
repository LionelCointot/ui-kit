import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LC_DEFAULTS, LcFillMode, LcSize, LcThemeColor } from '@lionelcointot/ui-angular';

/** Badge textuel (ex. « estimation »). Couleur de rôle, remplissage `flat` par défaut. */
@Component({
  selector: 'lc-badge',
  template: '<ng-content />',
  styleUrl: './badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-badge', '[class]': 'variantClasses()' },
})
export class LcBadgeComponent {
  private readonly defaults = inject(LC_DEFAULTS);

  readonly themeColor = input<LcThemeColor>('neutral');
  readonly fillMode = input<LcFillMode>('flat');
  readonly size = input<LcSize | undefined>(undefined);

  protected readonly variantClasses = computed(
    () => `lc-badge--${this.fillMode()} lc-badge--${this.themeColor()} lc-badge--${this.size() ?? this.defaults.size}`);
}
