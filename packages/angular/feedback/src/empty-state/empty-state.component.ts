import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LcIconComponent } from '@lionelcointot/ui-angular';

/** État vide : icône facultative, titre, description et actions (`[lcEmptyActions]`). */
@Component({
  selector: 'lc-empty-state',
  imports: [LcIconComponent],
  template: `
    @if (icon(); as icon) {
      <lc-icon class="lc-empty-state__icon" [name]="icon" />
    }
    <p class="lc-empty-state__title">{{ title() }}</p>
    @if (description()) {
      <p class="lc-empty-state__description">{{ description() }}</p>
    }
    <div class="lc-empty-state__actions"><ng-content select="[lcEmptyActions]" /></div>
  `,
  styleUrl: './empty-state.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-empty-state' },
})
export class LcEmptyStateComponent {
  readonly icon = input<string>();
  readonly title = input.required<string>();
  readonly description = input<string>();
}
