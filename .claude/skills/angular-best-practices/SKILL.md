---
name: angular-best-practices
description: Conventions Angular du projet (Angular 21+) : architecture en couches (composants, store à signaux, couche data-access qui représente le backend), signaux, services, injection, RxJS, formulaires, routing, tests. À utiliser dès qu'on crée, modifie ou relit du code Angular (composant, service, store, intercepteur, guard, route, formulaire, template, fichier .ts/.html d'une app Angular), même si l'utilisateur ne dit pas "Angular".
---

# Angular : bonnes pratiques

Appliquer aussi `clean-code`. Pour le rendu visuel (typo, couleurs, layout), utiliser `impeccable`.
Exemples complets à imiter : [examples/products/](examples/products/).

## 0. Avant de coder
- Vérifier la version (`ng version` ou `package.json`). Ces règles visent Angular ≥ 21 ; une API marquée *experimental* dans la version du projet ne s'utilise pas sans ADR.
- Si le serveur MCP Angular CLI est disponible, appeler `get_best_practices` et `search_documentation` plutôt que se fier à sa mémoire (installation : `claude mcp add angular-cli --scope project -- npx -y @angular/cli mcp`).
- Générer avec la CLI (`ng generate component|service|guard ...`) pour respecter la config du workspace.

## 1. Architecture en couches (règle d'or)

```
Composant de présentation  (ui/)          input() / output() seulement, aucun service injecté
          ▲ signaux                ▼ événements
Composant page / conteneur (pages/)       injecte le store de la feature, aucune logique métier
          ▲ signaux (lecture)      ▼ méthodes d'action
Store de feature           (state/)       état en signaux, computed, appels à la couche d'accès, mapping
          ▲ Observable
Client d'API généré        (core/api/)    SEUL à connaître HttpClient, URL, DTO
          ▲ HTTP / JSON
Backend (document OpenAPI généré automatiquement)
```

1. **Un composant n'injecte jamais `HttpClient` ni un client d'API.** Il parle à un store (ou à une façade).
2. **La couche d'accès est générée** depuis le document OpenAPI (Swagger) du back, avec NSwag ou openapi-generator (`npm run api:generate`), dans `core/api/` : une classe client par groupe d'endpoints, les types DTO. **Jamais modifiée à la main** : on régénère après chaque changement d'API, et le front ne compile plus s'il diverge du back.
3. Un service d'accès écrit à la main n'existe que pour une API externe sans OpenAPI (dans `data-access/`) : une méthode par endpoint, sans état ni logique d'affichage.
4. **Le store** détient l'état de la feature, appelle la couche d'accès, transforme DTO → modèle de vue (fonctions de mapping pures) et expose des signaux en lecture seule.
5. Les DTO générés peuvent circuler en lecture jusqu'aux composants s'ils conviennent tels quels ; dès qu'il faut transformer (dates, libellés, calculs d'affichage), un modèle de vue + mapper.

## 2. Structure des dossiers

```
src/app/
  core/                    # singletons transverses
    api/                   # client généré depuis l'OpenAPI du back (NE PAS ÉDITER)
    http/                  # intercepteurs fonctionnels, token API_BASE_URL
    guards/
  shell/                   # layout, navigation, thème
  shared/
    ui/                    # composants de présentation réutilisables, sans dépendance métier
    pipes/  directives/  utils/
  features/
    products/              # une feature = un domaine (souvent = un module backend)
      data-access/         # mappers DTO -> modèles de vue (+ service manuel seulement pour une API externe)
      state/               # products.store.ts
      ui/                  # composants de présentation de la feature
      pages/               # products-page.component.ts (routé)
      products.routes.ts
```
- Une feature n'importe jamais le code interne d'une autre feature ; ce qui est partagé monte dans `shared/` ou `core/`.
- Nommage : fichiers en kebab-case, suffixe de rôle explicite : `*.component.ts`, `*.service.ts`, `*.store.ts`, `*.mapper.ts`, `*.routes.ts`, classes `ProductsPageComponent`, `ProductsStore` (le client généré s'appelle par exemple `ProductsClient`). Si le projet a choisi la convention sans suffixe du style guide Angular récent, la suivre partout et la noter dans `CLAUDE.md`.

## 3. Signaux et état
- État local et état de feature en **signaux** : `signal()`, `computed()`, `linkedSignal()` (état dérivé mais modifiable).
- Dans un store : signaux **privés** en écriture, exposés en lecture via `.asReadonly()` ou `computed()`. Les mutations passent par des méthodes nommées (`setQuery()`, `addItem()`), jamais par `.set()` depuis un composant.
- Données serveur en lecture : `rxResource()` (client à base d'Observables, cas d'un client généré) ou `httpResource()`. Ils fournissent `value()`, `isLoading()`, `error()`, `hasValue()`, `reload()` : ne pas recoder ces états à la main. Tester `hasValue()` avant de lire `value()`.
- `computed()` pour tout ce qui se dérive ; ne jamais copier un état dérivé dans un autre signal.
- `effect()` réservé à la synchronisation avec l'extérieur (localStorage, librairie non Angular, log). Jamais pour propager un état vers un autre signal (utiliser `computed`/`linkedSignal`).
- Mises à jour immuables : `this._items.update(items => [...items, item])`, pas de `push` sur la valeur d'un signal.

## 4. Composants
- Standalone (défaut), `changeDetection: ChangeDetectionStrategy.OnPush` toujours déclaré explicitement, application zoneless.
- Entrées/sorties en fonctions : `input()`, `input.required()`, `output()`, `model()` pour le two-way binding. Requêtes de vue : `viewChild()`, `viewChildren()`.
- `inject()` plutôt que l'injection par constructeur. Membres utilisés seulement par le template en `protected`, tout en `readonly` quand c'est possible.
- Liaisons d'hôte dans `host: {}` plutôt que `@HostBinding`/`@HostListener`.
- Templates : control flow `@if`, `@for` (toujours `track` sur un identifiant stable), `@switch`, `@let` ; `@defer` pour les blocs lourds (graphiques). Aucune logique dans le template : pas d'appel de méthode qui calcule (sauf lecture de signaux), utiliser `computed()` ou un pipe pur.
- Toujours les 4 états à l'écran : chargement, erreur, vide, succès.
- Un composant de présentation ne connaît ni le routeur, ni le store, ni l'API : il reçoit des données et émet des événements. Il est réutilisable et testable seul.
- `[class.x]`/`[style.x]` plutôt que `ngClass`/`ngStyle`. Images avec `NgOptimizedImage`.

## 5. RxJS : seulement là où il apporte quelque chose
- RxJS pour les **flux d'événements** : debounce de recherche, annulation (`switchMap`), websockets, polling. Signaux pour l'**état**.
- Passerelles : `toSignal()`, `toObservable()`, `rxResource()`.
- Pas de `subscribe()` dans un composant quand `toSignal`/`rxResource` suffit. Si un abonnement manuel est inévitable : `takeUntilDestroyed()`.
- Jamais de `subscribe` imbriqués (utiliser `switchMap`/`concatMap`/`exhaustMap` selon la sémantique voulue).
- Requête ponctuelle déclenchée par une action (création, suppression) : `await firstValueFrom(api.create(...))` dans une méthode du store.

## 6. HTTP et erreurs
- `provideHttpClient(withFetch(), withInterceptors([...]))`, intercepteurs **fonctionnels**.
- URL de base via l'`InjectionToken` `API_BASE_URL` (fourni par le client généré) : jamais d'URL en dur.
- Les erreurs du back arrivent au format `ProblemDetails` (RFC 9457) : un intercepteur ou le store les traduit en message utilisateur ; les erreurs de validation (`errors: { champ: [...] }`) sont rattachées aux champs du formulaire.
- Pas de `try/catch` silencieux : une erreur non gérée par le store remonte au `ErrorHandler` global.

## 7. Formulaires
- Angular ≥ 22 : **Signal Forms** pour les nouveaux formulaires. Versions antérieures ou formulaire existant : formulaires réactifs **typés** (`FormBuilder.nonNullable`).
- Validation côté client pour le confort, côté serveur pour la sécurité (la vérité est au back). Messages en français, liés au champ (`aria-describedby`).
- Le formulaire vit dans le composant (ou le store si l'état doit survivre à la navigation) ; la soumission appelle une méthode du store.

## 8. Routing
- Routes paresseuses : `loadComponent` / `loadChildren` par feature ; `withComponentInputBinding()` pour recevoir les paramètres de route en `input()`.
- Guards et resolvers **fonctionnels** (`CanActivateFn`).
- Store de page fourni dans `providers` de la route ou du composant page (un état par visite) ; `providedIn: 'root'` seulement pour un état réellement global.

## 9. Tests
- Runner : Vitest (défaut depuis Angular 21) ou celui configuré dans le projet.
- Mappers et fonctions métier : tests unitaires purs, sans TestBed.
- Store : TestBed avec le client remplacé par un faux (`{ provide: ProductsClient, useValue: fake }`) ou `provideHttpClientTesting()` + `HttpTestingController`.
- Composants de présentation : `fixture.componentRef.setInput(...)`, puis assertions sur le DOM rendu (texte, rôles ARIA), pas sur l'implémentation.
- E2E (Playwright) pour les parcours critiques seulement.

## 10. Anti-patterns à refuser

| Anti-pattern | À la place |
|---|---|
| `HttpClient` injecté dans un composant | Store → service d'accès / client généré |
| Service HTTP écrit à la main pour notre propre back | Client généré depuis l'OpenAPI |
| Client généré modifié à la main | Régénérer depuis l'OpenAPI |
| `BehaviorSubject` + `subscribe` pour l'état | `signal` / `computed` dans un store |
| `effect()` qui écrit dans un autre signal | `computed()` ou `linkedSignal()` |
| Méthode de calcul appelée dans le template | `computed()` ou pipe pur |
| `@for` sans `track` stable | `track item.id` |
| `NgModule`, `@Input()`/`@Output()` décorateurs, `*ngIf`/`*ngFor` dans du nouveau code | Standalone, `input()`/`output()`, `@if`/`@for` |
| `any`, `!` pour faire taire le compilateur | Types précis, `unknown` puis affinage |
| URL d'API en dur | `API_BASE_URL` |
| Logique métier dans le front | Endpoint backend ; le front affiche |

## Checklist
- [ ] Aucun composant n'injecte `HttpClient` ni un client d'API.
- [ ] Composants `OnPush`, `input()`/`output()`, control flow moderne, 4 états gérés.
- [ ] État en signaux privés exposés en lecture seule ; dérivés en `computed`.
- [ ] Pas de `subscribe` sans `takeUntilDestroyed`, pas de `subscribe` imbriqué.
- [ ] Client et DTO générés depuis l'OpenAPI, jamais modifiés ; mapping isolé et testé.
- [ ] Tests du store et des mappers ajoutés ; lint et tests passent.
