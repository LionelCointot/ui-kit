import { InjectionToken } from '@angular/core';

/** Configuration de `LcGouvGeoDataSource` (tout est facultatif). */
export interface LcGeoOptions {
  /** API Découpage administratif (défaut `https://geo.api.gouv.fr`). */
  readonly geoApiBaseUrl?: string;
  /** API Adresse de la Géoplateforme (défaut `https://data.geopf.fr/geocodage`). */
  readonly addressApiBaseUrl?: string;
  /** Délai maximal d'une requête, en millisecondes (défaut 5000). */
  readonly timeoutMs?: number;
}

export const LC_GEO_OPTIONS = new InjectionToken<LcGeoOptions>('LC_GEO_OPTIONS', { providedIn: 'root', factory: () => ({}) });

export const LC_GEO_DEFAULTS = {
  geoApiBaseUrl: 'https://geo.api.gouv.fr',
  addressApiBaseUrl: 'https://data.geopf.fr/geocodage',
  timeoutMs: 5000,
} as const;
