import { ChangeDetectionStrategy, Component, Directive, computed, contentChild, inject, input, output } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';

/** Détail technique repliable d'un `lc-error-state` (ex. identifiant de trace). */
@Directive({ selector: '[lcErrorDetails]' })
export class LcErrorDetailsDirective {}

/** État d'erreur : titre, description, bouton « Réessayer » (sortie `retry`), détail technique repliable. */
@Component({
  selector: 'lc-error-state',
  imports: [LcIconComponent, LcButtonComponent],
  template: `
    <lc-icon class="lc-error-state__icon" name="circle-alert" />
    <p class="lc-error-state__title">{{ title() }}</p>
    @if (description()) {
      <p class="lc-error-state__description">{{ description() }}</p>
    }
    <button lcButton type="button" fillMode="outline" themeColor="neutral" (click)="retry.emit()">
      <lc-icon name="rotate-ccw" /> {{ resolvedRetryLabel() }}
    </button>
    @if (details()) {
      <details class="lc-error-state__details">
        <summary>{{ labels.details }}</summary>
        <div class="lc-error-state__details-content"><ng-content select="[lcErrorDetails]" /></div>
      </details>
    }
  `,
  styleUrl: './error-state.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-error-state' },
})
export class LcErrorStateComponent {
  protected readonly labels = inject(LC_LABELS);

  readonly title = input.required<string>();
  readonly description = input<string>();
  /** Libellé du bouton (défaut : `LC_LABELS.retry`). */
  readonly retryLabel = input<string>();
  readonly retry = output<void>();

  protected readonly details = contentChild(LcErrorDetailsDirective);
  protected readonly resolvedRetryLabel = computed(() => this.retryLabel() || this.labels.retry);
}
