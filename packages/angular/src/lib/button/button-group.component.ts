import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, input } from '@angular/core';

/** Groupe de boutons (`role="group"`), bordures jointes si `attached`. */
@Component({
  selector: 'lc-button-group',
  template: '<ng-content />',
  styleUrl: './button-group.component.css',
  // Les règles visent les boutons projetés (enfants directs) : pas d'encapsulation, sélecteurs préfixés par l'élément.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-button-group',
    role: 'group',
    '[attr.aria-label]': 'ariaLabel()',
    '[class.lc-button-group--attached]': 'attached()',
  },
})
export class LcButtonGroupComponent {
  /** Nom accessible du groupe (obligatoire). */
  readonly ariaLabel = input.required<string>();
  readonly attached = input(false, { transform: booleanAttribute });
}
