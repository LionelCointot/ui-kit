import { HostAttributeToken, Signal, computed, inject } from '@angular/core';
import { joinIds } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LcFormFieldContext } from '../form-field/form-field-control';

/**
 * ARIA commun aux directives posées sur un contrôle natif (lcInput, lcSelect, lcCheckbox) :
 * description et état fournis par `lc-form-field`, sans écraser un aria-describedby statique du consommateur.
 */
export function nativeControlAria(invalid: Signal<boolean>, touched: Signal<boolean>): {
  readonly field: LcFormFieldContext | null;
  readonly showInvalid: Signal<boolean>;
  readonly describedBy: Signal<string | null>;
  readonly required: Signal<boolean>;
} {
  const field = inject(LC_FORM_FIELD, { optional: true });
  const staticDescribedBy = inject(new HostAttributeToken('aria-describedby'), { optional: true });
  return {
    field,
    // Dans un champ : erreurs affichées par le champ. Seul : `invalid` forcé, ou invalide et touché.
    showInvalid: computed(() => (field ? field.showInvalid() || (invalid() && touched()) : invalid())),
    describedBy: computed(() => joinIds(staticDescribedBy, field?.describedBy())),
    required: computed(() => field?.isRequired() ?? false),
  };
}
