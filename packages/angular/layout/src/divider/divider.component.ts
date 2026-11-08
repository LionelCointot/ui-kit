import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Séparateur horizontal ou vertical (`role="separator"`). */
@Component({
  selector: 'lc-divider',
  template: '',
  styleUrl: './divider.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-divider',
    role: 'separator',
    '[attr.aria-orientation]': 'orientation()',
    '[class.lc-divider--vertical]': "orientation() === 'vertical'",
  },
})
export class LcDividerComponent {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
