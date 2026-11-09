import { JsonPipe } from '@angular/common';
import { signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFormFieldComponent } from '@lionelcointot/ui-angular/forms';
import { LcAddressInputComponent } from '../address-input/address-input.component';
import { LcCommuneInputComponent } from '../commune-input/commune-input.component';
import { LcGeoDataSource } from '../geo-data-source';
import type { LcAddress, LcAddressQuery, LcCommune, LcCommuneQuery, LcDepartment, LcRegion } from '../geo.types';
import { provideLcGeo } from '../provide-lc-geo';

const SAMPLE_COMMUNES: readonly LcCommune[] = [
  { code: '69123', name: 'Lyon', postalCodes: ['69001', '69002', '69003', '69004', '69005'], postalCode: null, departmentCode: '69', regionCode: '84', population: 522250 },
  { code: '69266', name: 'Villeurbanne', postalCodes: ['69100'], postalCode: null, departmentCode: '69', regionCode: '84', population: 154781 },
  { code: '38185', name: 'Grenoble', postalCodes: ['38000', '38100'], postalCode: null, departmentCode: '38', regionCode: '84', population: 158240 },
];

const SAMPLE_ADDRESSES: readonly LcAddress[] = [
  { id: '80021_6590_00008', label: '8 Boulevard du Port 80000 Amiens', kind: 'housenumber', houseNumber: '8', street: 'Boulevard du Port', postalCode: '80000', cityCode: '80021', city: 'Amiens', departmentCode: '80', latitude: 49.894171, longitude: 2.295695, score: 0.97 },
  { id: '69123_2000_00008', label: '8 Rue de la République 69001 Lyon', kind: 'housenumber', houseNumber: '8', street: 'Rue de la République', postalCode: '69001', cityCode: '69123', city: 'Lyon', departmentCode: '69', latitude: 45.7676, longitude: 4.8357, score: 0.9 },
];

/** Source de démonstration : quelques exemples filtrés localement, avec 300 ms de latence ; aucun réseau. */
class StoryGeoDataSource extends LcGeoDataSource {
  override regions(): Promise<readonly LcRegion[]> {
    return Promise.resolve([]);
  }

  override departments(): Promise<readonly LcDepartment[]> {
    return Promise.resolve([]);
  }

  override async searchCommunes(query: LcCommuneQuery, signal: AbortSignal): Promise<readonly LcCommune[]> {
    await this.latency(signal);
    const text = query.text.trim().toLowerCase();
    return SAMPLE_COMMUNES
      .filter((c) => (!query.departmentCode || c.departmentCode === query.departmentCode)
        && (c.name.toLowerCase().includes(text) || c.postalCodes.includes(query.text.trim())))
      .map((c) => ({ ...c, postalCode: c.postalCodes.find((p) => p === query.text.trim()) ?? null }));
  }

  override async searchAddresses(query: LcAddressQuery, signal: AbortSignal): Promise<readonly LcAddress[]> {
    await this.latency(signal);
    const text = query.text.trim().toLowerCase();
    return SAMPLE_ADDRESSES.filter((a) => a.label.toLowerCase().includes(text));
  }

  private latency(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 300);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Annulée', 'AbortError')); });
    });
  }
}

const meta: Meta<LcCommuneInputComponent> = {
  title: 'Géographie/Communes et adresses',
  component: LcCommuneInputComponent,
  decorators: [
    moduleMetadata({ imports: [LcCommuneInputComponent, LcAddressInputComponent, LcFormFieldComponent, JsonPipe] }),
    applicationConfig({ providers: [{ provide: LcGeoDataSource, useValue: new StoryGeoDataSource() }] }),
  ],
};
export default meta;
type Story = StoryObj<LcCommuneInputComponent>;

/** Source factice : tapez « ly » ou « 69001 ». La valeur est un objet plat (code INSEE, codes postaux, département…). */
export const Commune: Story = {
  render: () => ({
    props: { commune: signal<LcCommune | null>(null) },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Commune" hint="Le texte saisi est envoyé au service de recherche.">
          <lc-commune-input [(value)]="commune" />
        </lc-form-field>
        <pre style="margin-top:1rem">{{ commune() | json }}</pre>
      </div>`,
  }),
};

export const CommuneDansUnDepartement: Story = {
  render: () => ({
    props: { commune: signal<LcCommune | null>(null) },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Commune du Rhône (69)"><lc-commune-input [(value)]="commune" departmentCode="69" /></lc-form-field>
      </div>`,
  }),
};

export const Adresse: Story = {
  render: () => ({
    props: { address: signal<LcAddress | null>(null) },
    template: `
      <div style="max-width:28rem">
        <lc-form-field label="Adresse" hint="Tapez « 8 » puis une partie de la voie.">
          <lc-address-input [(value)]="address" />
        </lc-form-field>
        <pre style="margin-top:1rem">{{ address() | json }}</pre>
      </div>`,
  }),
};

/** API réelle (non bloquant en CI) : les textes saisis partent vers geo.api.gouv.fr et data.geopf.fr. */
export const ApiReelle: Story = {
  tags: ['!test'],
  decorators: [applicationConfig({ providers: [provideLcGeo()] })],
  render: () => ({
    props: { commune: signal<LcCommune | null>(null), address: signal<LcAddress | null>(null) },
    template: `
      <div style="display:grid;gap:16px;max-width:28rem">
        <lc-form-field label="Commune (API Découpage administratif)"><lc-commune-input [(value)]="commune" /></lc-form-field>
        <lc-form-field label="Adresse (API Adresse de la Géoplateforme)"><lc-address-input [(value)]="address" /></lc-form-field>
      </div>`,
  }),
};
