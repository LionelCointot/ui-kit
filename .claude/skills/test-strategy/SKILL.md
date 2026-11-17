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

Exemples : `angular-best-practices/examples/products/*.spec.ts` et, si le skill est présent, `dotnet-best-practices/examples/Tests/`.

## Qui teste quoi (workflow `delivery-workflow`)
- `senior-developer` : **tests unitaires** du code qu'il écrit (fonction, classe, composant isolé). Toute logique nouvelle non triviale a son test ; pour un bug, le test qui échoue d'abord. Il livre un code testable (dépendances injectées).
- `qa-engineer` : **tests d'acceptation**, écrits à partir de la spec et non de l'implémentation, avant ou pendant le code : chaque `CA-n` a un test, nommé ou commenté avec son identifiant, au niveau le plus bas qui le prouve (API, service, composant). Il écrit aussi les **parcours de bout en bout** et les **tests d'architecture** proposés par `architect`. Matrice `CA-n` → test → résultat dans son verdict.
- Le développeur ne modifie jamais un test qui porte un `CA-n` ni un parcours de bout en bout : s'il le juge faux, il le signale.
- `code-reviewer` vérifie que les tests du développeur existent et testent un comportement.

## Interdits (tous rôles)
- Désactiver, ignorer ou assouplir un test pour passer au vert : `skip`, `.only`, `xit`, `[Fact(Skip = ...)]`, assertion supprimée ou élargie, seuil de couverture baissé, valeur de référence recopiée depuis la sortie du code testé.
- Test instable : c'est un défaut à corriger (horloge, ordre, attente réseau), pas une relance jusqu'au vert.

## Processus d'exécution
Lancer les commandes de test de `CLAUDE.md`, corriger les échecs, puis rapporter : tests ajoutés, résultat réel (sortie : nombre passés/échoués), zones non couvertes.
