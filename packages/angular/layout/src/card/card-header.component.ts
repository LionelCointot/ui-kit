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
        <h2 class="lc-card-header__title">{{ title() }}</h2>
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
}
