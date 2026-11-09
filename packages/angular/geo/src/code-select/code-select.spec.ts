import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcDepartmentSelectComponent } from './department-select.component';
import { LcRegionSelectComponent } from './region-select.component';
import { LcGeoDataSource } from '../geo-data-source';
import { provideLcGeo } from '../provide-lc-geo';
import { FAKE_DEPARTMENTS, FakeGeoDataSource } from '../testing/fake-geo-data-source';
import type { LcDepartment } from '../geo.types';

@Component({
  imports: [LcDepartmentSelectComponent, LcRegionSelectComponent],
  template: `
    <lc-department-select ariaLabel="Département" [(value)]="department" [regionCode]="region()" (selectionChange)="changes.push($event)" />
    <lc-region-select ariaLabel="Région" [(value)]="regionValue" />
  `,
})
class GeoHostComponent {
  readonly department = signal<string | null>(null);
  readonly regionValue = signal<string | null>(null);
  readonly region = signal<string | null>(null);
  readonly changes: (LcDepartment | null)[] = [];
}

describe('champs géographiques (code officiel)', () => {
  let source: FakeGeoDataSource;
  let fixture: ComponentFixture<GeoHostComponent>;

  const input = (label: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).map((o) => o.textContent?.replace(/\s+/g, ' ').trim());
  const message = () => document.querySelector('.lc-combobox-panel__message')?.textContent?.trim();

  async function flush(): Promise<void> {
    for (let i = 0; i < 5; i++) await Promise.resolve();
    await fixture.whenStable();
  }

  async function type(label: string, text: string): Promise<void> {
    const field = input(label);
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
  }

  async function setup(configure?: (s: FakeGeoDataSource) => void): Promise<void> {
    source = new FakeGeoDataSource();
    configure?.(source);
    TestBed.configureTestingModule({ providers: [{ provide: LcGeoDataSource, useValue: source }] });
    fixture = TestBed.createComponent(GeoHostComponent);
    await flush();
  }

  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((container) => (container.innerHTML = ''));
    vi.restoreAllMocks();
  });

  it('charge la liste dès la création (pour afficher la valeur existante)', async () => {
    await setup();
    expect(source.departmentCalls).toBeGreaterThanOrEqual(1);
    expect(source.regionCalls).toBeGreaterThanOrEqual(1);
  });

  it('« rho » propose « 69 – Rhône » en tête ; Entrée pose le code « 69 »', async () => {
    await setup();
    input('Département').focus();
    await type('Département', 'rho');
    expect(options()[0]).toContain('69');
    expect(options()[0]).toContain('Rhône');
    input('Département').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush();
    expect(fixture.componentInstance.department()).toBe('69');
    expect(input('Département').value).toBe('69 – Rhône');
    expect(fixture.componentInstance.changes).toEqual([FAKE_DEPARTMENTS[3]]);
  });

  it('« 2a » propose Corse-du-Sud ; « 974 » propose La Réunion', async () => {
    await setup();
    input('Département').focus();
    await type('Département', '2a');
    expect(options()).toHaveLength(1);
    expect(options()[0]).toContain('2A');
    expect(options()[0]).toContain('Corse-du-Sud');
    await type('Département', '974');
    expect(options()[0]).toContain('La Réunion');
  });

  it('l\'option de département montre le nom de la région en texte secondaire', async () => {
    await setup();
    input('Département').focus();
    await type('Département', 'rho');
    expect(options()[0]).toContain('Auvergne-Rhône-Alpes');
  });

  it('une valeur existante s\'affiche par son code puis par « 69 – Rhône » une fois la liste reçue', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await setup((s) => {
      const original = s.departments.bind(s);
      s.departments = async () => { await gate; return original(); };
    });
    fixture.componentInstance.department.set('69');
    await flush();
    expect(input('Département').value).toBe('69');
    release();
    await flush();
    expect(input('Département').value).toBe('69 – Rhône');
  });

  it('un code absent de la liste est conservé, affiché tel quel avec l\'aide « Code inconnu »', async () => {
    await setup();
    fixture.componentInstance.department.set('975');
    await flush();
    expect(fixture.componentInstance.department()).toBe('975');
    expect(input('Département').value).toBe('975');
    const hint = (fixture.nativeElement as HTMLElement).querySelector('.lc-geo__hint')!;
    expect(hint.textContent).toBe('Code inconnu : 975');
    expect(input('Département').getAttribute('aria-describedby')).toContain(hint.id);
  });

  it('regionCode restreint la liste', async () => {
    await setup();
    fixture.componentInstance.region.set('94');
    await flush();
    input('Département').focus();
    await flush();
    expect(options().map((o) => o?.slice(0, 2))).toEqual(['2A', '2B']);
  });

  it('un changement de région retire la valeur qui n\'en fait plus partie, avec selectionChange', async () => {
    await setup();
    fixture.componentInstance.department.set('69');
    await flush();
    fixture.componentInstance.region.set('94');
    await flush();
    expect(fixture.componentInstance.department()).toBeNull();
    expect(fixture.componentInstance.changes).toEqual([null]);
    expect(input('Département').value).toBe('');
  });

  it('une valeur de la région reste en place', async () => {
    await setup();
    fixture.componentInstance.department.set('69');
    fixture.componentInstance.region.set('84');
    await flush();
    expect(fixture.componentInstance.department()).toBe('69');
    expect(fixture.componentInstance.changes).toEqual([]);
  });

  it('réseau coupé : valeur affichée par son code, état d\'erreur à l\'ouverture, « Réessayer » relance', async () => {
    await setup((s) => (s.failDepartments = true));
    fixture.componentInstance.department.set('69');
    await flush();
    expect(input('Département').value).toBe('69');
    input('Département').focus();
    await flush();
    expect(message()).toBe('Recherche indisponible pour le moment');
    expect(options()).toEqual(['Réessayer']);
    const before = source.departmentCalls;
    source.failDepartments = false;
    input('Département').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush();
    expect(source.departmentCalls).toBeGreaterThan(before);
    expect(options().length).toBeGreaterThan(1);
    expect(fixture.componentInstance.department()).toBe('69');
  });

  it('le champ région filtre par nom et pose le code de la région', async () => {
    await setup();
    input('Région').focus();
    await type('Région', 'auv');
    expect(options()[0]).toContain('Auvergne-Rhône-Alpes');
    input('Région').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush();
    expect(fixture.componentInstance.regionValue()).toBe('84');
  });
});

describe('champs géographiques sans source', () => {
  it('sans provideLcGeo : erreur explicite en développement, champ désactivé', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(GeoHostComponent);
    await fixture.whenStable();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('provideLcGeo'));
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input')!.disabled).toBe(true);
    fixture.destroy();
    vi.restoreAllMocks();
  });
});

describe('chargement partagé entre champs (source officielle)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('trois champs département : une seule requête /departements, aucun texte saisi envoyé', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: string) => {
      urls.push(input);
      const body = input.includes('/regions')
        ? [{ code: '84', nom: 'Auvergne-Rhône-Alpes' }]
        : [{ code: '69', nom: 'Rhône', codeRegion: '84' }];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    @Component({
      imports: [LcDepartmentSelectComponent],
      template: `<lc-department-select ariaLabel="A" /><lc-department-select ariaLabel="B" /><lc-department-select ariaLabel="C" />`,
    })
    class TripleComponent {}
    TestBed.configureTestingModule({ providers: [provideLcGeo()] });
    const fixture = TestBed.createComponent(TripleComponent);
    await fixture.whenStable();
    const first = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    first.focus();
    first.value = 'rho';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(urls.filter((url) => url.includes('/departements'))).toHaveLength(1);
    expect(urls.every((url) => !/rho/i.test(url))).toBe(true);
    fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((container) => (container.innerHTML = ''));
  });
});
