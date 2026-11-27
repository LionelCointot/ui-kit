import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LcIconComponent, LcRevealDirective } from '@lionelcointot/ui-angular';

/**
 * Événement d'un `ol[lcActivityFeed]` : icône, titre, contenu libre projeté (par exemple une valeur avant et après)
 * et date. Le texte de la date est fourni tel quel par l'application ; `dateTime` (valeur machine) devient
 * l'attribut `datetime` de l'élément `<time>`.
 */
@Component({
  selector: 'li[lcActivityItem]',
  imports: [LcIconComponent],
  template: `
    <span class="lc-activity-item__dot">
      @if (icon(); as name) {
        <lc-icon [name]="name" />
      }
    </span>
    <div class="lc-activity-item__body">
      <div class="lc-activity-item__header">
        <p class="lc-activity-item__heading">{{ heading() }}</p>
        @if (date(); as text) {
          <time class="lc-activity-item__date" [attr.datetime]="dateTime() ?? null">{{ text }}</time>
        }
      </div>
      <div class="lc-activity-item__content"><ng-content /></div>
    </div>
  `,
  styleUrl: './activity-item.component.css',
  hostDirectives: [LcRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-activity-item' },
})
export class LcActivityItemComponent {
  /** Titre de l'événement. */
  readonly heading = input.required<string>();
  /** Nom d'une icône du registre `lc-icon` ; absent : pastille vide. */
  readonly icon = input<string>();
  /** Texte de la date, affiché tel quel. */
  readonly date = input<string>();
  /** Valeur machine de la date (ISO 8601), posée sur `datetime`. */
  readonly dateTime = input<string>();
}
