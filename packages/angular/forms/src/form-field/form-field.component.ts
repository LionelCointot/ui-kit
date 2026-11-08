import { ChangeDetectionStrategy, Component, booleanAttribute, computed, contentChild, forwardRef, input } from '@angular/core';
import { LcIconComponent, joinIds, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFieldStateLike, LcFormFieldContext } from './form-field-control';

/**
 * Champ de formulaire : libellé relié au contrôle projeté, aide, erreurs client (champ touché et invalide)
 * et erreurs serveur (`errors`), reliées par aria-describedby ; aria-invalid et aria-required sur le contrôle.
 *
 * @example
 * <lc-form-field label="Montant" [state]="form.amount()" [errors]="serverErrors.amount">
 *   <lc-money-input [formField]="form.amount" />
 * </lc-form-field>
 */
@Component({
  selector: 'lc-form-field',
  imports: [LcIconComponent],
  template: `
    <label class="lc-form-field__label" [id]="labelId" [attr.for]="labelFor()" (click)="focusUnlabelableControl()">
      {{ label() }}@if (isRequired()) {<span class="lc-form-field__required" aria-hidden="true">*</span>}
    </label>
    <div class="lc-form-field__body">
      <div class="lc-form-field__row">
        <ng-content select="[lcPrefix]" />
        <div class="lc-form-field__control"><ng-content /></div>
        <ng-content select="[lcSuffix]" />
      </div>
      @if (hint()) {
        <p class="lc-form-field__hint" [id]="hintId">{{ hint() }}</p>
      }
      <div class="lc-form-field__messages" aria-live="polite">
        @if (visibleErrors().length > 0) {
          <ul class="lc-form-field__errors" [id]="errorsId">
            @for (message of visibleErrors(); track message) {
              <li class="lc-form-field__error"><lc-icon name="circle-alert" /><span>{{ message }}</span></li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styleUrl: './form-field.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD, useExisting: forwardRef(() => LcFormFieldComponent) }],
  host: {
    class: 'lc-form-field',
    '[class.lc-form-field--inline]': "layout() === 'inline'",
    '[class.lc-form-field--invalid]': 'showInvalid()',
  },
})
export class LcFormFieldComponent implements LcFormFieldContext {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  /** Messages supplémentaires (ex. erreurs serveur), toujours affichés. */
  readonly errors = input<readonly string[]>([]);
  readonly required = input(false, { transform: booleanAttribute });
  /** État du champ (FieldState de Signal Forms, ou objet compatible). */
  readonly state = input<LcFieldStateLike | null | undefined>(undefined);
  readonly layout = input<'stacked' | 'inline'>('stacked');

  readonly labelId = lcUniqueId('field-label');
  protected readonly hintId = lcUniqueId('field-hint');
  protected readonly errorsId = lcUniqueId('field-errors');

  private readonly control = contentChild(LC_FORM_FIELD_CONTROL, { descendants: true });

  /** État client : l'entrée `state`, sinon l'état transmis au contrôle par `[formField]`. */
  private readonly clientState = computed<LcFieldStateLike | null>(() => {
    const state = this.state();
    if (state) return state;
    const control = this.control();
    const { invalid, touched, errors } = control ?? {};
    if (!invalid || !touched || !errors) return null;
    return { invalid: () => invalid(), touched: () => touched(), errors: () => errors() };
  });

  private readonly clientInvalid = computed(() => {
    const state = this.clientState();
    return !!state && state.touched() && state.invalid();
  });

  protected readonly visibleErrors = computed<readonly string[]>(() => {
    const client = this.clientInvalid()
      ? (this.clientState()?.errors() ?? []).map((error) => error.message).filter((message): message is string => !!message)
      : [];
    return [...new Set([...client, ...this.errors()])];
  });

  readonly showInvalid = computed(() => this.clientInvalid() || this.errors().length > 0);
  readonly isRequired = computed(() => this.required() || (this.state()?.required?.() ?? false));
  readonly describedBy = computed(() =>
    joinIds(this.hint() ? this.hintId : null, this.visibleErrors().length > 0 ? this.errorsId : null));

  protected readonly labelFor = computed(() => {
    const control = this.control();
    return control?.labelable ? control.controlId() : null;
  });

  protected focusUnlabelableControl(): void {
    const control = this.control();
    if (control && !control.labelable) {
      control.focus?.();
    }
  }
}
