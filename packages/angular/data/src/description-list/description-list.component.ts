import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LcFormatService, LcValueFormat } from '@lionelcointot/ui-angular';
import { LcBadgeComponent } from '@lionelcointot/ui-angular/feedback';

export interface LcDescriptionItem {
  readonly term: string;
  readonly value: unknown;
  readonly format?: LcValueFormat;
  readonly detail?: string;
  /** Ligne de total : en gras, séparée par un trait. */
  readonly emphasis?: boolean;
  /** Mention à côté du terme (ex. « estimation »). */
  readonly badge?: string;
}

/** Liste de définitions (`<dl>`) : paires terme / valeur formatée, avec ligne de total et mention. */
@Component({
  selector: 'lc-description-list',
  imports: [LcBadgeComponent],
  template: `
    <dl class="lc-description-list__list">
      @for (item of items(); track $index) {
        <div class="lc-description-list__row" [class.lc-description-list__row--emphasis]="item.emphasis">
          <dt class="lc-description-list__term">
            {{ item.term }}
            @if (item.badge) {
              <lc-badge size="small">{{ item.badge }}</lc-badge>
            }
          </dt>
          <dd class="lc-description-list__value">
            {{ text(item) }}
            @if (item.detail) {
              <span class="lc-description-list__detail">{{ item.detail }}</span>
            }
          </dd>
        </div>
      }
    </dl>
  `,
  styleUrl: './description-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-description-list', '[class.lc-description-list--inline]': "layout() === 'inline'" },
})
export class LcDescriptionListComponent {
  private readonly format = inject(LcFormatService);

  readonly items = input.required<readonly LcDescriptionItem[]>();
  readonly layout = input<'stacked' | 'inline'>('inline');

  protected text(item: LcDescriptionItem): string {
    return this.format.format(item.value, item.format);
  }
}
