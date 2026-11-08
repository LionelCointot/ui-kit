# ADR-0004 : Tableau léger sur le CDK, grille avancée sur AG Grid Community

- **Statut** : Acceptée
- **Date** : 2026-11-08

## Contexte

Les projets ont besoin de deux niveaux de tableaux.
- **Courant** : tableau d'amortissement de 420 lignes groupées par année, liste de scénarios, détail de coût. Il faut un tri simple, un en-tête collant, des sous-totaux, une ligne de total, des nombres alignés à droite et des groupes repliables.
- **Avancé** (plus rare, plus tard) : filtres par colonne, redimensionnement et réordonnancement des colonnes, virtualisation de dizaines de milliers de lignes, export.

Une grille de données complète est le composant le plus coûteux d'une bibliothèque, comme le rappelle la discussion initiale sur Kendo.

## Options considérées

1. **Écrire une grille complète** : contrôle total, mais un coût disproportionné et un risque élevé sur l'accessibilité et les performances.
2. **Tableau PrimeNG ou grille Kendo** : complets, mais ils imposent leur style et leur écosystème, et Kendo est sous licence commerciale.
3. **Deux composants** :
   - `lc-table`, construit sur `@angular/cdk/table` : léger, accessible, entièrement stylé par tokens, il couvre le besoin courant ;
   - `lc-data-grid`, qui habille **AG Grid Community** (MIT, version 36) par son API de thème pilotée par variables CSS, couvre le besoin avancé.

## Décision

**Option 3.**
- `lc-table` est livré en phase 3 et couvre l'usage courant.
- `lc-data-grid` est livré en phase 5, **seulement quand un projet en exprime le besoin**, dans un point d'entrée séparé (`@lionelcointot/ui-angular/data-grid`).
- `ag-grid-community` et `ag-grid-angular` y sont des dépendances pair optionnelles. Le thème AG Grid est dérivé des tokens `--lc-sys-*` et `--lc-table-*`.
- Les fonctionnalités de l'édition commerciale d'AG Grid sont exclues.

## Conséquences

- **Positives** : le besoin courant est couvert vite, sans dépendance lourde ; le besoin avancé l'est sans réinventer une grille ; l'apparence reste cohérente grâce aux tokens.
- **Négatives / dette** : deux API de tableau à documenter, avec une règle de choix simple. `lc-table` sert jusqu'à 2 000 lignes affichées, sans filtre par colonne ; au-delà, `lc-data-grid`.
- **À surveiller** : la limite de licence d'AG Grid Community, à revérifier à chaque version majeure.
