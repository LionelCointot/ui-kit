import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Barre de progression (`role="progressbar"`) : valeur de 0 à 100, ou `null` pour une progression indéterminée. */
@Component({
  selector: 'lc-progress-bar',
  template: '<span class="lc-progress-bar__fill" [style.width.%]="percent() ?? null"></span>',
  styleUrl: './progress-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-progress-bar',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percent()',
    '[attr.aria-label]': 'label() || null',
    '[class.lc-progress-bar--indeterminate]': 'percent() === null',
  },
})
export class LcProgressBarComponent {
  readonly value = input<number | null>(null);
  readonly label = input<string>();

  protected readonly percent = computed(() => {
    const value = this.value();
    return value === null || Number.isNaN(value) ? null : Math.min(100, Math.max(0, value));
  });
}
