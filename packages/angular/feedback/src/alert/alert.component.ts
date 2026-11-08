import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, output, signal } from '@angular/core';
import { LC_LABELS, LcIconComponent, LcStatusKind } from '@lionelcointot/ui-angular';
import { LC_STATUS_ICONS } from '../status-icons';

/**
 * Alerte : toujours une icône et un texte. Avec `live`, l'insertion dynamique est annoncée
 * (`role="alert"` pour warning et error, `role="status"` sinon).
 */
@Component({
  selector: 'lc-alert',
  imports: [LcIconComponent],
  template: `
    <lc-icon class="lc-alert__icon" [name]="icon()" />
    <div class="lc-alert__content">
      @if (title()) {
        <p class="lc-alert__title">{{ title() }}</p>
      }
      <div class="lc-alert__message"><ng-content /></div>
    </div>
    @if (dismissible()) {
      <button type="button" class="lc-alert__close" [attr.aria-label]="labels.close" (click)="dismiss()">
        <lc-icon name="x" />
      </button>
    }
  `,
  styleUrl: './alert.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-alert',
    '[class]': "'lc-alert--' + kind()",
    '[attr.role]': 'role()',
    '[hidden]': 'isDismissed()',
  },
})
export class LcAlertComponent {
  protected readonly labels = inject(LC_LABELS);

  readonly kind = input<LcStatusKind>('info');
  readonly title = input<string>();
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** Alerte insérée dynamiquement : annoncée par les lecteurs d'écran. */
  readonly live = input(false, { transform: booleanAttribute });
  readonly dismissed = output<void>();

  protected readonly isDismissed = signal(false);
  protected readonly icon = computed(() => LC_STATUS_ICONS[this.kind()]);
  protected readonly role = computed(() => {
    if (!this.live()) return null;
    return this.kind() === 'warning' || this.kind() === 'error' ? 'alert' : 'status';
  });

  protected dismiss(): void {
    this.isDismissed.set(true);
    this.dismissed.emit();
  }
}
