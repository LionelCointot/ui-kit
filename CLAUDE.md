# ui-kit

> Fichier lu à chaque session. Gardez-le court (< 100 lignes).

## Contexte
Bibliothèque de composants Angular et de design tokens, **générique**, réutilisée par tous les projets front (premier consommateur : le simulateur immobilier). Aucune logique ni aucun vocabulaire métier.

## Stack
- Langage / runtime : TypeScript (strict), Node.js ≥ 24.15 (Angular CLI 22 refuse les versions antérieures)
- Framework(s) : Angular 22 (standalone, signaux, zoneless), Angular CDK 22 ; Style Dictionary 5 (tokens DTCG) ; Apache ECharts 6 (point d'entrée `charts`, dépendance optionnelle) ; AG Grid Community 36 (`data-grid`, phase 5, optionnelle)
- Outillage : Storybook 10, Vitest, Playwright, ng-packagr, workspaces npm ; prévus, pas encore en place : tests visuels, ESLint, stylelint
- Base de données : aucune
- Déploiement : paquets npm `@lionelcointot/ui-tokens` et `@lionelcointot/ui-angular` sur GitHub Packages (release-please) ; Storybook publié sur GitHub Pages (`.github/workflows/storybook-pages.yml`)

## Commandes
- Tout installer / lancer Storybook (Node installé au besoin) : `installer.command` / `lancer.command` (macOS), `.cmd` (Windows), `bash installer.command` (Linux) ; équivalent : `bash scripts/dev/bootstrap.sh install|start`. Configuration : `dev.config.json`
- Installer : `npm ci`
- Lancer en dev : `npm run storybook`
- Tests : `npx ng test ui-angular --watch=false` (Vitest) ; pas encore : `test:visual` (Playwright), `lint` (ESLint, stylelint)
- Storybook statique : `npm run build-storybook` (sortie `dist/storybook`) ; vitrine publique sans QA : `npm run build-storybook:public` (publiée sur GitHub Pages par la CI) ; contrôles des Playground : `node tools/qa/storybook-controls.mjs`. Règles des stories : `docs/storybook/CONVENTIONS.md`
- Build : `npm run build` (tokens puis bibliothèque)
- Catalogue des composants (livré dans le paquet) : `npm run catalogue:build` régénère `packages/angular/CATALOGUE.md` · `npm run catalogue:check` échoue s'il est périmé · tests `npm run catalogue:test`
- Tokens : `npm run tokens:build` · `npx lc-tokens check --theme <fichier.tokens.json>` · tests `npm test --workspace @lionelcointot/ui-tokens`
- Générer le client d'API depuis l'OpenAPI : N/A (bibliothèque sans back)

## Documentation
- Specs : `docs/specs/2026-11-socle-tokens-themes.md`, `2026-11-catalogue-composants.md`, `2026-11-graphiques.md`, `2026-11-theme-builder.md`, `2026-11-geographie-curseur-combobox.md`, `2026-11-composants-dashboard.md`, `2026-11-selecteur-de-date.md`, `2026-11-vitrine-storybook.md` (chacune se termine par ses écarts constatés à l'implémentation)
- ADR : `docs/adr/0001` (tokens) à `0007` (données géographiques françaises : `geo`, aucune donnée embarquée, vie privée et CSP dans `packages/angular/geo/README.md`) ; `0008` (champ de date : calendrier du kit sur pointeur fin, sélecteur du système sinon, jeton `LC_DATE_PICKER`) ; `0009` (cible navigateurs Baseline 2024, CDK par défaut, primitives natives admises sous conditions)
- Architecture transverse du produit : https://github.com/LionelCointot/finance-hub/blob/main/docs/architecture.md
- Direction visuelle : `DESIGN.md` (système visuel de référence des projets consommateurs) ; `PRODUCT.md` pas encore créé (`/impeccable init`)

## Workflow (spec d'abord, code ensuite : skill `delivery-workflow`)
La session principale cadre avec l'utilisateur, écrit la spec, orchestre et vérifie ; elle délègue aux agents et choisit le modèle selon la tâche (sonnet par défaut ; haiku : recherche, triage ; opus seulement sur accord de l'utilisateur). Le travail mécanique passe par un script relu, pas par un agent.
Mode **`ponytail`** (skill recopié dans `.claude/skills/ponytail/`) actif par défaut : niveau full pour la session principale, `senior-developer`, `qa-engineer` et `ui-ux-designer` ; niveau ultra pour `cadreur` et `architect` ; contrôlé par `code-reviewer` ; jamais pour `security-reviewer` ni `novice-user`. En cas de conflit, ce fichier et `delivery-workflow` priment sur les skills tiers.
0. Tri : taille (correctif, tâche, fonctionnalité) et angles ouverts (architecture, écran, sécurité et données). Les angles décident des rôles appelés.
1. Cadrage : questions une à la fois ; fiche de cadrage en tête de la spec, avec la demande mot pour mot ; `cadreur` relève les ambiguïtés.
2. Conception : spec dans `docs/specs/` (skill `spec-writer`, critères `CA-n`), ADR dans `docs/adr/` (skill `adr`), relue en parallèle par `architect`, `security-reviewer`, `qa-engineer` (plan de test) et `cadreur` selon les angles. Écran : 2 ou 3 directions maquettées, **l'utilisateur choisit**, brief de `ui-ux-designer`, test `novice-user`. **Spec validée par l'utilisateur avant de coder.**
3. Réalisation : `qa-engineer` écrit les tests d'acceptation (`CA-n`) à partir de la spec ; `senior-developer` écrit le code et ses tests unitaires, une tâche par appel, une branche par tâche (`feat/...`, `fix/...`, `chore/...`).
4. Vérification, en parallèle : `qa-engineer` (GO / NO-GO avec preuves), `code-reviewer`, et les rôles des angles ouverts ; un bloquant renvoie au développeur.
5. Livraison : `cadreur` compare le résultat à la spec ; critères cochés et écarts écrits dans la spec ; pour une fonctionnalité, `code-reviewer` audite ce qu'elle a rendu inutile (skill `simplification-audit` : une preuve par recommandation, le plus petit changement qui garde le fonctionnement) ; PR décrite avec `pr-description`.
Correctif : `senior-developer` (test qui échoue, puis correctif), puis `code-reviewer`. Barre de qualité : `CONSTRAINTS.md` et `scripts/check.sh` quand ils existent, sinon les commandes ci-dessus.

## Agents (`.claude/agents/`)
- Besoin et conception : `cadreur` (gardien du besoin), `architect` (relecteur d'architecture), `security-reviewer` (sécurité et données personnelles).
- Écrans : `ui-ux-designer` (`impeccable`), `novice-user` (regard d'un débutant sur les écrans).
- Réalisation et vérification : `senior-developer` (code et tests unitaires), `qa-engineer` (tests d'acceptation, verdict), `code-reviewer` (qualité du code).
- Design : `impeccable-*` (lancés par la session principale à la demande du playbook impeccable).
- Tous en sonnet, identiques dans tous les dépôts : les modifier dans `project-template`, puis `scripts/sync-skills.sh`.

## Conventions
- Commits : Conventional Commits. Les tokens (noms et rôles), sélecteurs, entrées et sorties sont le **contrat public**. Phase de développement (décision du 2026-11-21) : aucune rétrocompatibilité, un changement de contrat casse franchement, sans alias déprécié, et les consommateurs (copro-ticket, finance-*) sont corrigés dans la même passe ; la règle SemVer (renommer = version majeure, alias déprécié pendant au moins une mineure) revient à la première mise en production d'un consommateur.
- Code et identifiants en anglais ; libellés via `LC_LABELS` (français par défaut, anglais fourni), jamais en dur.
- Préfixe `lc` : élément `lc-…`, attribut `lc…`, variable CSS `--lc-…`, type `Lc…`, classe `LcXxxComponent` / `LcXxxDirective` / `LcXxxService`.
- Sélecteur d'attribut sur les éléments natifs (`button[lcButton]`, `input[lcInput]`…), élément hôte pour les composites.
- Tokens à 3 couches : `--lc-ref-*` (thèmes uniquement), `--lc-sys-*` (rôles), `--lc-<composant>-*` (avec repli sur `sys`).
- API commune : `themeColor`, `fillMode`, `size`, `rounded`, `disabled` ; `input()`, `output()`, `model()` ; OnPush ; `host: {}`.
- Contrôles de formulaire : `FormValueControl<T>` (Signal Forms) ; `ControlValueAccessor` seulement à la demande.
- Comportement : CDK par défaut (Angular Aria non retenu) ; une primitive native (`dialog`) est admise pour un nouveau composant si elle est dans la cible navigateurs, avec test en navigateur réel (ADR 0009). Styles `.css` (pas de SCSS) ; les directives sur éléments natifs et les panneaux CDK sont stylés par la feuille globale `styles/ui-angular.css`.
- Structure : `packages/tokens` ; `packages/angular/src` (principal : cœur, bouton, icône, spinner, squelette) et `packages/angular/<forms|feedback|overlay|layout|navigation|data|charts|geo|theme-builder>/src/<composant>/` (`.component.ts`, `.component.css`, `.spec.ts`, `public-api.ts` par point d'entrée) ; config Storybook dans `.storybook/`, stories `*.stories.ts` à côté des composants.
- Gestion d'erreurs : avertissements console en développement seulement (`isDevMode()`), jamais d'exception visible pour un usage incorrect non bloquant.

## À ne pas faire
- Ne pas écrire de couleur, taille ou durée en dur dans un composant ; ne pas utiliser `--lc-ref-*` hors des thèmes.
- Ne pas utiliser `innerHTML` (exception : SVG d'icônes enregistrés par le code ; info-bulles de graphiques échappées).
- Ne pas importer un point d'entrée secondaire depuis un autre (exceptions : `data` → `feedback`, et `data` → `overlay` pour l'info-bulle des entonnoirs de `lc-data-table` ; `theme-builder` → `forms`, `navigation`, `feedback`, `data`, `layout`, `charts`, car il compose l'aperçu et l'éditeur de thème avec ces composants, et aucun autre point d'entrée ne l'importe ; `geo` → `forms`, car il compose `lc-combobox`, ADR 0007, et aucun autre point d'entrée n'importe `geo`).
- Aucune liste de régions, départements ou communes dans le code : `geo` lit les API officielles (tests : `fetch` simulé ou source factice, jamais le réseau).
- Ne pas ajouter de vocabulaire métier (finance, prêt…) ni de composant sans consommateur identifié.
- Cible navigateurs : Baseline 2024, millésime fixe revu chaque année (ADR 0009) ; rien de postérieur sans repli écrit et testé (pas d'*anchor positioning*, pas de `popover` déclaratif) ; les statuts Baseline sont dans les fiches de `modern-web-guidance`.
- Limites connues : le contrôle de palette de `lc-tokens` ne vérifie que le contraste (pas la distinction pour daltoniens) ; `charts` pèse ~563 Kio minifiés (objectif 350 non tenu, ECharts 6) ; pas de `lc-dropdown-list` ni de phase 5 (hors `lc-combobox` et le calendrier de `lc-date-input` / `lc-date-range-input`) ; saisie de date par zones non essayée au lecteur d'écran, collage prouvé sous Chromium seulement.
- Ne pas commiter de secrets ; ne pas ajouter de dépendance sans la justifier ; ne pas modifier du code hors périmètre.

## Skills (`.claude/skills/`)
- Processus : `delivery-workflow`, `project-init`, `spec-writer`, `adr`, `pr-description`
- Conception : `web-architecture`, `api-design`, `frontend-guidelines` ; `modern-web-guidance` (fiches du web moderne de Chrome, Edge, Firefox et MDN, copie locale figée lue sans `npx`, à consulter avant le HTML, le CSS et le JavaScript côté navigateur ; mise à jour par `scripts/update-tools.sh`)
- Code : `clean-code` ; conventions du projet : `angular-best-practices` (`dotnet-best-practices` retiré : pas de .NET ici) ; skills officiels recopiés tels quels : `angular-developer` (équipe Angular)
- Qualité : `review-checklist`, `security-checklist`, `test-strategy`, `simplification-audit` (audit de ce qu'on peut retirer ou simplifier, sur demande ou à la livraison)
- Méthode (superpowers, recopiés tels quels) : `systematic-debugging`, `verification-before-completion`
- Outils : `graphify` (graphe du code), `impeccable` (design front : `/impeccable init`, `shape`, `critique`, `audit`, `polish`) ; `ponytail` (mode développeur senior économe, actif par défaut)
- Global utile : `dataviz` (règles et validation de palette des graphiques)

## Outils
- **graphify** : graphe de connaissances du code dans `graphify-out/` (non versionné), reconstruit automatiquement après chaque commit par les hooks git. Installation sur un nouveau poste : `./scripts/setup.sh`.
- **graphify est obligatoire** (décision de l'utilisateur, 2026-11-21, pour réduire la consommation de tokens) : `graphify query` (ou `path`, `explain`) avant toute recherche ou lecture de code, pour la session principale et chaque agent ; chaque rapport d'agent cite ses requêtes ; `graphify update .` une fois tout au vert.
- **impeccable** : son hook vérifie chaque fichier UI modifié. Contexte design dans `DESIGN.md` ; `PRODUCT.md` n'existe pas encore ici.
- Mise à jour des deux outils : `./scripts/update-tools.sh`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- MANDATORY (user rule, 2026-11-21, goal: fewer tokens): when graphify-out/graph.json exists, run `graphify query "<question>"` (or `path` / `explain`) before ANY grep, search or source-file read for a codebase question, every time, for the main session and every subagent; put this rule in every subagent prompt that explores code, and every subagent report states the graphify queries it ran and what they located. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- Run `graphify update .` once the work is green (quality bar passed), not after every intermediate edit.
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
