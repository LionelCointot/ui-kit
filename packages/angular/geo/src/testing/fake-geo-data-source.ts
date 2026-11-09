import { LcGeoDataSource } from '../geo-data-source';
import type { LcAddress, LcAddressQuery, LcCommune, LcCommuneQuery, LcDepartment, LcRegion } from '../geo.types';

/** Régions et départements de test (jeu volontairement réduit, propre aux tests et aux stories). */
export const FAKE_REGIONS: readonly LcRegion[] = [
  { code: '84', name: 'Auvergne-Rhône-Alpes' },
  { code: '94', name: 'Corse' },
  { code: '04', name: 'La Réunion' },
];

export const FAKE_DEPARTMENTS: readonly LcDepartment[] = [
  { code: '01', name: 'Ain', regionCode: '84' },
  { code: '2A', name: 'Corse-du-Sud', regionCode: '94' },
  { code: '2B', name: 'Haute-Corse', regionCode: '94' },
  { code: '69', name: 'Rhône', regionCode: '84' },
  { code: '974', name: 'La Réunion', regionCode: '04' },
];

/** Source factice : aucun réseau ; `delayMs` simule la latence, `failNext` des échecs. */
export class FakeGeoDataSource extends LcGeoDataSource {
  departmentCalls = 0;
  regionCalls = 0;
  readonly communeQueries: LcCommuneQuery[] = [];
  readonly addressQueries: LcAddressQuery[] = [];
  failDepartments = false;
  communes: readonly LcCommune[] = [];
  addresses: readonly LcAddress[] = [];
  /** Appelé à chaque recherche pour contrôler le moment de la réponse (tests de concurrence). */
  onSearch?: (signal: AbortSignal) => Promise<void>;

  constructor(private readonly delayMs = 0) {
    super();
  }

  override async regions(): Promise<readonly LcRegion[]> {
    this.regionCalls++;
    await this.wait();
    return FAKE_REGIONS;
  }

  override async departments(): Promise<readonly LcDepartment[]> {
    this.departmentCalls++;
    await this.wait();
    if (this.failDepartments) throw new Error('réseau coupé');
    return FAKE_DEPARTMENTS;
  }

  override async searchCommunes(query: LcCommuneQuery, signal: AbortSignal): Promise<readonly LcCommune[]> {
    this.communeQueries.push(query);
    await this.onSearch?.(signal);
    await this.wait();
    return this.communes;
  }

  override async searchAddresses(query: LcAddressQuery, signal: AbortSignal): Promise<readonly LcAddress[]> {
    this.addressQueries.push(query);
    await this.onSearch?.(signal);
    await this.wait();
    return this.addresses;
  }

  private wait(): Promise<void> {
    return this.delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, this.delayMs)) : Promise.resolve();
  }
}
