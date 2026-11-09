import { signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFormFieldComponent } from '@lionelcointot/ui-angular/forms';
import { LcDepartmentSelectComponent } from '../code-select/department-select.component';
import { LcRegionSelectComponent } from '../code-select/region-select.component';
import { LcGeoDataSource } from '../geo-data-source';
import { provideLcGeo } from '../provide-lc-geo';
import { FakeGeoDataSource } from '../testing/fake-geo-data-source';

/** Les stories utilisent une source factice (300 ms de latence) : aucun appel réseau. La story « API réelle » appelle les services publics. */
const meta: Meta<LcDepartmentSelectComponent> = {
  title: 'Géographie/Régions et départements',
  component: LcDepartmentSelectComponent,
  decorators: [
    moduleMetadata({ imports: [LcDepartmentSelectComponent, LcRegionSelectComponent, LcFormFieldComponent] }),
    applicationConfig({ providers: [{ provide: LcGeoDataSource, useValue: new FakeGeoDataSource(300) }] }),
  ],
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
  args: { disabled: false, readonly: false },
};
export default meta;
type Story = StoryObj<LcDepartmentSelectComponent>;

/** La valeur de formulaire est le code officiel (« 69 ») ; tapez « rho », « 2a » ou « 974 ». */
export const Departement: Story = {
  render: (args) => ({
    props: { ...args, department: signal<string | null>(null) },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Département" hint="Par numéro ou par nom ; la liste vient de la source de données.">
          <lc-department-select [(value)]="department" [size]="size" [disabled]="disabled" [readonly]="readonly" />
        </lc-form-field>
        <p style="margin-top:1rem">Code : {{ department() ?? 'aucun' }}</p>
      </div>`,
  }),
};

export const Region: Story = {
  render: () => ({
    props: { region: signal<string | null>('84') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Région"><lc-region-select [(value)]="region" /></lc-form-field>
        <p style="margin-top:1rem">Code : {{ region() ?? 'aucun' }}</p>
      </div>`,
  }),
};

/** Liste restreinte à une région ; changer de région retire un département qui n'en fait plus partie. */
export const DepartementParRegion: Story = {
  render: () => ({
    props: { region: signal<string | null>('84'), department: signal<string | null>('69') },
    template: `
      <div style="display:grid;gap:16px;max-width:24rem">
        <lc-form-field label="Région"><lc-region-select [(value)]="region" /></lc-form-field>
        <lc-form-field label="Département"><lc-department-select [(value)]="department" [regionCode]="region()" /></lc-form-field>
        <p>Région : {{ region() ?? 'aucune' }} · département : {{ department() ?? 'aucun' }}</p>
      </div>`,
  }),
};

/** Code absent de la liste reçue (ex. un ancien scénario) : conservé, affiché tel quel avec une aide. */
export const CodeInconnu: Story = {
  render: () => ({
    props: { department: signal<string | null>('975') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Département"><lc-department-select [(value)]="department" /></lc-form-field>
      </div>`,
  }),
};

export const Etats: Story = {
  render: () => ({
    props: { department: signal<string | null>('69') },
    template: `
      <div style="display:grid;gap:16px;max-width:24rem">
        <lc-form-field label="Désactivé"><lc-department-select [(value)]="department" disabled /></lc-form-field>
        <lc-form-field label="Lecture seule"><lc-department-select [(value)]="department" readonly /></lc-form-field>
        <lc-form-field label="Invalide" [errors]="['Choisissez un département']"><lc-department-select [value]="null" invalid touched /></lc-form-field>
      </div>`,
  }),
};

/** Source en échec : la valeur existante reste affichée par son code, l'ouverture montre l'erreur et « Réessayer ». */
export const ReseauCoupe: Story = {
  decorators: [
    applicationConfig({
      providers: (() => {
        const source = new FakeGeoDataSource(300);
        source.failDepartments = true;
        return [{ provide: LcGeoDataSource, useValue: source }];
      })(),
    }),
  ],
  render: () => ({
    props: { department: signal<string | null>('69') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Département"><lc-department-select [(value)]="department" /></lc-form-field>
      </div>`,
  }),
};

/** API réelle (non bloquant en CI) : appelle geo.api.gouv.fr depuis le navigateur ; la liste est chargée une fois. */
export const ApiReelle: Story = {
  tags: ['!test'],
  decorators: [applicationConfig({ providers: [provideLcGeo()] })],
  render: () => ({
    props: { department: signal<string | null>('69') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Département (API officielle)" hint="Requête vers https://geo.api.gouv.fr/departements, sans texte saisi.">
          <lc-department-select [(value)]="department" />
        </lc-form-field>
      </div>`,
  }),
};
