# ui-kit

> Fichier lu à chaque session. Gardez-le court (< 100 lignes).

## Contexte
Bibliothèque de composants Angular et de design tokens, **générique**, réutilisée par tous les projets front (premier consommateur : le simulateur immobilier). Aucune logique ni aucun vocabulaire métier.

## Stack
- Langage / runtime : TypeScript (strict), Node.js ≥ 24.15 (Angular CLI 22 refuse les versions antérieures)
- Framework(s) : Angular 22 (standalone, signaux, zoneless), Angular CDK 22 ; Style Dictionary 5 (tokens DTCG) ; Apache ECharts 6 (point d'entrée `charts`, dépendance optionnelle) ; AG Grid Community 36 (`data-grid`, phase 5, optionnelle)
- Outillage : Storybook 10, Vitest, Playwright, ng-packagr, workspaces npm ; prévus, pas encore en place : tests visuels, ESLint, stylelint
- Base de données : aucune
- Déploiement : paquets npm `@lionelcointot/ui-tokens` et `@lionelcointot/ui-angular` sur GitHub Packages (release-please) ; Storybook publié en artefact de CI (cible : ni CI ni publication en place à ce jour)

## Commandes
- Tout installer / lancer Storybook (Node installé au besoin) : `installer.command` / `lancer.command` (macOS), `.cmd` (Windows), `bash installer.command` (Linux) ; équivalent : `bash scripts/dev/bootstrap.sh install|start`. Configuration : `dev.config.json`
- Installer : `npm ci`
- Lancer en dev : `npm run storybook`
- Tests : `npx ng test ui-angular --watch=false` (Vitest) ; pas encore : `test:visual` (Playwright), `lint` (ESLint, stylelint)
- Storybook statique : `npm run build-storybook` (sortie `dist/storybook`)
- Build : `npm run build` (tokens puis bibliothèque)
- Tokens : `npm run tokens:build` · `npx lc-tokens check --theme <fichier.tokens.json>` · tests `npm test --workspace @lionelcointot/ui-tokens`
- Générer le client d'API depuis l'OpenAPI : N/A (bibliothèque sans back)

## Documentation
- Specs : `docs/specs/2026-11-socle-tokens-themes.md`, `2026-11-catalogue-composants.md`, `2026-11-graphiques.md`, `2026-11-theme-builder.md`, `2026-11-geographie-curseur-combobox.md`, `2026-11-composants-dashboard.md` (chacune se termine par ses écarts constatés à l'implémentation)
- ADR : `docs/adr/0001` (tokens) à `0007` (données géographiques françaises : `geo`, aucune donnée embarquée, vie privée et CSP dans `packages/angular/geo/README.md`)
- Architecture transverse du produit : https://github.com/LionelCointot/finance-hub/blob/main/docs/architecture.md
- Direction visuelle : `PRODUCT.md` et `DESIGN.md` (pas encore créés : `/impeccable init` puis `/impeccable document`, tâche T2)

## Workflow (spec d'abord, code ensuite : skill `delivery-workflow`)
La session principale orchestre et vérifie ; elle délègue aux agents et choisit le modèle selon la tâche (sonnet par défaut ; haiku : recherche, tâches mécaniques ; opus seulement sur accord de l'utilisateur).
1. Cadrage, puis spec dans `docs/specs/` (skill `spec-writer`, critères `CA-n`), validée par l'utilisateur avant de coder ; choix d'architecture dans `docs/adr/` (skill `adr`).
2. Design : `ui-ux-designer` conçoit avec `impeccable` (`shape` avant, `critique` et `audit` après) ou déclare « pas d'impact UI ».
3. Implémentation : `senior-developer` (code de production, aucun test), une tâche de la spec par appel, une branche par tâche (`feat/...`, `fix/...`, `chore/...`).
4. Tests et QA : `qa-engineer` écrit les tests, puis rend GO / NO-GO avec preuves (build, tests, lint et a11y Storybook, `CA-n`, `review-checklist`) ; NO-GO = retour au développeur.
5. Revue `/code-review`, puis PR décrite avec `pr-description`.
6. Correctif trivial : workflow allégé (développeur + QA, le designer déclare « pas d'impact UI »).

## Agents (`.claude/agents/`)
- Livraison : `senior-developer` (sonnet), `ui-ux-designer` (sonnet, `impeccable`), `qa-engineer` (sonnet).
- Design : `impeccable-*` (lancés par la session principale à la demande du playbook impeccable).

## Conventions
- Commits : Conventional Commits. SemVer : les tokens (noms et rôles), sélecteurs, entrées et sorties sont le **contrat public** (renommer = version majeure, alias déprécié pendant au moins une mineure).
- Code et identifiants en anglais ; libellés via `LC_LABELS` (français par défaut, anglais fourni), jamais en dur.
- Préfixe `lc` : élément `lc-…`, attribut `lc…`, variable CSS `--lc-…`, type `Lc…`, classe `LcXxxComponent` / `LcXxxDirective` / `LcXxxService`.
- Sélecteur d'attribut sur les éléments natifs (`button[lcButton]`, `input[lcInput]`…), élément hôte pour les composites.
- Tokens à 3 couches : `--lc-ref-*` (thèmes uniquement), `--lc-sys-*` (rôles), `--lc-<composant>-*` (avec repli sur `sys`).
- API commune : `themeColor`, `fillMode`, `size`, `rounded`, `disabled` ; `input()`, `output()`, `model()` ; OnPush ; `host: {}`.
- Contrôles de formulaire : `FormValueControl<T>` (Signal Forms) ; `ControlValueAccessor` seulement à la demande.
- Comportement : CDK uniquement (Angular Aria non retenu). Styles `.css` (pas de SCSS) ; les directives sur éléments natifs et les panneaux CDK sont stylés par la feuille globale `styles/ui-angular.css`.
- Structure : `packages/tokens` ; `packages/angular/src` (principal : cœur, bouton, icône, spinner, squelette) et `packages/angular/<forms|feedback|overlay|layout|navigation|data|charts|geo|theme-builder>/src/<composant>/` (`.component.ts`, `.component.css`, `.spec.ts`, `public-api.ts` par point d'entrée) ; config Storybook dans `.storybook/`, stories `*.stories.ts` à côté des composants.
- Gestion d'erreurs : avertissements console en développement seulement (`isDevMode()`), jamais d'exception visible pour un usage incorrect non bloquant.

## À ne pas faire
- Ne pas écrire de couleur, taille ou durée en dur dans un composant ; ne pas utiliser `--lc-ref-*` hors des thèmes.
- Ne pas utiliser `innerHTML` (exception : SVG d'icônes enregistrés par le code ; info-bulles de graphiques échappées).
- Ne pas importer un point d'entrée secondaire depuis un autre (exceptions : `data` → `feedback` ; `theme-builder` → `forms`, `navigation`, `feedback`, `data`, `layout`, `charts`, car il compose l'aperçu et l'éditeur de thème avec ces composants, et aucun autre point d'entrée ne l'importe ; `geo` → `forms`, car il compose `lc-combobox`, ADR 0007, et aucun autre point d'entrée n'importe `geo`).
- Aucune liste de régions, départements ou communes dans le code : `geo` lit les API officielles (tests : `fetch` simulé ou source factice, jamais le réseau).
- Ne pas ajouter de vocabulaire métier (finance, prêt…) ni de composant sans consommateur identifié.
- Ne pas utiliser de fonctionnalité CSS hors Baseline 2024 (pas d'*anchor positioning*).
- Limites connues : le contrôle de palette de `lc-tokens` ne vérifie que le contraste (pas la distinction pour daltoniens) ; `charts` pèse ~563 Kio minifiés (objectif 350 non tenu, ECharts 6) ; pas de `lc-dropdown-list` ni de phase 5 (hors `lc-combobox`).
- Ne pas commiter de secrets ; ne pas ajouter de dépendance sans la justifier ; ne pas modifier du code hors périmètre.

## Skills (`.claude/skills/`)
- Processus : `delivery-workflow`, `project-init`, `spec-writer`, `adr`, `pr-description`
- Conception : `web-architecture`, `api-design`, `frontend-guidelines`
- Code : `clean-code`, `angular-best-practices` (`dotnet-best-practices` retiré : pas de .NET ici)
- Qualité : `review-checklist`, `security-checklist`, `test-strategy`
- Outils : `graphify` (graphe du code), `impeccable` (design front : `/impeccable init`, `shape`, `critique`, `audit`, `polish`)
- Global utile : `dataviz` (règles et validation de palette des graphiques)

## Outils
- **graphify** : graphe de connaissances du code dans `graphify-out/` (non versionné), reconstruit automatiquement après chaque commit par les hooks git. Installation sur un nouveau poste : `./scripts/setup.sh`.
- **impeccable** : son hook vérifie chaque fichier UI modifié. Contexte design dans `PRODUCT.md` et `DESIGN.md` (pas encore créés ici).
- Mise à jour des deux outils : `./scripts/update-tools.sh`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
