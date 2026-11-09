import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcAddressInputComponent } from './address-input/address-input.component';
import { LcCommuneInputComponent } from './commune-input/commune-input.component';
import { LcGeoDataSource } from './geo-data-source';
import type { LcAddress, LcCommune } from './geo.types';
import { FakeGeoDataSource } from './testing/fake-geo-data-source';

const LYON_3: LcCommune = {
  code: '69123', name: 'Lyon', postalCodes: ['69001', '69002', '69003', '69004', '69005'], postalCode: '69003',
  departmentCode: '69', regionCode: '84', population: 522250,
};
const VILLEURBANNE: LcCommune = {
  code: '69266', name: 'Villeurbanne', postalCodes: ['69100'], postalCode: null, departmentCode: '69', regionCode: '84', population: 154781,
};
const AMIENS: LcAddress = {
  id: '80021_6590_00008', label: '8 Boulevard du Port 80000 Amiens', kind: 'housenumber', houseNumber: '8', street: 'Boulevard du Port',
  postalCode: '80000', cityCode: '80021', city: 'Amiens', departmentCode: '80', latitude: 49.894171, longitude: 2.295695, score: 0.97,
};

@Component({
  imports: [LcCommuneInputComponent, LcAddressInputComponent],
  template: `
    <lc-commune-input ariaLabel="Commune" [debounceMs]="0" [(value)]="commune" [departmentCode]="department()" (selectionChange)="communeChanges.push($event)" />
    <lc-address-input ariaLabel="Adresse" [debounceMs]="0" [(value)]="address" kind="housenumber" postalCode="80000" />
  `,
})
class SearchHostComponent {
  readonly commune = signal<LcCommune | null>(null);
  readonly address = signal<LcAddress | null>(null);
  readonly department = signal<string | null>(null);
  readonly communeChanges: (LcCommune | null)[] = [];
}

describe('lc-commune-input et lc-address-input', () => {
  let source: FakeGeoDataSource;
  let fixture: ComponentFixture<SearchHostComponent>;

  const input = (label: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).map((o) => o.textContent?.replace(/\s+/g, ' ').trim());

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

  const enter = (label: string) => input(label).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

  beforeEach(async () => {
    source = new FakeGeoDataSource();
    TestBed.configureTestingModule({ providers: [{ provide: LcGeoDataSource, useValue: source }] });
    fixture = TestBed.createComponent(SearchHostComponent);
    await flush();
  });

  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((container) => (container.innerHTML = ''));
  });

  describe('commune', () => {
    it('« 69003 » : la valeur porte le code INSEE, le code postal et le département', async () => {
      source.communes = [LYON_3];
      await type('Commune', '69003');
      expect(source.communeQueries).toEqual([{ text: '69003', departmentCode: null }]);
      enter('Commune');
      await flush();
      expect(fixture.componentInstance.commune()).toMatchObject({ code: '69123', postalCode: '69003', departmentCode: '69' });
      expect(input('Commune').value).toBe('Lyon · 69003');
      expect(fixture.componentInstance.communeChanges).toEqual([LYON_3]);
    });

    it('sans code postal choisi : « Lyon (69) »', async () => {
      source.communes = [{ ...LYON_3, postalCode: null }];
      await type('Commune', 'lyon');
      enter('Commune');
      await flush();
      expect(input('Commune').value).toBe('Lyon (69)');
    });

    it('l\'option montre trois codes postaux au plus, puis « … », et le département', async () => {
      source.communes = [LYON_3, VILLEURBANNE];
      await type('Commune', 'ly');
      expect(options()).toEqual(['Lyon 69001, 69002, 69003 … · 69', 'Villeurbanne 69100 · 69']);
    });

    it('le département transmis restreint la recherche, et son changement relance la recherche', async () => {
      source.communes = [LYON_3];
      fixture.componentInstance.department.set('69');
      await flush();
      await type('Commune', 'ly');
      expect(source.communeQueries.at(-1)).toEqual({ text: 'ly', departmentCode: '69' });
      const before = source.communeQueries.length;
      fixture.componentInstance.department.set('01');
      await flush();
      expect(source.communeQueries.length).toBe(before + 1);
      expect(source.communeQueries.at(-1)).toEqual({ text: 'ly', departmentCode: '01' });
    });

    it('deux frappes rapides : la première recherche est annulée', async () => {
      const signals: AbortSignal[] = [];
      source.onSearch = async (signal) => { signals.push(signal); };
      source.communes = [LYON_3];
      await type('Commune', 'ly');
      await type('Commune', 'lyo');
      expect(signals).toHaveLength(2);
      expect(signals[0].aborted).toBe(true);
      expect(signals[1].aborted).toBe(false);
    });

    it('une valeur posée par le code s\'affiche sans recherche', async () => {
      fixture.componentInstance.commune.set(LYON_3);
      await flush();
      expect(input('Commune').value).toBe('Lyon · 69003');
      expect(source.communeQueries).toHaveLength(0);
    });
  });

  describe('adresse', () => {
    it('moins de 3 caractères : message, aucun appel ; à 3 caractères : recherche avec les restrictions', async () => {
      source.addresses = [AMIENS];
      await type('Adresse', 'ab');
      expect(document.querySelector('.lc-combobox-panel__message')?.textContent).toContain('Saisissez au moins 3 caractères');
      expect(source.addressQueries).toHaveLength(0);
      await type('Adresse', '8 bd');
      expect(source.addressQueries).toEqual([{ text: '8 bd', kind: 'housenumber', postalCode: '80000', cityCode: null }]);
      expect(options()).toEqual(['8 Boulevard du Port 80000 Amiens Amiens']);
    });

    it('la sélection pose l\'objet complet, coordonnées incluses', async () => {
      source.addresses = [AMIENS];
      await type('Adresse', '8 bd du port');
      enter('Adresse');
      await flush();
      expect(fixture.componentInstance.address()).toEqual(AMIENS);
      expect(input('Adresse').value).toBe(AMIENS.label);
    });
  });
});
