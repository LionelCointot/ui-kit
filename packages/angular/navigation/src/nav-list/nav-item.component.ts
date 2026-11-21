import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input } from '@angular/core';
import { RouterLinkActive } from '@angular/router';
import { LcIconComponent } from '@lionelcointot/ui-angular';
import { LcNavListComponent } from './nav-list.component';

/**
 * Élément de navigation : `<a lcNavItem routerLink="/credit" icon="landmark">Crédit</a>`.
 * L'élément actif (`RouterLinkActive`) reçoit `aria-current="page"`. `routerLinkActiveOptions` est accepté
 * (par exemple `{ exact: true }`).
 */
@Component({
  selector: 'a[lcNavItem]',
  imports: [LcIconComponent],
  template: `
    @if (icon()) {
      <lc-icon class="lc-nav-item__icon" [name]="icon()!" />
    }
    <span class="lc-nav-item__label"><ng-content /></span>
    @if (badge()) {
      <span class="lc-nav-item__badge">{{ badge() }}</span>
    }
  `,
  styleUrl: './nav-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: RouterLinkActive, inputs: ['routerLinkActiveOptions'], outputs: ['isActiveChange'] }],
  host: {
    class: 'lc-nav-item',
    '[class.lc-nav-item--indicated]': '!!list',
    '[class.lc-nav-item--collapsed]': 'list?.collapsed()',
    '[attr.title]': 'list?.collapsed() ? label() : null',
  },
})
export class LcNavItemComponent {
  protected readonly list = inject(LcNavListComponent, { optional: true });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly icon = input<string>();
  readonly badge = input<string>();

  constructor() {
    const active = inject(RouterLinkActive, { self: true });
    active.routerLinkActive = 'lc-nav-item--active';
    active.ariaCurrentWhenActive = 'page';
    // Dans une liste, le fond actif est porté par son indicateur glissant.
    const list = this.list;
    if (!list) return;
    const element = this.element.nativeElement;
    const subscription = active.isActiveChange.subscribe((isActive) => list.register(element, isActive));
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      list.register(element, false);
    });
  }

  /** Texte du libellé (info-bulle et nom accessible en mode réduit). */
  protected label(): string {
    return this.element.nativeElement.querySelector('.lc-nav-item__label')?.textContent?.trim() ?? '';
  }
}
