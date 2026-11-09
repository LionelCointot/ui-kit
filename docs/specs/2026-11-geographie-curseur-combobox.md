# Spec : liste filtrable, saisie géographique française, curseur et repères de graphique

- **Statut** : En revue
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-09
- **ADR liés** : [0002 Comportement CDK et sélecteurs](../adr/0002-comportement-cdk-et-selecteurs.md) · [0003 ECharts](../adr/0003-bibliotheque-graphiques-echarts.md) · [0007 Données géographiques françaises](../adr/0007-donnees-geographiques-francaises.md) (nouveau)
- **Consommateurs identifiés** : finance-credit (département du bien), finance-rent-vs-buy (département en saisie simple, curseur d'épargne, horizon, repère du point d'équilibre)

## 1. Contexte et problème

Dans le module Crédit, l'utilisateur tape le **numéro** de département (« 69 », « 2A ») dans un champ texte validé par une expression régulière. Peu de gens connaissent le numéro de tous les départements, et l'erreur n'apparaît qu'après la saisie. Le futur module « Acheter ou louer » a les mêmes besoins, plus un **curseur** pour choisir la part de l'écart mensuel que le locataire épargne, en pourcentage ou en euros, et un **repère vertical** sur un graphique pour marquer le point d'équilibre.

Le ui-kit n'a ni liste filtrable (`lc-combobox`, prévue « à la demande » au catalogue, n° 45), ni curseur, ni repère de graphique. Les API publiques françaises (API Découpage administratif `geo.api.gouv.fr`, API Adresse de la Géoplateforme `data.geopf.fr/geocodage`) permettent de proposer régions, départements, communes et adresses sans saisie de codes.

## 2. Objectifs

- Une liste filtrable **générique** `lc-combobox<T>` (filtrage local ou recherche asynchrone), conforme au motif ARIA *combobox* avec liste.
- Un point d'entrée `geo` : régions, départements, communes et adresses lus **depuis les API officielles** (aucune liste écrite en dur dans le code), derrière une **source de données injectable** (URL surchargeable, remplaçable par un proxy ou un faux).
- Un curseur **générique** `lc-slider` (`FormValueControl<number | null>`) : la valeur est un nombre, accompagné d'une **unité libre** (« % », « € », « ans »…), avec saisie numérique couplée.
- Sur `lc-line-chart` et `lc-area-chart` : repères verticaux et points annotés ; style de trait et symbole par série.
- Aucun vocabulaire métier : « région », « département », « commune », « adresse » sont du découpage administratif, pas de la finance.

## 3. Hors périmètre (non-objectifs)

- Cartes, contours (GeoJSON), géocodage inverse, EPCI, arrondissements municipaux, collectivités d'outre-mer hors des 101 départements (975, 977, 978, 986, 987, 988).
- Curseur à deux poignées (intervalle) : pas de consommateur.
- Données géographiques embarquées ou mode hors ligne : **choix délibéré**, la source officielle fait foi (sans réseau, les champs `geo` affichent un état d'erreur avec « Réessayer »).
- Conversion d'unités dans `lc-slider` (60 avec l'unité « % » vaut 60, pas 0,6).
- `lc-dropdown-list` (reste non implémentée : `lc-combobox` couvre le besoin des listes longues).
- Sélection d'année liée entre plusieurs graphiques (la sortie `pointSelect` existante suffit pour l'instant).

## 4. Utilisateurs et cas d'usage

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Utilisateur du Crédit | Tape « rhô » ou « 69 » dans « Département » | « 69 – Rhône » proposé en tête ; la valeur du formulaire vaut `"69"` |
| Utilisateur | Ouvre la liste des départements | Les départements renvoyés par `geo.api.gouv.fr` (chargés une fois par session), filtrés localement pendant la frappe |
| Utilisateur sans réseau | Ouvre la liste des départements | « Recherche indisponible pour le moment » + « Réessayer » ; la valeur déjà choisie reste affichée (son code) |
| Utilisateur | Tape « 69003 » dans « Commune » | « Lyon · 69003 » proposé ; la valeur contient le code INSEE `69123`, le code postal `69003`, le département `69` |
| Utilisateur | Tape « 8 bd du port » dans « Adresse » | Adresses de la Géoplateforme proposées, coordonnées incluses |
| Utilisateur d'Acheter ou louer | Glisse le curseur « Part de l'écart épargnée » | La valeur suit en direct ; `aria-valuetext` annonce « 60 % » |
| Développeur d'un projet | Veut passer par son propre back | Fournit sa source (`LcGeoDataSource`) ou une autre URL de base |
| Développeur | Veut marquer un événement sur une courbe | `markers` sur `lc-line-chart` : ligne verticale + étiquette |

## 5. Solution proposée

### 5.1 Vue d'ensemble de l'architecture

```
@lionelcointot/ui-angular
├── forms   + lc-combobox<T>, [lcComboboxOption], lc-slider, lcHighlight (surlignage sans innerHTML), lcFilterOptions
├── geo     (NOUVEAU, importe forms : exception consignée dans l'ADR 0007)
│     provideLcGeo() · LcGeoDataSource (abstraite) · LcGouvGeoDataSource (fetch, API officielles)
│     lc-region-select · lc-department-select · lc-commune-input · lc-address-input
└── charts  + markers (repères), LcChartSeries.lineStyle / symbol

lc-commune-input ──► lc-combobox ──search()──► LcGeoDataSource.searchCommunes()
                                                  └─ fetch https://geo.api.gouv.fr/communes?…   (annulable, 5 s)
lc-address-input ──► lc-combobox ──search()──► LcGeoDataSource.searchAddresses()
                                                  └─ fetch https://data.geopf.fr/geocodage/search?…
lc-department-select ─► lc-combobox ──search()──► filtre local (lcFilterOptions) de LcGeoDataSource.departments()
                                                  └─ fetch https://geo.api.gouv.fr/departements  (une fois par session, promesse partagée)
lc-region-select     ─► idem avec /regions
```

Régions et départements : la liste complète est téléchargée **une seule fois** (≈ 8 Kio), puis filtrée localement ; **aucun texte saisi n'est envoyé** pour ces deux champs. Communes et adresses : le texte saisi est envoyé à l'API (recherche serveur, pas de liste complète possible).

Les appels partent du **navigateur** (CORS ouvert, sans clé). `fetch` est utilisé plutôt que `HttpClient` : aucun intercepteur applicatif (jeton de session, `X-Finance-Token`) ne peut s'appliquer à ces requêtes tierces, et le ui-kit n'impose pas `provideHttpClient`.

### 5.2 Modèle de données

```ts
// geo/src/geo.types.ts
export interface LcRegion { readonly code: string; readonly name: string; }                // "84", "Auvergne-Rhône-Alpes"
export interface LcDepartment { readonly code: string; readonly name: string; readonly regionCode: string; } // "69", "Rhône", "84"
export interface LcCommune {
  readonly code: string;                 // code INSEE (COG), ex. "69123"
  readonly name: string;                 // "Lyon"
  readonly postalCodes: readonly string[];
  readonly postalCode: string | null;    // code postal choisi si la recherche portait sur un code postal, sinon null
  readonly departmentCode: string;
  readonly regionCode: string;
  readonly population: number | null;
}
export interface LcAddress {
  readonly id: string;                   // identifiant BAN
  readonly label: string;                // « 8 Boulevard du Port 80000 Amiens »
  readonly kind: 'housenumber' | 'street' | 'locality' | 'municipality';
  readonly houseNumber: string | null;
  readonly street: string | null;
  readonly postalCode: string;
  readonly cityCode: string;             // code INSEE
  readonly city: string;
  readonly departmentCode: string;       // 1er élément de `context`
  readonly latitude: number;
  readonly longitude: number;
  readonly score: number;                // 0..1
}
export interface LcCommuneQuery { readonly text: string; readonly departmentCode?: string | null; readonly limit?: number; }
export interface LcAddressQuery {
  readonly text: string; readonly kind?: LcAddress['kind'] | null;
  readonly postalCode?: string | null; readonly cityCode?: string | null; readonly limit?: number;
}
```

**Aucune donnée géographique dans le paquet** : régions et départements viennent de l'API Découpage administratif à l'exécution, triés par code. Les codes officiels (`"69"`, `"2A"`, `"84"`) sont les valeurs de formulaire ; le nombre de départements n'est pas figé dans le code.

**Libellés** (`LcLabels`, français et anglais) : `comboboxNoResults` (« Aucun résultat »), `comboboxResultsCount` (« {count} résultats disponibles »), `comboboxSearching` (« Recherche en cours »), `comboboxSearchUnavailable` (« Recherche indisponible pour le moment »), `comboboxTooManyRequests` (« Trop de recherches, réessayez dans un instant »), `comboboxRetry` (« Réessayer »), `comboboxChooseProposal` (« Choisissez une proposition dans la liste »), `comboboxClear` (« Effacer »), `comboboxMinLength` (« Saisissez au moins {count} caractères »), `geoUnknownCode` (« Code inconnu : {code} »).

### 5.3 API / interfaces

#### 5.3.1 `lc-combobox<T>` (point d'entrée `forms`)

`FormValueControl<T | null>`. Élément hôte composite contenant un `input` natif (rôle `combobox`) et un panneau CDK Overlay (rôle `listbox`).

| Entrée / sortie | Type | Défaut | Rôle |
|---|---|---|---|
| `value` | `model<T \| null>` | `null` | élément sélectionné |
| `options` | `readonly T[] \| null` | `null` | mode **local** : liste filtrée en mémoire |
| `search` | `((text: string, signal: AbortSignal) => Promise<readonly T[]>) \| null` | `null` | mode **asynchrone** (exclusif avec `options` ; avertissement en développement si les deux ou aucun) |
| `displayWith` | `(item: T) => string` | obligatoire | texte du champ après sélection |
| `trackBy` | `(item: T) => string` | obligatoire | clé stable (égalité de valeur, identifiants d'options) |
| `filterKeys` | `(item: T) => readonly string[]` | `[displayWith(item)]` | textes comparés en mode local (ex. code et nom) |
| `minLength` | `number` | 0 en local, 2 en asynchrone | caractères avant recherche |
| `debounceMs` | `number` | 200 | asynchrone seulement |
| `maxResults` | `number` | 50 | local seulement |
| `openOnFocus` | `boolean` | `true` en local, `false` en asynchrone | |
| `clearable` | `boolean` | `true` | bouton « Effacer » (`lcButton` icône `x`) |
| `placeholder`, `inputId`, `ariaLabel` | `string?` | | |
| communes | `size`, `disabled`, `readonly`, `invalid`, `themeColor`, `fillMode`, `rounded` | | API commune |
| `selectionChange` | `output<T \| null>` | | sélection par l'utilisateur (pas lors d'un `value` posé par le code) |
| `searchFailed` | `output<unknown>` | | erreur de la fonction `search` (le composant affiche l'état d'erreur) |

Gabarit d'option facultatif : `<ng-template lcComboboxOption let-item let-text="text">…</ng-template>`. Directive `lcHighlight` : `<span [lcHighlight]="label" [lcHighlightTerm]="text">` découpe le texte en segments et entoure les correspondances de `<mark>` par le gabarit, **sans `innerHTML`**.

**Filtrage local** : normalisation (minuscules, suppression des diacritiques par `NFD`, tirets et apostrophes remplacés par des espaces, espaces multiples réduits). Tri : égalité exacte d'une clé, puis préfixe d'une clé, puis préfixe d'un mot, puis sous-chaîne ; à rang égal, ordre d'origine. Utilitaires exportés `lcNormalizeSearchText(text)` et `lcFilterOptions(items, text, keys, max)` (même algorithme, réutilisable dans une fonction `search` qui charge d'abord une liste distante puis filtre localement).

**Comportement**
- Saisir un texte différent de `displayWith(value)` remet `value` à `null` (une seule émission de `selectionChange`).
- À la sortie du champ : si le texte normalisé est égal à une seule option normalisée, elle est sélectionnée ; sinon le texte reste, `value` vaut `null` et le message `comboboxChooseProposal` est relié par `aria-describedby`. La validation « obligatoire » reste celle du formulaire du consommateur.
- Asynchrone : chaque recherche annule la précédente (`AbortController`) ; seul le dernier résultat est affiché. Pendant la recherche : indicateur `lc-spinner` en suffixe, `aria-busy="true"` sur la liste.
- États du panneau : résultats ; vide (`comboboxNoResults`) ; texte trop court (`comboboxMinLength`) ; erreur (`comboboxSearchUnavailable` ou `comboboxTooManyRequests`, avec une option « Réessayer » activable au clavier).
- Région `aria-live="polite"` : annonce `comboboxResultsCount` 500 ms après la fin d'une recherche (une annonce par recherche).
- Clavier (motif APG « combobox avec liste ») : Bas ouvre ou descend ; Haut monte ; Alt+Bas ouvre sans déplacer ; Entrée sélectionne l'option active ; Échap ferme, puis un second Échap vide le champ ; Tab ferme sans sélectionner ; Début et Fin restent dans le texte. Comportement fourni par `ActiveDescendantKeyManager` du CDK (ADR 0002).
- ARIA : `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` ; options `role="option"`, `aria-selected`.
- Panneau : `FlexibleConnectedPositionStrategy` (dessous, sinon dessus), largeur du champ, hauteur maximale par token `--lc-combobox-panel-max-height`, repositionné au défilement.

#### 5.3.2 `lc-slider` (point d'entrée `forms`)

`FormValueControl<number | null>` sur un `input[type=range]` natif (clavier, lecteurs d'écran et tactile gérés par le navigateur). **Générique** : la valeur est toujours un nombre ; l'unité n'est qu'un libellé, comme pour `lc-number-input`. C'est au consommateur de changer `min`, `max`, `step` et `unit` s'il bascule d'une grandeur à une autre (ex. « % » puis « € »).

| Entrée / sortie | Type | Défaut | Rôle |
|---|---|---|---|
| `value` | `model<number \| null>` | `null` | `null` affiche la poignée à `min` et aucune valeur |
| `min`, `max`, `step` | `number` | 0, 100, 1 | `step` peut être décimal |
| `unit` | `string?` | — | unité affichée après la valeur et dans le champ couplé (« % », « € », « €/mois », « ans ») ; aucune conversion |
| `decimals` | `number` | 0 | arrondi de la valeur émise et décimales affichées |
| `showValue` | `'none' \| 'label' \| 'input'` | `'label'` | `label` : valeur au format numérique français + unité, à droite ; `input` : `lc-number-input` couplé (même `min`, `max`, `step`, `decimals`, `unit`), saisie au clavier exacte |
| `marks` | `readonly { value: number; label?: string }[]` | `[]` | graduations sous la piste (`datalist` natif + libellés) |
| `valueText` | `(value: number) => string` | « {valeur formatée} {unité} » | `aria-valuetext` (ex. « 60 % de l'écart ») |
| `inputId`, `ariaLabel` | `string?` | | rattachement à `lc-form-field` par `LC_FORM_FIELD_CONTROL` |
| communes | `size`, `disabled`, `readonly`, `invalid`, `themeColor` | | |
| `committed` | `output<number \| null>` | | fin de geste (`change`), pour un calcul coûteux ; `value` suit l'événement `input` |

- Remplissage de la piste par la variable `--lc-slider-fill` (pourcentage calculé), aucune couleur en dur. Tokens : `--lc-slider-track-height`, `--lc-slider-track-color`, `--lc-slider-fill-color`, `--lc-slider-thumb-size` (≥ 24 px de zone cible, WCAG 2.2 § 2.5.8), `--lc-slider-thumb-color`, anneau de focus `sys`.
- Clavier natif : flèches ± `step`, Page haut/bas ± 10 `step`, Début et Fin.
- Valeur hors bornes venant du modèle : conservée, poignée affichée à la borne, erreur laissée à la validation (convention du catalogue). Changement de `min`/`max`/`unit` par le consommateur : aucune correction silencieuse.
- `readonly` : la poignée ne bouge pas (attribut `aria-readonly`, interactions bloquées) mais reste focalisable.

#### 5.3.3 Point d'entrée `geo`

```ts
export interface LcGeoOptions {
  readonly geoApiBaseUrl?: string;       // défaut 'https://geo.api.gouv.fr'
  readonly addressApiBaseUrl?: string;   // défaut 'https://data.geopf.fr/geocodage'
  readonly timeoutMs?: number;           // défaut 5000
}
export function provideLcGeo(options?: LcGeoOptions): EnvironmentProviders;

export abstract class LcGeoDataSource {
  abstract regions(signal: AbortSignal): Promise<readonly LcRegion[]>;          // liste complète, mise en cache
  abstract departments(signal: AbortSignal): Promise<readonly LcDepartment[]>;  // liste complète, mise en cache
  abstract searchCommunes(query: LcCommuneQuery, signal: AbortSignal): Promise<readonly LcCommune[]>;
  abstract searchAddresses(query: LcAddressQuery, signal: AbortSignal): Promise<readonly LcAddress[]>;
}
export class LcGouvGeoDataSource extends LcGeoDataSource { /* implémentation par défaut */ }
export class LcGeoRequestError extends Error { readonly status: number | null; readonly kind: 'network' | 'timeout' | 'rate-limited' | 'http' | 'invalid-response'; }
```

`provideLcGeo` fournit `LcGeoDataSource` → `LcGouvGeoDataSource`. Un projet le remplace par `{ provide: LcGeoDataSource, useClass: MySource }`. Sans `provideLcGeo`, les composants lèvent une erreur explicite en développement seulement et restent désactivés.

**Requêtes de `LcGouvGeoDataSource`**

| Méthode | Requête | Correspondance |
|---|---|---|
| `regions` | `GET {geo}/regions?fields=nom,code` | `{ code, name }`, tri par code |
| `departments` | `GET {geo}/departements?fields=nom,code,codeRegion` | `{ code, name, regionCode }`, tri par code (« 2A » et « 2B » entre « 19 » et « 21 ») |
| `searchCommunes`, texte de 5 chiffres | `GET {geo}/communes?codePostal={texte}&fields=nom,code,codesPostaux,codeDepartement,codeRegion,population` | une entrée par commune, `postalCode` = texte |
| `searchCommunes`, autre texte | `GET {geo}/communes?nom={texte}&fields=…&boost=population&limit={limit=10}` (+ `&codeDepartement=` si fourni) | `postalCode` = `null` |
| `searchAddresses` | `GET {addr}/search?q={texte}&autocomplete=1&index=address&limit={limit=8}` (+ `type`, `postcode`, `citycode`) | `features[].properties` + `geometry.coordinates` (longitude, latitude) |

- Tous les paramètres passent par `URLSearchParams`. Le texte est réduit à 200 caractères ; l'API Adresse exige 3 caractères au moins, commençant par une lettre ou un chiffre (sinon aucun appel, état `comboboxMinLength`).
- Délai : `AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])`.
- Réponses **validées** champ par champ : un élément incomplet est ignoré (avertissement en développement), un corps non conforme lève `LcGeoRequestError('invalid-response')`. HTTP 429 → `rate-limited`.
- Listes `regions` et `departments` : **une requête par session** (promesse partagée entre tous les champs) ; en cas d'échec, la promesse est oubliée pour qu'un « Réessayer » relance l'appel. Un signal annulé par un champ n'annule pas le chargement partagé.
- Recherches de communes et d'adresses : cache LRU en mémoire de 50 requêtes par instance (clé = requête normalisée), sans persistance.

**Composants** (tous construits sur `lc-combobox`, enregistrés auprès de `lc-form-field`)

| Composant | Valeur (`model`) | Entrées propres | Affichage |
|---|---|---|---|
| `lc-region-select` | `string \| null` (code région) | — | « Auvergne-Rhône-Alpes » ; recherche locale par nom ou code dans la liste chargée |
| `lc-department-select` | `string \| null` (code département) | `regionCode: string \| null` (restreint la liste) | champ « 69 – Rhône » ; option : code en chiffres tabulaires, nom, région en texte secondaire ; recherche par numéro (« 69 », « 2a », « 974 ») ou nom (« rhone ») |
| `lc-commune-input` | `LcCommune \| null` | `departmentCode: string \| null` | champ « Lyon (69) » ou « Lyon · 69003 » ; option : nom, codes postaux (3 au plus, puis « … »), département |
| `lc-address-input` | `LcAddress \| null` | `kind`, `postalCode`, `cityCode` | champ = `label` ; option : libellé surligné, ville en secondaire |

Chaque composant expose aussi `selectionChange` avec l'objet complet (`LcRegion`, `LcDepartment`, …).

Règles :
- `lc-region-select` et `lc-department-select` utilisent `lc-combobox` en mode `search` (chargement de la liste puis `lcFilterOptions`), avec `minLength: 0` et `openOnFocus: true`. Ils lancent le chargement de la liste dès leur création, pour afficher le libellé de la valeur existante.
- Tant que la liste n'est pas chargée (ou si son chargement échoue), une valeur existante s'affiche par son code brut (« 69 »), puis par « 69 – Rhône » une fois la liste reçue.
- `lc-department-select` : si `regionCode` change et que la valeur courante n'appartient plus à la région, la valeur passe à `null` et `selectionChange` est émis (seulement une fois la liste chargée).
- Code absent de la liste chargée (ex. `"975"` d'un ancien scénario) : la valeur est **conservée**, le champ affiche le code brut et l'aide `geoUnknownCode`.

#### 5.3.4 Graphiques (point d'entrée `charts`, ajouts compatibles)

```ts
export interface LcChartSeries {
  // … champs existants
  readonly lineStyle?: 'solid' | 'dashed';                          // défaut 'solid'
  readonly symbol?: 'circle' | 'square' | 'triangle' | 'diamond';   // forme des points et de la légende
}
export interface LcChartMarker {
  readonly id: string;
  readonly categoryIndex: number;      // position sur l'axe des catégories
  readonly label: string;              // texte affiché (échappé), aussi dans la vue tableau et la description accessible
}
export interface LcChartPointAnnotation {
  readonly seriesId: string;
  readonly categoryIndex: number;
  readonly label: string;
  readonly emphasis: 'primary' | 'secondary';   // primary : point plein ≥ 8 px ; secondary : rond creux discret
}
```

Nouvelles entrées de `lc-line-chart` et `lc-area-chart` : `markers: readonly LcChartMarker[]` (ligne verticale fine, couleur d'encre atténuée par token `--lc-chart-marker-color`, étiquette en encre en haut de la zone de tracé ; au plus 3, les suivantes ignorées avec avertissement en développement) et `annotations: readonly LcChartPointAnnotation[]`. Les repères et annotations sont ajoutés à la description accessible (« Repère : {label} ») et en ligne dédiée dans « Voir les données ». Un `categoryIndex` hors limites est ignoré (avertissement en développement).

Icône ajoutée aux icônes par défaut : `scale` (Lucide, licence ISC), pour le menu du module « Acheter ou louer ».

### 5.4 Interface utilisateur

| Élément | États |
|---|---|
| `lc-combobox` | repos, survol, focus (anneau `sys`), ouvert, recherche (spinner en suffixe), vide, erreur avec « Réessayer », texte non validé (aide `comboboxChooseProposal` en couleur d'erreur **avec** icône), désactivé, lecture seule (aucune ouverture) |
| `lc-slider` | repos, survol (poignée agrandie de 2 px), focus visible, glissement, désactivé (opacité token), lecture seule, invalide (piste en couleur d'erreur + message du champ) |
| Composants `geo` | ceux du combobox ; liste en cours de chargement (spinner en suffixe) ; liste indisponible (état d'erreur avec « Réessayer », valeur existante affichée par son code) |

- Thèmes clair et sombre par les tokens ; contraste ≥ 4.5:1 pour le texte, ≥ 3:1 pour la piste, la poignée et l'anneau de focus.
- Mobile (≤ 767 px) : panneau du combobox en pleine largeur du champ, options de 44 px de haut.
- Stories Storybook : combobox local et asynchrone (faux de 300 ms, erreur, vide), curseur avec les unités « % », « € » et « ans » et `showValue` `input`, chaque composant `geo` avec une source factice, graphique avec repère et annotations. Contrôle a11y Storybook vert pour chaque story.

## 6. Cas limites et gestion des erreurs

| Cas | Comportement |
|---|---|
| Réseau coupé, délai dépassé | État d'erreur du panneau, « Réessayer » ; aucune exception non gérée ; la valeur courante est conservée |
| HTTP 429 de l'API | `comboboxTooManyRequests` ; nouvel essai manuel |
| Réponse arrivée après une recherche plus récente | Ignorée (requête annulée) |
| Saisie de 1 000 caractères | Tronquée à 200 avant l'appel |
| `options` et `search` fournis ensemble | `search` ignoré, avertissement en développement |
| Commune avec 20 codes postaux (Paris, Marseille) | 3 codes affichés puis « … » ; tous dans `postalCodes` |
| Code postal partagé par plusieurs communes | Une option par commune |
| Fusion de communes (code INSEE disparu) | La valeur stockée par le consommateur reste affichée telle quelle |
| Liste des départements indisponible au démarrage | Valeur existante affichée par son code ; à l'ouverture, état d'erreur et « Réessayer » ; aucune exception |
| Découpage administratif modifié (nouveau département) | Pris en compte automatiquement : la liste vient de l'API |
| Valeur du modèle posée par le code | Affichée sans émettre `selectionChange` et sans requête réseau |
| `lc-slider` avec `min > max` | Avertissement en développement, rendu du navigateur |
| `marks` hors bornes | Ignorées |

## 7. Sécurité, performance, observabilité

- **Sécurité** : aucun `innerHTML` (surlignage par segments) ; réponses tierces validées et réduites aux champs connus ; aucun en-tête d'authentification envoyé (`fetch` direct, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`) ; URL construites par `URLSearchParams`.
- **Vie privée** : régions et départements : une requête de liste complète, **sans aucune donnée saisie**. Communes et adresses : le texte tapé est envoyé à des services publics (DINUM, IGN) ; le README du point d'entrée le signale.
- **CSP** : un consommateur doit autoriser `connect-src https://geo.api.gouv.fr` (régions, départements, communes) et `https://data.geopf.fr` s'il utilise les adresses.
- **Performance** : listes chargées une fois par session (≈ 8 Kio) ; filtrage local d'une centaine d'éléments < 2 ms ; recherches distantes limitées à une requête en vol par champ, anti-rebond de 200 ms, cache LRU. Point d'entrée `geo` < 10 Kio minifiés, mesuré au build.
- **Observabilité** : avertissements console en développement seulement (`isDevMode()`), conformément au CLAUDE.md.

## 8. Alternatives envisagées

| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| `select[lcSelect]` natif de 101 départements avec `optgroup` par région | natif, zéro code | recherche par nom impossible au clavier (la frappe ne vise que le début du libellé), liste longue sur mobile | Non (reste possible pour un consommateur via `LcGeoDataSource.departments()`) |
| Régions et départements embarqués dans le paquet (fichier généré) | hors ligne, CSP inchangée | liste en dur à maintenir à la main, contraire au principe « la source officielle fait foi » | Non (décision du propriétaire du produit, ADR 0007) |
| Liste rechargée à chaque ouverture du champ | aucune mémoire | requêtes inutiles | Non : une fois par session |
| Recherche serveur pour les départements (`/departements?nom=`) | pas de liste en mémoire | le texte saisi part sur le réseau ; pas de recherche par numéro partiel | Non : liste complète filtrée localement |
| Paquet séparé `@lionelcointot/ui-geo-fr` | isolation | un paquet de plus à publier et versionner, pour quelques Kio | Non : point d'entrée secondaire (ADR 0007) |
| `HttpClient` au lieu de `fetch` | intercepteurs, tests Angular | les intercepteurs applicatifs pourraient ajouter des jetons vers un tiers ; impose `provideHttpClient` | Non |
| Proxy dans le back .NET | cache serveur, CSP inchangée | le ui-kit n'a pas de back ; couplage au produit | Possible pour un consommateur en remplaçant `LcGeoDataSource` |
| Angular Aria combobox | moins de code | non retenu par l'ADR 0002 (CDK seul) | Non |
| Curseur maison (div + `role="slider"`) | style libre | accessibilité et tactile à réécrire | Non : `input[type=range]` stylé |

## 9. Plan de test

- **Unitaires (Vitest)** : `lcNormalizeSearchText` et `lcFilterOptions` (diacritiques, tirets, casse, tri) ; chargement partagé des listes (une seule requête pour trois champs, nouvel essai après échec) ; tri du filtrage local ; `lc-combobox` (sélection, remise à `null` à la saisie, sortie sans proposition, annulation des recherches concurrentes avec un faux `search` contrôlé, états vide et erreur, clavier complet, ARIA) ; `lc-slider` (formats, `showValue: 'input'` synchronisé, `committed`, hors bornes, lecture seule) ; `LcGouvGeoDataSource` avec `fetch` simulé (construction des URL, validation des réponses, 429, délai, cache) ; composants `geo` avec une source factice (restriction par région, code inconnu conservé) ; repères et annotations (options ECharts produites par les builders purs).
- **Visuel / a11y** : stories Storybook avec contrôle a11y ; captures Playwright quand `test:visual` existera.
- **Contrat réel** (manuel, non bloquant en CI) : une story « API réelle » pour vérifier les deux services publics.

## 10. Critères d'acceptation

- [ ] Taper « rho » dans `lc-department-select` propose « 69 – Rhône » en première position ; Entrée pose `"69"` dans le formulaire.
- [ ] Taper « 2a » propose « 2A – Corse-du-Sud » ; « 974 » propose « 974 – La Réunion ».
- [ ] La liste des départements vient de `GET https://geo.api.gouv.fr/departements` : une seule requête par session pour plusieurs champs, et aucun texte saisi n'est envoyé (vérifié par un `fetch` espion).
- [ ] Le code ne contient aucune liste de régions ni de départements (revue du diff).
- [ ] Réseau coupé : le champ affiche la valeur existante par son code, l'ouverture montre l'état d'erreur, « Réessayer » relance la requête.
- [ ] `lc-commune-input` : « 69003 » produit une valeur avec `code: "69123"`, `postalCode: "69003"`, `departmentCode: "69"` (faux de source).
- [ ] Deux frappes rapides : seule la réponse de la dernière est affichée, la précédente est annulée (`AbortSignal.aborted === true`).
- [ ] Panneau, clavier et ARIA conformes au tableau §5.3.1 (tests unitaires) ; contrôle a11y Storybook sans violation.
- [ ] `lc-slider` avec `unit="%"` et la valeur 60 : `aria-valuetext` vaut « 60 % » ; avec `unit="€"` et 1500 : « 1 500 € » ; en `showValue: 'input'`, taper 42 dans le champ couplé met le curseur à 42.
- [ ] `lc-line-chart` avec un `marker` affiche la ligne et son étiquette, et la vue tableau contient la ligne « Repère ».
- [ ] Aucun `innerHTML` ajouté (vérification par recherche dans le diff) ; aucune couleur en dur (stylelint).
- [ ] Build, tests, Storybook statique et a11y passent ; taille du point d'entrée `geo` < 10 Kio minifiés.

## 11. Découpage en tâches

- [x] T1 : ADR 0007 (déjà rédigé), libellés `LcLabels` FR/EN, `lcNormalizeSearchText`, directive `lcHighlight` + tests (S)
- [x] T2 : `lc-combobox` local (panneau CDK, clavier, ARIA, états) + stories + tests (M)
- [x] T3 : `lc-combobox` asynchrone (anti-rebond, annulation, erreur, réessai, annonce) + tests (M)
- [x] T4 : `lc-slider` (+ `showValue: 'input'`, `marks`, tokens) + stories + tests (M)
- [x] T5 : point d'entrée `geo` : `LcGeoDataSource`, `LcGouvGeoDataSource` (listes partagées, recherches, validation des réponses, cache), `provideLcGeo` + tests (M)
- [ ] T6 : `lc-region-select`, `lc-department-select` + stories + tests (S)
- [ ] T7 : `lc-commune-input`, `lc-address-input` + stories (source factice et API réelle) + tests (M)
- [ ] T8 : graphiques : `lineStyle`, `symbol`, `markers`, `annotations` (builders purs, a11y, vue tableau) + icône `scale` (S)
- [ ] T9 : catalogue (lignes 45 et nouvelles), README `geo` (vie privée, CSP), CLAUDE.md (exception d'import), version mineure (S)

Ordre conseillé : T1 → T2 → T3 → T4 (parallélisable avec T5) → T6 → T7 → T8 → T9. Chaque tâche se termine par build, tests et a11y Storybook verts.

## 12. Risques et questions ouvertes

- **Disponibilité des API publiques** : pas de SLA ni de quota documenté précisément. Sans réseau, on ne peut pas **changer** de département (la valeur existante reste). Atténuation : une requête de liste par session, cache, anti-rebond, « Réessayer », source remplaçable (proxy).
- **Migration de l'API Adresse** : l'ancien domaine `api-adresse.data.gouv.fr` a été annoncé décommissionné fin janvier 2026 ; la spec n'utilise que `data.geopf.fr/geocodage`. À revérifier au moment de T7.
- **Contenu de la liste** : `lc-department-select` propose exactement ce que renvoie l'API (aujourd'hui les 101 départements, sans les collectivités 975, 977, 978). Aucun filtrage ni ajout côté ui-kit.
