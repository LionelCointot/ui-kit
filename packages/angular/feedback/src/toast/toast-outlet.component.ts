import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LC_LABELS, LcIconComponent } from '@lionelcointot/ui-angular';
import { LC_STATUS_ICONS } from '../status-icons';
import { LcToast, LcToastService } from './toast.service';

/**
 * Zone d'affichage des toasts de `LcToastService`, à placer une fois à la racine de l'application.
 * Variable CSS `--lc-toast-offset-block-end` : décalage de la pile vers le haut (ex. au-dessus d'une barre d'actions fixe).
 */
@Component({
  selector: 'lc-toast-outlet',
  imports: [LcIconComponent],
  template: `
    @if (toasts().length > 0) {
      <section class="lc-toast-outlet__region" [attr.aria-label]="labels.notifications">
        @for (toast of toasts(); track toast.id) {
          <div class="lc-toast" [class]="'lc-toast--' + toast.kind" animate.enter="lc-toast-enter" animate.leave="lc-toast-leave"
            (mouseenter)="service.pause(toast.id)" (mouseleave)="service.resume(toast.id)"
            (focusin)="service.pause(toast.id)" (focusout)="service.resume(toast.id)">
            <lc-icon class="lc-toast__icon" [name]="icons[toast.kind]" />
            <p class="lc-toast__message">{{ toast.message }}</p>
            @if (toast.action; as action) {
              <button type="button" class="lc-toast__action" (click)="runAction(toast)">{{ action.label }}</button>
            }
            <button type="button" class="lc-toast__close" [attr.aria-label]="labels.close" (click)="service.dismiss(toast.id)">
              <lc-icon name="x" />
            </button>
          </div>
        }
      </section>
    }
  `,
  styleUrl: './toast-outlet.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-toast-outlet' },
})
export class LcToastOutletComponent {
  protected readonly service = inject(LcToastService);
  protected readonly labels = inject(LC_LABELS);
  protected readonly icons = LC_STATUS_ICONS;
  protected readonly toasts = this.service.toasts;

  protected runAction(toast: LcToast): void {
    toast.action?.run();
    this.service.dismiss(toast.id);
  }
}
