import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcPasswordInputComponent } from './password-input.component';

const meta: Meta<LcPasswordInputComponent> = {
  title: 'Formulaires/Mot de passe',
  component: LcPasswordInputComponent,
  decorators: [moduleMetadata({ imports: [LcPasswordInputComponent, LcFormFieldComponent] })],
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    fillMode: { control: 'inline-radio', options: ['solid', 'outline', 'flat'] },
    rounded: { control: 'select', options: ['none', 'small', 'medium', 'large', 'full'] },
    autocomplete: { control: 'inline-radio', options: ['current-password', 'new-password'] },
  },
  args: { autocomplete: 'current-password', placeholder: '', disabled: false, readonly: false },
  render: (args) => ({
    props: { ...args, password: signal('') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Mot de passe">
          <lc-password-input [(value)]="password" [autocomplete]="autocomplete" [placeholder]="placeholder"
            [size]="size" [fillMode]="fillMode" [rounded]="rounded" [disabled]="disabled" [readonly]="readonly" />
        </lc-form-field>
      </div>`,
  }),
};
export default meta;
type Story = StoryObj<LcPasswordInputComponent>;

export const Defaut: Story = {};

/** Création de compte : `new-password` propose au gestionnaire de mots de passe d'en générer un. */
export const NouveauMotDePasse: Story = {
  args: { autocomplete: 'new-password', placeholder: '12 caractères minimum' },
};

export const Etats: Story = {
  render: () => ({
    props: { password: signal('mot-de-passe-secret') },
    template: `
      <div style="display:grid;gap:16px;max-width:24rem">
        <lc-form-field label="Normal"><lc-password-input [(value)]="password" /></lc-form-field>
        <lc-form-field label="Désactivé"><lc-password-input [(value)]="password" disabled /></lc-form-field>
        <lc-form-field label="Lecture seule"><lc-password-input [(value)]="password" readonly /></lc-form-field>
        <lc-form-field label="Invalide" [errors]="['Mot de passe incorrect']"><lc-password-input [(value)]="password" /></lc-form-field>
      </div>`,
  }),
};

export const Tailles: Story = {
  render: () => ({
    props: { password: signal('secret') },
    template: `
      <div style="display:grid;gap:12px;max-width:24rem">
        <lc-password-input [(value)]="password" size="small" ariaLabel="Mot de passe (petit)" />
        <lc-password-input [(value)]="password" size="medium" ariaLabel="Mot de passe (moyen)" />
        <lc-password-input [(value)]="password" size="large" ariaLabel="Mot de passe (grand)" />
      </div>`,
  }),
};

export const Variantes: Story = {
  render: () => ({
    props: { password: signal('secret') },
    template: `
      <div style="display:grid;gap:12px;max-width:24rem">
        <lc-password-input [(value)]="password" fillMode="outline" ariaLabel="Mot de passe (contour)" />
        <lc-password-input [(value)]="password" fillMode="flat" ariaLabel="Mot de passe (plat)" />
        <lc-password-input [(value)]="password" rounded="full" ariaLabel="Mot de passe (arrondi)" />
      </div>`,
  }),
};
