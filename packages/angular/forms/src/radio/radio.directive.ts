import { Directive, inject } from '@angular/core';
import { LC_RADIO_GROUP } from './radio-group.component';

/** Bouton radio natif stylé (`input[type=radio][lcRadio]`). Dans un `lc-radio-group`, le `name` est commun. Styles : `ui-angular.css`. */
@Directive({
  selector: 'input[type=radio][lcRadio]',
  host: { class: 'lc-radio', '[attr.name]': 'group?.name ?? null' },
})
export class LcRadioDirective {
  protected readonly group = inject(LC_RADIO_GROUP, { optional: true });
}
