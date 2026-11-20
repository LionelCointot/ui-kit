import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcCheckboxDirective, LcFormFieldComponent } from '@lionelcointot/ui-angular/forms';

/**
 * Styled native checkbox (`input[type=checkbox][lcCheckbox]`). The label is a native `<label>` around or next to the input.
 * Supports the indeterminate state and, inside `lc-form-field`, error messages linked by `aria-describedby`.
 *
 * Import: `import { LcCheckboxDirective } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcCheckboxDirective> = {
  title: 'Forms/Checkbox',
  component: LcCheckboxDirective,
  decorators: [moduleMetadata({ imports: [LcCheckboxDirective, LcFormFieldComponent] })],
  args: { indeterminate: false, invalid: false, touched: false, errors: [] },
  argTypes: { errors: { control: 'object' }, id: { control: false } },
};
export default meta;
type Story = StoryObj<LcCheckboxDirective>;

/** Every input is bound: change them in the Controls panel (`invalid` and `touched` together show the error). */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['indeterminate', 'invalid', 'touched'] } },
  args: { errors: [{ message: 'Vous devez accepter les conditions.' }] },
  render: (args) => ({
    props: args,
    template: `
      <lc-form-field label="Conditions d'utilisation">
        <label style="display:inline-flex;gap:var(--lc-sys-space-2, 8px);align-items:center">
          <input type="checkbox" lcCheckbox [indeterminate]="indeterminate" [invalid]="invalid" [touched]="touched" [errors]="errors" />
          J'accepte les conditions
        </label>
      </lc-form-field>`,
  }),
};

/** Unchecked, checked, indeterminate, disabled and invalid checkboxes. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-3, 12px)">
        <label><input type="checkbox" lcCheckbox /> Non cochée</label>
        <label><input type="checkbox" lcCheckbox checked /> Cochée</label>
        <label><input type="checkbox" lcCheckbox indeterminate /> Indéterminée</label>
        <label><input type="checkbox" lcCheckbox disabled /> Désactivée</label>
        <label><input type="checkbox" lcCheckbox checked disabled /> Cochée et désactivée</label>
        <label><input type="checkbox" lcCheckbox invalid touched /> Invalide</label>
      </div>`,
  }),
};
