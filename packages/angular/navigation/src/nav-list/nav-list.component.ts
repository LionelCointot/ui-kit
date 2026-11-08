import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

/**
 * Liste de navigation : conteneur d'éléments `a[lcNavItem]`. À placer dans un `<nav>` (par exemple
 * l'emplacement `[lcShellNav]` de `lc-app-shell`, qui fournit le repère de navigation).
 */
@Component({
  selector: 'lc-nav-list',
  template: '<ng-content />',
  styleUrl: './nav-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-nav-list', '[class.lc-nav-list--collapsed]': 'collapsed()' },
})
export class LcNavListComponent {
  /** Mode réduit : seules les icônes sont visibles, le libellé passe en info-bulle native. */
  readonly collapsed = input(false, { transform: booleanAttribute });
}
