# [Nom du projet]

> Fichier lu à chaque session. Gardez-le court (< 100 lignes). Complétez les `[...]` (skill `project-init`).

## Contexte
[1-2 phrases : ce que fait le projet, pour qui.]

## Stack
- Langage / runtime : [...]
- Framework(s) : [...]
- Base de données : [...]
- Déploiement : [...]

## Commandes
- Installer : `[...]`
- Lancer en dev : `[...]`
- Tests : `[...]`
- Lint / format : `[...]`
- Build : `[...]`
- Générer le client d'API depuis l'OpenAPI : `[...]`

## Workflow (spec d'abord, code ensuite)
1. Toute feature non triviale commence par une spec dans `docs/specs/` (skill `spec-writer`), validée avant de coder.
2. Chaque choix d'architecture notable est consigné dans `docs/adr/` (skill `adr`).
3. Une branche par tâche : `feat/...`, `fix/...`, `chore/...`.
4. En écrivant du code : `clean-code` + le skill de la stack (`angular-best-practices`, `dotnet-best-practices`).
5. Avant de déclarer une tâche finie : build, tests et lint passent.
6. PR décrite avec `pr-description`, revue avec `review-checklist` (et `/code-review` pour la chasse aux bugs).

## Conventions
- Commits : Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- Code et identifiants en anglais, libellés affichés en français.
- Nommage : [...]
- Structure des dossiers : [...]
- Gestion d'erreurs : [...]

## À ne pas faire
- Ne pas commiter de secrets (.env, clés, tokens).
- Ne pas ajouter de dépendance sans la justifier.
- Ne pas modifier du code hors périmètre de la tâche.
- Ne pas modifier à la main un client d'API généré : le régénérer.

## Skills (`.claude/skills/`)
- Processus : `project-init`, `spec-writer`, `adr`, `pr-description`
- Conception : `web-architecture`, `api-design`, `frontend-guidelines`
- Code : `clean-code`, `angular-best-practices`, `dotnet-best-practices`
- Qualité : `review-checklist`, `security-checklist`, `test-strategy`
- Outils : `graphify` (graphe du code), `impeccable` (design front : `/impeccable init`, `shape`, `critique`, `audit`, `polish`)
- Les skills propres à ce projet s'ajoutent ici, pas dans le template.

## Outils
- **graphify** : graphe de connaissances du code dans `graphify-out/` (non versionné), reconstruit automatiquement après chaque commit par les hooks git. Installation sur un nouveau poste : `./scripts/setup.sh`.
- **impeccable** : son hook vérifie chaque fichier UI modifié. Contexte design dans `PRODUCT.md` et `DESIGN.md`.
- Mise à jour des deux outils : `./scripts/update-tools.sh`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
