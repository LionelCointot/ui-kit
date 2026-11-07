---
name: dotnet-best-practices
description: Bonnes pratiques génériques .NET / C# / ASP.NET Core : découpage en couches, style C#, injection de dépendances, async, gestion des erreurs, validation, logs, OpenAPI, tests. À utiliser dès qu'on crée, modifie ou relit du code C# (endpoint, service, classe, record, Program.cs, .csproj, test), même si l'utilisateur ne dit pas ".NET".
---

# .NET / C# : bonnes pratiques

Appliquer aussi `clean-code`. Exemples courts : [examples.md](examples.md).
Les choix propres à un projet (librairie de validation, stockage, découpage exact) se décident par ADR et se notent dans `CLAUDE.md`.

## Architecture
- Séparer **métier** (règles, calculs, contrats) / **infrastructure** (base, fichiers, services externes) / **API** (HTTP). Les dépendances vont vers le métier, jamais l'inverse.
- Le métier ne référence ni ASP.NET Core, ni la base, ni le JSON : il se teste avec de simples tests unitaires.
- Un endpoint ne contient pas de logique métier : il traduit HTTP ↔ appel de service.
- Organiser par feature (tout ce qui concerne `Orders` ensemble) plutôt que par type technique.

## Style C#
- `Nullable` activé, avertissements traités en erreurs, `dotnet format` avant de commiter.
- Namespaces *file-scoped*, un type public par fichier, classes `sealed` par défaut.
- `record` pour les DTO et valeurs immuables ; constructeurs primaires pour l'injection.
- Nommage : `PascalCase` (types, méthodes, propriétés), `camelCase` (paramètres, variables), `_camelCase` (champs privés), suffixe `Async`, interfaces en `I...`.
- Exposer des `IReadOnlyList<T>` plutôt que des `List<T>` modifiables.
- Montants en `decimal` (jamais `double`) ; dates calendaires en `DateOnly` ; instants en `DateTimeOffset` ; heure courante via `TimeProvider` injecté.

## Injection de dépendances
- Injection par constructeur ; pas de `IServiceProvider.GetService` dans le code métier.
- Durées de vie : `Singleton` pour le sans-état, `Scoped` pour ce qui dépend de la requête (ex. `DbContext`) ; jamais un singleton qui dépend d'un scoped.
- Configuration typée : `IOptions<T>` validées au démarrage (`ValidateOnStart()`).

## API HTTP
- Minimal APIs (ou contrôleurs si le projet les a choisis) regroupées par feature avec `MapGroup`.
- Retourner des `TypedResults` avec un type de retour explicite : le document OpenAPI est alors exact.
- **Le document OpenAPI est généré automatiquement** à partir des endpoints (`AddOpenApi()` / `MapOpenApi()`) : on ne l'écrit jamais à la main. Le front génère son client depuis ce document (voir `api-design`).
- Valider chaque entrée à la frontière (librairie au choix du projet) et renvoyer 400 avec le détail par champ.

## Erreurs
- Format standard **ProblemDetails** (`AddProblemDetails()`, `UseExceptionHandler()`).
- Un seul endroit traduit les exceptions en réponses HTTP (`IExceptionHandler`) ; les erreurs métier attendues ont un type dédié.
- Jamais de `catch` vide ; jamais de détail technique renvoyé au client pour une erreur 500.

## Async et logs
- Async de bout en bout : pas de `.Result`, `.Wait()`, ni `async void`. Passer le `CancellationToken` jusqu'aux I/O.
- `ILogger<T>` avec messages structurés (`"Commande {OrderId} créée"`), pas d'interpolation de chaîne, pas de données personnelles.

## Tests
- xUnit, nommage `Methode_Scenario_ResultatAttendu`, structure Arrange / Act / Assert.
- Métier : tests unitaires purs, faux simples écrits à la main plutôt que des mocks partout.
- API : `WebApplicationFactory<Program>` pour vérifier routes, codes HTTP et erreurs.

## Checklist
- [ ] Le métier n'a aucune dépendance web ou stockage ; les endpoints ne contiennent pas de logique métier.
- [ ] `TypedResults`, `CancellationToken` et validation sur chaque endpoint.
- [ ] Erreurs en ProblemDetails, aucun `catch` vide.
- [ ] Tests ajoutés ; `dotnet build` sans avertissement, `dotnet test` vert.
