import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LcResponsiveNumber, resolveResponsive } from '../space';

/** Élément de `lc-grid` : occupe `span` colonnes (plafonné au nombre de colonnes courant). */
@Component({
  selector: 'lc-grid-item',
  template: '<ng-content />',
  styleUrl: './grid-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-grid-item',
    '[style.--_span]': 'spans().base',
    '[style.--_span-sm]': 'spans().sm',
    '[style.--_span-md]': 'spans().md',
    '[style.--_span-lg]': 'spans().lg',
    '[style.--_span-xl]': 'spans().xl',
  },
})
export class LcGridItemComponent {
  /** Nombre de colonnes occupées, ou nombre par point de rupture du conteneur. Défaut : 1. */
  readonly span = input<LcResponsiveNumber>(1);

  protected readonly spans = computed(() => ({
    base: resolveResponsive(this.span(), 'base'),
    sm: resolveResponsive(this.span(), 'sm'),
    md: resolveResponsive(this.span(), 'md'),
    lg: resolveResponsive(this.span(), 'lg'),
    xl: resolveResponsive(this.span(), 'xl'),
  }));
}
