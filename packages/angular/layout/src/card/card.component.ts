import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, model } from '@angular/core';
import type { LcSpace } from '@lionelcointot/ui-angular';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import { lcSpaceVar } from '../space';

/**
 * Carte : surface avec élévation. Avec `collapsible`, l'en-tête (`lc-card-header`) devient un bouton
 * (`aria-expanded`, `aria-controls`) qui replie le contenu et le pied.
 */
@Component({
  selector: 'lc-card',
  template: `
    <ng-content select="lc-card-header" />
    <div class="lc-card__body" [id]="bodyId" [hidden]="collapsible() && !expanded()">
      <div class="lc-card__content"><ng-content /></div>
      <div class="lc-card__footer"><ng-content select="[lcCardFooter]" /></div>
    </div>
  `,
  styleUrl: './card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-card',
    '[class]': "'lc-card--elevation-' + elevation()",
    '[style.--_padding]': 'paddingValue()',
  },
})
export class LcCardComponent {
  readonly elevation = input<0 | 1 | 2>(1);
  readonly padding = input<LcSpace>('5');
  readonly collapsible = input(false, { transform: booleanAttribute });
  readonly expanded = model(true);

  /** Identifiant du corps, relié par `aria-controls` depuis l'en-tête. */
  readonly bodyId = lcUniqueId('card-body');
  protected readonly paddingValue = computed(() => lcSpaceVar(this.padding()));

  toggle(): void {
    this.expanded.update((value) => !value);
  }
}
