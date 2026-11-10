import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, disabled, form } from '@angular/forms/signals';
import { LcAddressInputComponent } from './address-input/address-input.component';
import { LcDepartmentSelectComponent } from './code-select/department-select.component';
import { LcRegionSelectComponent } from './code-select/region-select.component';
import { LcCommuneInputComponent } from './commune-input/commune-input.component';
import { LcGeoDataSource } from './geo-data-source';
import type { LcAddress, LcCommune } from './geo.types';
import { FakeGeoDataSource } from './testing/fake-geo-data-source';

const LYON: LcCommune = {
  code: '69123', name: 'Lyon', postalCodes: ['69001'], postalCode: null, departmentCode: '69', regionCode: '84', population: 522250,
};
const AMIENS: LcAddress = {
  id: '80021_6590_00008', label: '8 Boulevard du Port 80000 Amiens', kind: 'housenumber', houseNumber: '8', street: 'Boulevard du Port',
  postalCode: '80000', cityCode: '80021', city: 'Amiens', departmentCode: '80', latitude: 49.894171, longitude: 2.295695, score: 0.97,
};

interface GeoModel {
  region: string | null;
  department: string | null;
  commune: LcCommune | null;
  address: LcAddress | null;
}

/** Les champs géographiques sont des hôtes de `[formField]` (Signal Forms) : valeur, saisie, désactivation. */
@Component({
  imports: [FormField, LcRegionSelectComponent, LcDepartmentSelectComponent, LcCommuneInputComponent, LcAddressInputComponent],
  template: `
    <lc-region-select ariaLabel="Région" [formField]="f.region" />
    <lc-department-select ariaLabel="Département" [formField]="f.department" />
    <lc-commune-input ariaLabel="Commune" [debounceMs]="0" [formField]="f.commune" />
    <lc-address-input ariaLabel="Adresse" [debounceMs]="0" [formField]="f.address" />
  `,
})
class GeoFormHostComponent {
  readonly model = signal<GeoModel>({ region: null, department: null, commune: null, address: null });
  readonly locked = signal(false);
  protected readonly f = form(this.model, (path) => {
    disabled(path.region, () => this.locked());
    disabled(path.department, () => this.locked());
    disabled(path.commune, () => this.locked());
    disabled(path.address, () => this.locked());
  });
}

describe('champs géographiques dans un formulaire Signal Forms ([formField])', () => {
  let fixture: ComponentFixture<GeoFormHostComponent>;
  let host: GeoFormHostComponent;
  let source: FakeGeoDataSource;

  const input = (label: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;

  async function flush(): Promise<void> {
    for (let i = 0; i < 5; i++) await Promise.resolve();
    await fixture.whenStable();
  }

  async function type(label: string, text: string): Promise<void> {
    input(label).focus();
    input(label).value = text;
    input(label).dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
  }

  async function pressEnter(label: string): Promise<void> {
    input(label).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush();
  }

  beforeEach(async () => {
    source = new FakeGeoDataSource();
    source.communes = [LYON];
    source.addresses = [AMIENS];
    TestBed.configureTestingModule({ providers: [{ provide: LcGeoDataSource, useValue: source }] });
    fixture = TestBed.createComponent(GeoFormHostComponent);
    host = fixture.componentInstance;
    await flush();
  });

  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((container) => (container.innerHTML = ''));
  });

  it('affiche la valeur du modèle dans chaque champ', async () => {
    host.model.set({ region: '84', department: '69', commune: LYON, address: AMIENS });
    await flush();
    expect(input('Région').value).toBe('84 – Auvergne-Rhône-Alpes');
    expect(input('Département').value).toBe('69 – Rhône');
    expect(input('Commune').value).toBe('Lyon (69)');
    expect(input('Adresse').value).toBe(AMIENS.label);
  });

  it('lc-region-select : une sélection remonte au modèle', async () => {
    await type('Région', 'corse');
    await pressEnter('Région');
    expect(host.model().region).toBe('94');
  });

  it('lc-department-select : une sélection remonte au modèle', async () => {
    await type('Département', 'rho');
    await pressEnter('Département');
    expect(host.model().department).toBe('69');
  });

  it('lc-commune-input : une sélection remonte au modèle', async () => {
    await type('Commune', 'lyo');
    await pressEnter('Commune');
    expect(host.model().commune).toEqual(LYON);
  });

  it('lc-address-input : une sélection remonte au modèle', async () => {
    await type('Adresse', '8 boulevard du port');
    await pressEnter('Adresse');
    expect(host.model().address).toEqual(AMIENS);
  });

  it('propage disabled du champ à chaque composant', async () => {
    for (const label of ['Région', 'Département', 'Commune', 'Adresse']) expect(input(label).disabled).toBe(false);
    host.locked.set(true);
    await flush();
    for (const label of ['Région', 'Département', 'Commune', 'Adresse']) expect(input(label).disabled).toBe(true);
  });
});
