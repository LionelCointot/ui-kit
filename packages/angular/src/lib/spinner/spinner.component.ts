import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LC_LABELS } from '../core/labels';
import { LC_DEFAULTS } from '../core/options';
import { LcSize } from '../core/types';

/** Indicateur de chargement : anneau décoratif + texte masqué visuellement, annoncé (`role="status"`). */
@Component({
  selector: 'lc-spinner',
  template: `
    <span class="lc-spinner__ring" aria-hidden="true"></span>
    <span class="lc-visually-hidden">{{ resolvedLabel() }}</span>
  `,
  styleUrl: './spinner.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-spinner',
    role: 'status',
    '[class]': "'lc-spinner--' + resolvedSize()",
  },
})
export class LcSpinnerComponent {
  private readonly labels = inject(LC_LABELS);
  private readonly defaults = inject(LC_DEFAULTS);

  readonly size = input<LcSize | undefined>(undefined);
  /** Texte annoncé (défaut : `LC_LABELS.loading`). */
  readonly label = input<string>();

  protected readonly resolvedSize = computed(() => this.size() ?? this.defaults.size);
  protected readonly resolvedLabel = computed(() => this.label() || this.labels.loading);
}
