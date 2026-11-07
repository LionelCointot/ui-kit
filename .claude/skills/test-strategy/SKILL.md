---
name: test-strategy
description: Définit la stratégie de tests et écrit des tests (xUnit pour .NET, Vitest pour Angular, Playwright pour l'E2E). À utiliser quand l'utilisateur demande des tests, une couverture, une stratégie de test, du TDD, ou lors de l'implémentation d'une feature pour vérifier les critères d'acceptation de la spec.
---

# Test Strategy

## Approche
1. Partir des **critères d'acceptation** de la spec : chacun a au moins un test.
2. Pyramide : beaucoup de tests unitaires (logique métier), un nombre raisonnable de tests d'intégration (API, stockage), peu d'E2E (parcours critiques).
3. Bug : écrire d'abord un test qui échoue, puis corriger.
4. Calculs (finance, règles) : tests avec **valeurs de référence** calculées indépendamment (tableur, simulateur officiel), en tableau de cas.

## Règles
- Déterministes : pas de dépendance à l'heure (horloge injectée), à l'ordre, au réseau externe (faux aux frontières).
- Un test = un comportement ; nom explicite (`CreateAsync_WhenNameAlreadyExists_ThrowsConflict`, `'expose un message si la création échoue'`).
- Arrange / Act / Assert.
- Cas limites : vide, null, bornes (0, max), erreurs, permissions, arrondis.
- Tester le comportement observable, pas l'implémentation interne.
- Données de test via fabriques / builders, jamais de données de production.

## Outils par stack

| Niveau | .NET | Angular |
|---|---|---|
| Unitaire | xUnit (`[Fact]`, `[Theory]`), faux écrits à la main, `FakeTimeProvider` | Vitest, fonctions pures sans TestBed |
| Intégration | `WebApplicationFactory<Program>` (routes, codes HTTP, ProblemDetails) | TestBed + faux client d'API ou `HttpTestingController` |
| Composant | n/a | `fixture.componentRef.setInput()`, assertions sur le DOM et les rôles ARIA |
| E2E | n/a | Playwright, parcours critiques seulement |

Exemples : `dotnet-best-practices/examples/Tests/` et `angular-best-practices/examples/products/*.spec.ts`.

## Processus d'exécution
Lancer les commandes de test de `CLAUDE.md`, corriger les échecs, puis rapporter : tests ajoutés, résultat réel (sortie), zones non couvertes.
