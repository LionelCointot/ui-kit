# Exemple de référence : feature « products »

Feature volontairement simple (recherche + création) qui montre la séparation des couches.

| Fichier | Couche | Rôle |
|---|---|---|
| `core/api/api-client.ts` (non montré) | core/api | **Généré** depuis `/openapi/v1.json` du back : une classe `XxxClient` par groupe d'endpoints, les types DTO, le token `API_BASE_URL`. Jamais modifié à la main. |
| `products.mapper.ts` | data-access | DTO généré → modèle de vue, fonctions pures |
| `products.store.ts` | state | État en signaux, recherche avec debounce, actions ; appelle le client généré |
| `products-page.component.ts` | pages | Conteneur routé : branche le store sur les composants |
| `product-list.component.ts` | ui | Présentation pure : `input()` / `output()` |
| `products.store.spec.ts` | tests | Store testé avec un faux client |
| `products.mapper.spec.ts` | tests | Mapper testé sans TestBed |

Les noms exacts des classes et méthodes générées (`ProductsClient.search(...)`) dépendent des tags et des noms d'opérations déclarés côté back (`WithTags`, `WithName`).

Dans un vrai projet, ces fichiers vont dans `src/app/features/products/{data-access,state,pages,ui}/`.
