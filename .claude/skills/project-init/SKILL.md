---
name: project-init
description: Initialise un nouveau projet à partir de ce template. À utiliser dès que l'utilisateur démarre un projet, dit "nouveau projet", "initialise", "bootstrap", "setup du repo", ou quand CLAUDE.md contient encore des placeholders [...]. Vérifie les outils (graphify, impeccable), pose des questions, remplit CLAUDE.md et adapte les skills à la stack.
---

# Project Init

## Étapes
1. **Outils** : vérifier que graphify est installé (`graphify --version`, sinon `~/.local/bin/graphify`) et que ses hooks git sont posés (`graphify hook status`). Sinon, proposer de lancer `./scripts/setup.sh`.
2. Lire `CLAUDE.md`, `docs/specs/` et `docs/adr/`. Si des `[...]` subsistent, le projet n'est pas initialisé. S'il existe déjà une spec (ex. fournie par l'utilisateur), en extraire stack et conventions plutôt que de reposer les questions.
3. Poser les questions manquantes (groupées, maximum 6) :
   - But du projet et utilisateurs ?
   - Type : web app, API, application desktop, CLI, librairie ?
   - Stack et contraintes (BDD, hébergement, OS cibles) ?
   - Niveau de rigueur : prototype ou production ?
   - Contraintes : sécurité, conformité, performance, budget ?
4. Si l'utilisateur hésite sur la stack, proposer 2 options avec avantages / inconvénients et en recommander une.
5. Remplir `CONSTRAINTS.md` (barre de qualité : commandes du plancher, seuils) et créer `scripts/check.sh`, qui enchaîne ces commandes et `scripts/check-tests-not-weakened.sh` ; brancher l'intégration continue dessus.
5 bis. Remplir `CLAUDE.md` : contexte, stack, commandes réelles (install, dev, test, lint, build), conventions. Ne laisser aucun `[...]` sans demander. Les commandes doivent être exactes et non interactives : `qa-engineer` les exécute telles quelles pour son verdict.
6. **Adapter les skills à la stack** (supprimer le dossier du skill inutile) :
   - Pas de front → supprimer `angular-best-practices`, `angular-developer`, `frontend-guidelines`, `ui-kit`, `impeccable` (et ses hooks dans `.claude/settings.json`, ses agents dans `.claude/agents/`).
   - Front non Angular → remplacer `angular-best-practices` par un skill équivalent pour le framework choisi (même structure : couches, état, accès API, exemples).
   - Claude Octopus non souhaité (pas d'autre fournisseur d'IA, budget de tokens serré) → retirer `extraKnownMarketplaces` et `enabledPlugins` de `.claude/settings.json`.
   - Pas de .NET → supprimer `dotnet-best-practices`, `dotnet-webapi` et `optimizing-ef-core-queries`, et les remplacer par l'équivalent de la stack backend. Pas d'EF Core → supprimer `optimizing-ef-core-queries`.
   - Front qui ne consomme pas le ui-kit → supprimer `ui-kit`.
   - Reporter chaque suppression ou remplacement dans la ligne « Code » de la section Skills de `CLAUDE.md` : les agents y lisent les skills de stack à charger. Les agents eux-mêmes ne se modifient pas (ils sont recopiés du template par `scripts/sync-skills.sh`) ; sans front, le designer rend « pas d'impact UI ».
7. **Front Angular** : proposer d'ajouter le serveur MCP Angular CLI (`claude mcp add angular-cli --scope project -- npx -y @angular/cli mcp`) et, une fois l'app créée, de lancer `/impeccable init` pour le contexte design (`PRODUCT.md`).
8. Ajouter les skills spécifiques au projet (conventions métier, règles propres) dans `.claude/skills/` de ce repo, pas dans le template.
9. Créer la structure de dossiers de base adaptée à la stack (voir les skills de stack), sans code métier.
10. Construire le graphe initial : `graphify update .`.
11. Proposer un ADR pour la stack choisie (skill `adr`), puis une première spec (skill `spec-writer`), livrée ensuite selon `delivery-workflow`.

## Règles
- Ne génère pas de code applicatif tant que la stack et la première spec ne sont pas validées.
- Termine par un résumé de ce qui a été fait et des prochaines étapes.
