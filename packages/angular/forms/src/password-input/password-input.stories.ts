import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes, fixedExample } from '@lc/storybook';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcPasswordInputComponent } from './password-input.component';

/**
 * Password field with a show/hide toggle (`lc-password-input`). The value stays a string; `autocomplete` tells the password manager
 * whether to fill an existing password or generate a new one.
 *
 * Import: `import { LcPasswordInputComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcPasswordInputComponent> = {
  title: 'Forms/Password input',
  component: LcPasswordInputComponent,
  decorators: [moduleMetadata({ imports: [LcPasswordInputComponent, LcFormFieldComponent] })],
  argTypes: {
    size: commonArgTypes.size,
    fillMode: commonArgTypes.fillMode,
    rounded: commonArgTypes.rounded,
    autocomplete: { control: 'inline-radio', options: ['current-password', 'new-password'] },
  },
  args: {
    autocomplete: 'current-password', placeholder: '', disabled: false, readonly: false, required: false, invalid: false, touched: false,
    size: 'medium', fillMode: 'solid', rounded: 'medium',
  },
};
export default meta;
type Story = StoryObj<LcPasswordInputComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, password: signal('') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Mot de passe" [errors]="invalid ? ['Mot de passe incorrect'] : []">
          <lc-password-input [(value)]="password" [autocomplete]="autocomplete" [placeholder]="placeholder"
            [size]="size" [fillMode]="fillMode" [rounded]="rounded" [disabled]="disabled" [readonly]="readonly"
            [required]="required" [invalid]="invalid" [touched]="touched" />
        </lc-form-field>
      </div>`,
  }),
};

/** Account creation: `new-password` lets the password manager generate a password. */
export const NewPassword: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { password: signal('') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Nouveau mot de passe" hint="12 caractères minimum">
          <lc-password-input [(value)]="password" autocomplete="new-password" placeholder="12 caractères minimum" />
        </lc-form-field>
      </div>`,
  }),
};

/** Normal, disabled, read-only and invalid fields side by side. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { password: signal('mot-de-passe-secret') },
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-4);max-width:24rem">
        <lc-form-field label="Normal"><lc-password-input [(value)]="password" /></lc-form-field>
        <lc-form-field label="Désactivé"><lc-password-input [(value)]="password" disabled /></lc-form-field>
        <lc-form-field label="Lecture seule"><lc-password-input [(value)]="password" readonly /></lc-form-field>
        <lc-form-field label="Invalide" [errors]="['Mot de passe incorrect']"><lc-password-input [(value)]="password" /></lc-form-field>
      </div>`,
  }),
};

/** `small`, `medium` and `large` sizes. */
export const Sizes: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { password: signal('secret') },
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-3);max-width:24rem">
        <lc-password-input [(value)]="password" size="small" ariaLabel="Mot de passe (petit)" />
        <lc-password-input [(value)]="password" size="medium" ariaLabel="Mot de passe (moyen)" />
        <lc-password-input [(value)]="password" size="large" ariaLabel="Mot de passe (grand)" />
      </div>`,
  }),
};

/** `outline` and `flat` fill modes, and fully rounded corners. */
export const Variants: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { password: signal('secret') },
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-3);max-width:24rem">
        <lc-password-input [(value)]="password" fillMode="outline" ariaLabel="Mot de passe (contour)" />
        <lc-password-input [(value)]="password" fillMode="flat" ariaLabel="Mot de passe (plat)" />
        <lc-password-input [(value)]="password" rounded="full" ariaLabel="Mot de passe (arrondi)" />
      </div>`,
  }),
};
