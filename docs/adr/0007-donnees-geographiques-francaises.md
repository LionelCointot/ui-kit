# ADR 0007 : données géographiques françaises (point d'entrée `geo`)

- **Statut** : Proposé
- **Date** : 2026-11-09
- **Spec** : [Liste filtrable, saisie géographique, curseur](../specs/2026-11-geographie-curseur-combobox.md)

## Contexte

Les projets consommateurs (module Crédit, module Acheter ou louer) demandent aux utilisateurs des codes de département. On veut des champs qui proposent régions, départements, communes et adresses françaises, **à partir des sources officielles** : l'API Découpage administratif (`geo.api.gouv.fr`) et l'API Adresse de la Géoplateforme (`data.geopf.fr/geocodage`). Ces API sont ouvertes, sans clé, avec CORS.

## Décision

1. Nouveau point d'entrée secondaire `@lionelcointot/ui-angular/geo`. Il **importe `forms`** (pour `lc-combobox` et l'enregistrement auprès de `lc-form-field`) : cette exception s'ajoute à la liste du CLAUDE.md. Aucun autre point d'entrée n'importe `geo`.
2. **Aucune donnée géographique dans le code** : la source officielle fait foi. Régions et départements sont téléchargés une fois par session (liste complète, filtrée localement, sans envoyer de texte saisi). Communes et adresses sont recherchées à la frappe.
3. Les appels partent **du navigateur** avec `fetch` (pas `HttpClient`), derrière une classe abstraite injectable `LcGeoDataSource`. URL de base configurable, implémentation remplaçable (proxy, faux de test).
4. Les valeurs de formulaire sont des **codes officiels** (`"69"`, `"84"`) pour régions et départements, et des objets plats sérialisables pour communes et adresses.

## Conséquences

- Positives : données toujours à jour (découpage administratif, nouvelles communes) sans maintenance ; saisie par nom ; aucune dépendance npm ajoutée ; réutilisable hors du produit finance (ex. CoproSyndic pour les adresses).
- Négatives : sans réseau, un champ `geo` ne permet pas de **changer** de valeur (la valeur existante reste affichée par son code) ; dépendance à des services publics sans SLA ; chaque consommateur doit autoriser ces domaines dans sa CSP (finance-hub : [ADR 0007](https://github.com/LionelCointot/finance-hub/blob/main/docs/adr/0007-csp-api-geographiques-publiques.md)).
- Le texte saisi dans les champs commune et adresse quitte l'appareil : à signaler dans la documentation des consommateurs. Rien n'est envoyé pour les régions et départements.

## Alternatives écartées

- Listes embarquées dans le paquet : liste en dur à maintenir, contraire au principe retenu (la source officielle fait foi).
- Paquet npm séparé : coût de publication disproportionné.
- Proxy .NET imposé : le ui-kit n'a pas de back et doit rester générique ; reste possible en remplaçant la source.
- `HttpClient` : les intercepteurs applicatifs (jetons) risqueraient de s'appliquer à un domaine tiers.
