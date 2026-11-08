import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';

/** Squelette de chargement (décoratif, `aria-hidden`). Le parent annonce le chargement (ex. `lc-spinner`, `aria-busy`). */
@Component({
  selector: 'lc-skeleton',
  template: `
    @for (line of lineIndexes(); track line) {
      <span class="lc-skeleton__bone" [class.lc-skeleton__bone--last]="line > 0 && line === lineIndexes().length - 1"></span>
    }
  `,
  styleUrl: './skeleton.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-skeleton',
    'aria-hidden': 'true',
    '[class]': "'lc-skeleton--' + shape()",
    '[style.width]': 'width()',
    '[style.height]': 'height()',
  },
})
export class LcSkeletonComponent {
  readonly shape = input<'text' | 'rect' | 'circle'>('text');
  /** Nombre de lignes (forme `text`). */
  readonly lines = input(1, { transform: numberAttribute });
  /** Largeur CSS (ex. '12rem', '60%'). */
  readonly width = input<string>();
  /** Hauteur CSS (formes `rect` et `circle`). */
  readonly height = input<string>();

  protected readonly lineIndexes = computed(() => {
    const count = this.shape() === 'text' ? Math.max(1, Math.floor(this.lines() || 1)) : 1;
    return Array.from({ length: count }, (_, index) => index);
  });
}
