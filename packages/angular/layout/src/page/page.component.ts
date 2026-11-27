import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { LcSplitTextDirective } from '@lionelcointot/ui-angular';

/**
 * Page : titre `<h1>`, description, actions (`[lcPageActions]`), barre d'outils (`[lcPageToolbar]`) et contenu.
 * Son apparition (première ouverture, ou changement de page : le routeur crée alors une nouvelle page) est « l'entrée de page » : le temps de
 * `--lc-page-layer-window`, elle porte `lc-page--entering` et les composants qui entrent partent à leur couche (KPI, cartes, lignes, jauges, points ; `motion.css`).
 */
@Component({
  selector: 'lc-page',
  template: `
    <header class="lc-page__header">
      <div class="lc-page__heading">
        <h1 class="lc-page__title" tabindex="-1" [lcSplitText]="title()"></h1>
        <span class="lc-page__line" aria-hidden="true"></span>
        @if (description()) {
          <p class="lc-page__description">{{ description() }}</p>
        }
      </div>
      <div class="lc-page__actions"><ng-content select="[lcPageActions]" /></div>
    </header>
    <div class="lc-page__toolbar"><ng-content select="[lcPageToolbar]" /></div>
    <div class="lc-page__content"><ng-content /></div>
  `,
  imports: [LcSplitTextDirective],
  styleUrl: './page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-page', '[class.lc-page--entering]': 'entering()', '(animationend)': 'ended($event)', '(animationcancel)': 'ended($event)' },
})
export class LcPageComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();

  protected readonly entering = signal(true);

  /**
   * La fenêtre de l'entrée (`--lc-page-layer-window`) est écoulée ; les `animationend` des enfants remontent jusqu'ici, on ne garde que le nôtre.
   * shortcut: sous mouvement réduit ou sans feuille du kit, l'animation ne tourne pas et la classe reste posée ; sans effet, les variables de couche y sont indéfinies.
   */
  protected ended(event: AnimationEvent): void {
    if (event.target === event.currentTarget && event.animationName === 'lc-page-entering') this.entering.set(false);
  }
}
