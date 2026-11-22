import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, model } from '@angular/core';
import { LcIconComponent, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcNavListComponent } from '../nav-list/nav-list.component';

/**
 * Groupe de navigation titré, à placer dans `lc-nav-list` : `<lc-nav-group label="Général"><a lcNavItem …/></lc-nav-group>`.
 * Annoncé comme `role="group"` avec son titre. En mode réduit (`lc-nav-list [collapsed]`), le titre reste lu par les
 * technologies d'assistance mais disparaît de l'écran, remplacé par un séparateur fin ; le groupe reste déplié.
 * Avec `collapsible`, le titre est un bouton (`aria-expanded`) qui replie les éléments (retirés de la tabulation).
 */
@Component({
  selector: 'lc-nav-group',
  imports: [LcIconComponent],
  template: `
    <div class="lc-nav-group__group" role="group" [attr.aria-labelledby]="titleId">
      @if (isCollapsible()) {
        <button type="button" class="lc-nav-group__title lc-nav-group__toggle" [id]="titleId"
          [attr.aria-expanded]="expanded()" [attr.aria-controls]="itemsId" (click)="expanded.set(!expanded())">
          <span class="lc-nav-group__label">{{ label() }}</span>
          <lc-icon class="lc-nav-group__chevron" name="chevron-right" aria-hidden="true" />
        </button>
      } @else {
        <p class="lc-nav-group__title" [id]="titleId"><span class="lc-nav-group__label">{{ label() }}</span></p>
      }
      <div class="lc-nav-group__items" [id]="itemsId" [class.lc-nav-group__items--open]="isExpanded()" [attr.inert]="isExpanded() ? null : ''">
        <div class="lc-nav-group__items-clip"><div class="lc-nav-group__items-body"><ng-content /></div></div>
      </div>
    </div>
  `,
  styleUrl: './nav-group.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-nav-group', '[class.lc-nav-group--list-collapsed]': 'list?.collapsed()' },
})
export class LcNavGroupComponent {
  protected readonly list = inject(LcNavListComponent, { optional: true });

  /** Titre du groupe. */
  readonly label = input.required<string>();
  /** Le titre devient un bouton qui replie le groupe. */
  readonly collapsible = input(false, { transform: booleanAttribute });
  /** Groupe déplié (utile si `collapsible`). */
  readonly expanded = model(true);

  protected readonly titleId = lcUniqueId('nav-group-title');
  protected readonly itemsId = lcUniqueId('nav-group-items');
  /** En mode réduit de la liste, le titre n'est plus visible : pas de bouton, groupe toujours déplié. */
  protected readonly isCollapsible = computed(() => this.collapsible() && !this.list?.collapsed());
  protected readonly isExpanded = computed(() => !this.isCollapsible() || this.expanded());
}
