import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, input, isDevMode } from '@angular/core';
import { LC_DEFAULTS, LcIconComponent, LcSize } from '@lionelcointot/ui-angular';
import { LC_STATUS_ICONS, LcStatusBadgeKind } from '../status-icons';

/**
 * Indicateur d'état : toujours une icône et un libellé (le contenu), jamais la couleur seule.
 * Non interactif. L'icône est décorative : le texte porte le sens et le nom accessible.
 */
@Component({
  selector: 'lc-status-badge',
  imports: [LcIconComponent],
  template: `
    <lc-icon class="lc-status-badge__icon" [name]="iconName()" />
    <span class="lc-status-badge__label"><ng-content /></span>
  `,
  styleUrl: './status-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-status-badge', '[class]': 'variantClasses()' },
})
export class LcStatusBadgeComponent {
  private readonly defaults = inject(LC_DEFAULTS);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Rôle de couleur et icône par défaut. */
  readonly kind = input<LcStatusBadgeKind>('neutral');
  /** Nom d'une icône `lc-icon` qui remplace celle du rôle. */
  readonly icon = input<string>();
  readonly size = input<LcSize | undefined>(undefined);

  protected readonly iconName = computed(() => this.icon() || LC_STATUS_ICONS[this.kind()]);
  protected readonly variantClasses = computed(
    () => `lc-status-badge--${this.kind()} lc-status-badge--${this.size() ?? this.defaults.size}`);

  constructor() {
    if (isDevMode()) {
      afterNextRender(() => {
        if (!this.host.nativeElement.textContent?.trim()) {
          console.warn('[lc-status-badge] Le libellé (contenu) est obligatoire : le statut ne doit pas reposer sur l\'icône ni la couleur seules.');
        }
      });
    }
  }
}
