import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import type { LcSpace } from '@lionelcointot/ui-angular';
import { lcSpaceVar } from '../space';

/** Pile flexible : empile ses enfants verticalement ou horizontalement avec un espacement des tokens. */
@Component({
  selector: 'lc-stack',
  template: '<ng-content />',
  styleUrl: './stack.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-stack',
    '[class.lc-stack--horizontal]': "direction() === 'horizontal'",
    '[class.lc-stack--wrap]': 'wrap()',
    '[style.gap]': 'gapValue()',
    '[style.align-items]': 'alignValue()',
    '[style.justify-content]': 'justifyValue()',
  },
})
export class LcStackComponent {
  readonly direction = input<'vertical' | 'horizontal'>('vertical');
  readonly gap = input<LcSpace>('4');
  readonly align = input<'start' | 'center' | 'end' | 'stretch' | 'baseline'>();
  readonly justify = input<'start' | 'center' | 'end' | 'between'>();
  readonly wrap = input(false, { transform: booleanAttribute });

  protected readonly gapValue = computed(() => lcSpaceVar(this.gap()));
  protected readonly alignValue = computed(() => cssAlign(this.align()));
  protected readonly justifyValue = computed(() => (this.justify() === 'between' ? 'space-between' : cssAlign(this.justify())));
}

function cssAlign(value: string | undefined): string | null {
  if (!value) return null;
  return value === 'start' || value === 'end' ? `flex-${value}` : value;
}
