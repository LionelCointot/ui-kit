---
name: api-design
description: Conception d'API HTTP (REST) et de leur contrat front/back. À utiliser pour définir des endpoints, schémas de requête/réponse, codes et format d'erreur, pagination, versioning, authentification d'API, génération du client TypeScript depuis l'OpenAPI, ou pour revoir la cohérence d'une API existante.
---

# API Design

## Conventions
- Ressources au pluriel, noms et non verbes : `GET /api/v1/products/{id}`, `POST /api/v1/orders`. Action métier sans ressource naturelle : `POST /api/v1/quotes/calculate`.
- Préfixe de version **`/api/v1`** ; ne jamais casser un contrat sans nouvelle version.
- Verbes HTTP corrects ; `PUT`/`DELETE` idempotents ; codes précis : 200, 201 (+ `Location`), 204, 400, 401, 403, 404, 409, 422, 429, 5xx.
- **JSON** : camelCase ; enums en texte (`"Standard"`) ; dates calendaires `"2026-01-15"`, instants ISO 8601 avec fuseau (`"2026-01-15T10:00:00Z"`) ; montants en nombre décimal (`decimal` côté .NET, jamais `double`), unité dans le nom si ambiguë.
- **Erreurs : ProblemDetails (RFC 9457)** partout, `Content-Type: application/problem+json`.
  - Validation : 400 avec `errors` par champ (`{ "items[1].quantity": ["La quantité doit être positive."] }`), noms de champs identiques au JSON.
  - Règle métier : 409 / 422 avec une extension `code` stable (`"PRODUCT_NAME_TAKEN"`) que le front peut tester.
  - 500 : message générique, aucun détail interne.
- **Avertissements non bloquants** : liste `warnings: [{ code, message }]` dans la réponse, plutôt qu'une erreur.
- **Pagination** : par curseur (`?limit=&cursor=`), réponse `{ items, nextCursor }` ; `limit` borné côté serveur.
- **Filtrage / tri** : paramètres explicites, liste blanche de champs.
- **Idempotence** : clé d'idempotence pour les créations sensibles (paiement).
- **Sécurité** : authentification sur toute route non publique, rate limiting, CORS par liste blanche.
- **Santé** : `GET /api/v1/health` pour les sondes de disponibilité.

## Contrat front ↔ back
- L'**OpenAPI** (Swagger) est **généré automatiquement** par le back à partir des endpoints (`/openapi/v1.json`) : jamais écrit à la main. C'est la source de vérité.
- Le client TypeScript du front est **généré** (NSwag ou openapi-generator) dans `core/api/`, jamais écrit ni modifié à la main ; une commande unique (`npm run api:generate`) régénère après chaque changement de contrat.
- Un changement de contrat = back + client régénéré + adaptation du front dans la même PR.

## Livrable
Pour chaque endpoint : méthode, chemin, auth, paramètres, corps (types, contraintes), réponses (succès et erreurs avec exemple ProblemDetails), exemple de requête.
