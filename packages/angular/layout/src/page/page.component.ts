import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page : titre `<h1>`, description, actions (`[lcPageActions]`), barre d'outils (`[lcPageToolbar]`) et contenu. */
@Component({
  selector: 'lc-page',
  template: `
    <header class="lc-page__header">
      <div class="lc-page__heading">
        <h1 class="lc-page__title" tabindex="-1">{{ title() }}</h1>
        @if (description()) {
          <p class="lc-page__description">{{ description() }}</p>
        }
      </div>
      <div class="lc-page__actions"><ng-content select="[lcPageActions]" /></div>
    </header>
    <div class="lc-page__toolbar"><ng-content select="[lcPageToolbar]" /></div>
    <div class="lc-page__content"><ng-content /></div>
  `,
  styleUrl: './page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-page' },
})
export class LcPageComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
