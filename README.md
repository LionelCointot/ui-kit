# Template projet : workflow spec-first avec Claude Code

Template générique : skills, conventions, specs, ADR, plus **graphify** (graphe du code mis à jour après chaque commit) et **impeccable** (design front). Les skills propres à un projet s'ajoutent dans le repo du projet, pas ici.

## Démarrer un nouveau projet
1. Sur GitHub : **Use this template** → nouveau repo.
2. Cloner dans `~/Projects/<nom>` et ouvrir dans VS Code avec Claude Code.
3. Une fois par poste : `./scripts/setup.sh` (installe graphify si besoin, branche les hooks git, construit le graphe). À défaut, le hook de session de Claude Code branche graphify automatiquement s'il est installé.
4. Dans Claude Code : « Initialise ce projet » (skill `project-init`) : remplit `CLAUDE.md`, retire les skills inutiles pour la stack.
5. « Écris la spec de [feature] » (skill `spec-writer`), valider, puis implémenter.
6. Projet avec front : `/impeccable init` pour poser le contexte design.

## Contenu

| Élément | Rôle |
|---|---|
| `CLAUDE.md` | Contexte du projet, lu à chaque session (à compléter) |
| `docs/specs/_TEMPLATE.md`, `docs/adr/_TEMPLATE.md` | Modèles de spec et de décision d'architecture |
| `.claude/skills/` | Skills (voir ci-dessous) |
| `.claude/settings.json` | Hooks : graphify (consultation du graphe, branchement auto des hooks git), impeccable (vérification UI) |
| `.claude/agents/` | Sous-agents d'impeccable |
| `scripts/setup.sh` | Installation de graphify, hooks git, graphe initial, moteur impeccable |
| `scripts/update-tools.sh` | Mise à jour de graphify et impeccable |
| `scripts/install-global-skills.sh` | Copie de skills vers `~/.claude/skills` (disponibles dans tous les projets) |
| `.github/pull_request_template.md` | Modèle de PR |
| `.editorconfig`, `.vscode/` | Format et éditeur |

## Skills
- **Processus** : `project-init`, `spec-writer`, `adr`, `pr-description`
- **Conception** : `web-architecture`, `api-design`, `frontend-guidelines`
- **Code** : `clean-code` (lisibilité, maintenabilité), `angular-best-practices` (signaux, store, client d'API généré, composants de présentation), `dotnet-best-practices` (couches, minimal APIs, ProblemDetails, tests)
- **Qualité** : `review-checklist`, `security-checklist`, `test-strategy`
- **Outils** : `graphify`, `impeccable`

`review-checklist` et `security-checklist` complètent les commandes intégrées `/code-review` et `/security-review` de Claude Code.

## graphify
- Graphe dans `graphify-out/` (ignoré par git, propre à chaque poste).
- Les hooks git `post-commit`, `post-checkout`, `post-merge` et `post-rewrite` le reconstruisent en arrière-plan (analyse du code seule, sans LLM ni clé API). Sauter une fois : `GRAPHIFY_SKIP_HOOK=1 git commit ...`.
- État : `graphify hook status`. Requêtes : `graphify query "..."`, `graphify explain "X"`, `graphify affected "X"`.

## impeccable
- Commandes : `/impeccable init`, `shape`, `critique`, `audit`, `polish`, `harden`... (`/impeccable` seul les liste).
- Le moteur binaire (spécifique à l'OS) n'est pas versionné : le lanceur le télécharge et vérifie son empreinte au premier usage.
- Télémétrie anonyme activée par défaut : `npx impeccable telemetry off` pour la couper.

## Améliorer le template
Quand une règle générique s'avère utile en projet, remontez-la ici : « Améliore le skill X du template avec ce qu'on a appris. »
