# @lionelcointot/ui-angular/geo

Champs de saisie **géographiques français** : région, département, commune, adresse. Les données viennent des
**API officielles** (aucune liste n'est embarquée) ; la source est remplaçable. Le point d'entrée **importe `forms`**
(il compose `lc-combobox` ; exception consignée dans l'[ADR 0007](../../../docs/adr/0007-donnees-geographiques-francaises.md)).

| Composant | Valeur du formulaire | Source |
|---|---|---|
| `lc-region-select` | code région (`"84"`) | `geo.api.gouv.fr/regions` |
| `lc-department-select` | code département (`"69"`, `"2A"`, `"974"`), entrée `regionCode` | `geo.api.gouv.fr/departements` |
| `lc-commune-input` | `LcCommune` (code INSEE, codes postaux, département, région), entrée `departmentCode` | `geo.api.gouv.fr/communes` |
| `lc-address-input` | `LcAddress` (libellé, code postal, code INSEE, département, coordonnées), entrées `kind`, `postalCode`, `cityCode` | `data.geopf.fr/geocodage` (API Adresse) |

## Utilisation

```ts
bootstrapApplication(AppComponent, { providers: [provideLcGeo()] });
```

```html
<lc-form-field label="Département">
  <lc-department-select [formField]="form.department" />
</lc-form-field>
```

Sans `provideLcGeo()`, les champs restent désactivés et une erreur explicite s'affiche en développement.

## Vie privée

- **Régions et départements** : une requête de **liste complète** par session (`GET /regions` pour `lc-region-select`,
  `GET /departements` seule pour `lc-department-select`), partagée entre tous les champs, puis filtrage **local**. **Aucun texte saisi n'est envoyé.**
- **Communes et adresses** : le **texte tapé est envoyé** à des services publics (API Découpage administratif de la DINUM,
  API Adresse de la Géoplateforme de l'IGN), après 200 ms de pause dans la frappe. À signaler dans la politique de
  confidentialité de l'application.
- Les requêtes partent du navigateur avec `fetch` : `credentials: 'omit'` (aucun cookie), `referrerPolicy: 'no-referrer'`,
  aucun en-tête d'authentification, aucun intercepteur HTTP de l'application (pas de `HttpClient`).

## Politique de sécurité du contenu (CSP)

L'application doit autoriser les domaines utilisés dans `connect-src` :

```
connect-src 'self' https://geo.api.gouv.fr https://data.geopf.fr;
```

`https://geo.api.gouv.fr` pour les régions, départements et communes ; `https://data.geopf.fr` seulement si
`lc-address-input` est utilisé.

## Hors ligne et indisponibilité

La source officielle fait foi : sans réseau, un champ **ne permet pas de changer de valeur**. La valeur existante reste
affichée par son code, l'ouverture de la liste montre « Recherche indisponible pour le moment » et une option
« Réessayer » (la requête est relancée). Un code absent de la liste reçue (ex. `"975"`) est conservé et signalé
(« Code inconnu : 975 »).

## Remplacer la source (proxy, faux de test)

```ts
@Injectable()
class MaSource extends LcGeoDataSource { /* regions, departments, searchCommunes, searchAddresses */ }

providers: [provideLcGeo(), { provide: LcGeoDataSource, useClass: MaSource }]
```

`provideLcGeo({ geoApiBaseUrl, addressApiBaseUrl, timeoutMs })` change les URL de base (défauts :
`https://geo.api.gouv.fr`, `https://data.geopf.fr/geocodage`, 5000 ms). Les tests n'appellent jamais le réseau :
simuler `fetch` ou fournir une source factice.
