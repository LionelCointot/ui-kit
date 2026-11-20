import { signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcFormFieldComponent } from '@lionelcointot/ui-angular/forms';
import { LcDepartmentSelectComponent } from '../code-select/department-select.component';
import { LcRegionSelectComponent } from '../code-select/region-select.component';
import { LcGeoDataSource } from '../geo-data-source';
import { provideLcGeo } from '../provide-lc-geo';
import { FakeGeoDataSource } from '../testing/fake-geo-data-source';

/**
 * Selects for French regions (`lc-region-select`) and departments (`lc-department-select`); the form value is the official code (« 69 »).
 * The department list can be restricted to a region.
 *
 * Import: `import { LcDepartmentSelectComponent, LcRegionSelectComponent } from '@lionelcointot/ui-angular/geo';`
 *
 * Live data: this page sends requests to the public geo.api.gouv.fr API (see packages/angular/geo/README.md).
 * Only the `LiveApi` story does so (excluded from the automated tests); the others use a stand-in source with 300 ms of latency.
 */
const meta: Meta<LcDepartmentSelectComponent> = {
  title: 'Geography/Region and department selects',
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

/** Every input is bound; type « rho », « 2a » or « 974 ». The value is the official code. */
export const Playground: Story = {
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

/** A region select; the value is the region code. */
export const Region: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { region: signal<string | null>('84') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Région"><lc-region-select [(value)]="region" /></lc-form-field>
        <p style="margin-top:1rem">Code : {{ region() ?? 'aucun' }}</p>
      </div>`,
  }),
};

/** Department list restricted to a region; changing region drops a department that no longer belongs to it. */
export const DepartmentByRegion: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { region: signal<string | null>('84'), department: signal<string | null>('69') },
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-4);max-width:24rem">
        <lc-form-field label="Région"><lc-region-select [(value)]="region" /></lc-form-field>
        <lc-form-field label="Département"><lc-department-select [(value)]="department" [regionCode]="region()" /></lc-form-field>
        <p>Région : {{ region() ?? 'aucune' }} · département : {{ department() ?? 'aucun' }}</p>
      </div>`,
  }),
};

/** A code missing from the received list is kept and shown as is, with a hint. */
export const UnknownCode: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { department: signal<string | null>('975') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Département"><lc-department-select [(value)]="department" /></lc-form-field>
      </div>`,
  }),
};

/** Disabled, read-only and invalid states. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { department: signal<string | null>('69') },
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-4);max-width:24rem">
        <lc-form-field label="Désactivé"><lc-department-select [(value)]="department" disabled /></lc-form-field>
        <lc-form-field label="Lecture seule"><lc-department-select [(value)]="department" readonly /></lc-form-field>
        <lc-form-field label="Invalide" [errors]="['Choisissez un département']"><lc-department-select [value]="null" invalid touched /></lc-form-field>
      </div>`,
  }),
};

/** Failing source: the existing value stays shown by its code; opening the list shows the error and a retry action. */
export const NetworkDown: Story = {
  parameters: fixedExample,
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

/** Live API (not run in CI): calls geo.api.gouv.fr from the browser; the list is loaded once. */
export const LiveApi: Story = {
  tags: ['!test'],
  parameters: fixedExample,
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
