import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Fil d'historique : liste ordonnée verticale d'événements. S'applique à un `<ol>` natif dont les
 * enfants sont des `<li lcActivityItem>` ; le trait de liaison relie les éléments, sauf après le dernier.
 *
 * @example <ol lcActivityFeed density="compact"><li lcActivityItem heading="Étape validée" icon="check" date="12 mars">…</li></ol>
 */
@Component({
  selector: 'ol[lcActivityFeed]',
  template: '<ng-content />',
  styleUrl: './activity-feed.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-activity-feed',
    // `list-style: none` retire la sémantique de liste de certains lecteurs d'écran : on la pose explicitement.
    role: 'list',
    '[class.lc-activity-feed--compact]': "density() === 'compact'",
  },
})
export class LcActivityFeedComponent {
  /** Mêmes valeurs que `lc-table`. */
  readonly density = input<'comfortable' | 'compact'>('comfortable');
}
