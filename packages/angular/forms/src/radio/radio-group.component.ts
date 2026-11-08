import { ChangeDetectionStrategy, Component, InjectionToken, input } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';

/** Contexte d'un groupe de boutons radio : `name` commun, fourni aux `input[type=radio][lcRadio]` enfants. */
export interface LcRadioGroupContext {
  readonly name: string;
}
export const LC_RADIO_GROUP = new InjectionToken<LcRadioGroupContext>('LC_RADIO_GROUP');

/**
 * Groupe de boutons radio : `<fieldset>` et `<legend>` (obligatoire) natifs. Les `input[type=radio][lcRadio]`
 * projetés reçoivent un `name` commun généré ; la valeur reste gérée par le formulaire.
 */
@Component({
  selector: 'lc-radio-group',
  template: `
    <fieldset class="lc-radio-group__fieldset">
      <legend class="lc-radio-group__legend">{{ legend() }}</legend>
      <div class="lc-radio-group__items" [class.lc-radio-group__items--horizontal]="orientation() === 'horizontal'"><ng-content /></div>
    </fieldset>
  `,
  styleUrl: './radio-group.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_RADIO_GROUP, useFactory: () => ({ name: lcUniqueId('radio-group') }) }],
  host: { class: 'lc-radio-group' },
})
export class LcRadioGroupComponent {
  readonly legend = input.required<string>();
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
}
