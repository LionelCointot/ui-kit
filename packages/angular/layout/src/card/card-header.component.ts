import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LcIconComponent } from '@lionelcointot/ui-angular';
import { LcCardComponent } from './card.component';

/** En-tête de carte : `title`, `subtitle` et actions (`[lcCardActions]`). Bouton de repli si la carte est `collapsible`. */
@Component({
  selector: 'lc-card-header',
  imports: [LcIconComponent],
  template: `
    <div class="lc-card-header__text">
      @if (card?.collapsible()) {
        <button type="button" class="lc-card-header__toggle" [attr.aria-expanded]="card!.expanded()"
          [attr.aria-controls]="card!.bodyId" (click)="card!.toggle()">
          <lc-icon class="lc-card-header__chevron" [name]="card!.expanded() ? 'chevron-up' : 'chevron-down'" />
          <span class="lc-card-header__title">{{ title() }}</span>
        </button>
      } @else {
        @switch (headingLevel()) {
          @case (3) {
            <h3 class="lc-card-header__title">{{ title() }}</h3>
          }
          @case (4) {
            <h4 class="lc-card-header__title">{{ title() }}</h4>
          }
          @default {
            <h2 class="lc-card-header__title">{{ title() }}</h2>
          }
        }
      }
      @if (subtitle()) {
        <p class="lc-card-header__subtitle">{{ subtitle() }}</p>
      }
    </div>
    <div class="lc-card-header__actions"><ng-content select="[lcCardActions]" /></div>
  `,
  styleUrl: './card-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-card-header' },
})
export class LcCardHeaderComponent {
  protected readonly card = inject(LcCardComponent, { optional: true });

  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  /** Niveau du titre (`h2` par défaut). Dans un dialogue dont le titre est un `h2`, une carte prend `3` pour ne pas sauter le niveau. Sans effet si la carte est `collapsible` (le titre est alors un bouton). */
  readonly headingLevel = input<2 | 3 | 4>(2);
}
