import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { LcGeoDataSource } from './geo-data-source';
import { LC_GEO_OPTIONS, LcGeoOptions } from './geo-options';
import { LcGouvGeoDataSource } from './gouv-geo-data-source';

/**
 * Active les champs géographiques avec les API publiques officielles (`geo.api.gouv.fr`, `data.geopf.fr/geocodage`).
 * Pour passer par son propre back : `{ provide: LcGeoDataSource, useClass: MaSource }` après `provideLcGeo()`.
 * Le consommateur autorise ces domaines dans sa CSP (`connect-src`).
 */
export function provideLcGeo(options: LcGeoOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: LC_GEO_OPTIONS, useValue: options },
    { provide: LcGeoDataSource, useClass: LcGouvGeoDataSource },
  ]);
}
