/** Région administrative (API Découpage administratif). */
export interface LcRegion {
  /** Code officiel, ex. « 84 ». */
  readonly code: string;
  /** Nom, ex. « Auvergne-Rhône-Alpes ». */
  readonly name: string;
}

/** Département (API Découpage administratif). */
export interface LcDepartment {
  /** Code officiel, ex. « 69 », « 2A », « 974 ». */
  readonly code: string;
  readonly name: string;
  /** Code de la région, ex. « 84 ». */
  readonly regionCode: string;
}

/** Commune (API Découpage administratif). */
export interface LcCommune {
  /** Code INSEE (COG), ex. « 69123 ». */
  readonly code: string;
  readonly name: string;
  readonly postalCodes: readonly string[];
  /** Code postal choisi quand la recherche portait sur un code postal, sinon `null`. */
  readonly postalCode: string | null;
  readonly departmentCode: string;
  readonly regionCode: string;
  readonly population: number | null;
}

/** Adresse (API Adresse de la Géoplateforme). */
export interface LcAddress {
  /** Identifiant BAN. */
  readonly id: string;
  /** Libellé complet, ex. « 8 Boulevard du Port 80000 Amiens ». */
  readonly label: string;
  readonly kind: 'housenumber' | 'street' | 'locality' | 'municipality';
  readonly houseNumber: string | null;
  readonly street: string | null;
  readonly postalCode: string;
  /** Code INSEE de la commune. */
  readonly cityCode: string;
  readonly city: string;
  /** Premier élément du contexte de l'API (code du département). */
  readonly departmentCode: string;
  readonly latitude: number;
  readonly longitude: number;
  /** Pertinence de 0 à 1. */
  readonly score: number;
}

export interface LcCommuneQuery {
  readonly text: string;
  readonly departmentCode?: string | null;
  /** Nombre maximal de communes (défaut 10). */
  readonly limit?: number;
}

export interface LcAddressQuery {
  readonly text: string;
  readonly kind?: LcAddress['kind'] | null;
  readonly postalCode?: string | null;
  readonly cityCode?: string | null;
  /** Nombre maximal d'adresses (défaut 8). */
  readonly limit?: number;
}
