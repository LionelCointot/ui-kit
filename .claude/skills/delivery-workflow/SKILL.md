---
name: delivery-workflow
description: Workflow de livraison orchestré par la session principale avec trois sous-agents (senior-developer, ui-ux-designer, qa-engineer) et ses portes de qualité, du cadrage à la PR. À utiliser dès qu'une tâche modifie le repo (feature, correctif, refactoring, évolution d'API ou d'écran), quand l'utilisateur dit "implémente", "corrige", "livre", "développe", "fais la tâche Tn de la spec", ou demande qui fait quoi entre dev, design et QA.
---

# Delivery Workflow

La session principale est un **orchestrateur et vérificateur léger** : elle cadre avec l'utilisateur, découpe, délègue aux sous-agents (`.claude/agents/`), contrôle les rendus et tient les portes. Elle ne code pas elle-même, sauf retouche d'une ligne. Les sous-agents ne dialoguent pas avec l'utilisateur : toute question remonte par leur rendu, et c'est l'orchestrateur qui la pose.

## Rôles (toujours présents)

| Rôle | Modèle | Fait | Ne fait pas |
|---|---|---|---|
| `senior-developer` | sonnet | code de production testable, liste « À tester », ADR proposés, brouillon de spec | écrire ou modifier des tests, valider sa propre livraison |
| `ui-ux-designer` | sonnet | triage UI, conception (`impeccable`), contrôle de conformité des écrans | code métier, logique de store |
| `qa-engineer` | sonnet | **écrit tous les tests** (unitaires, intégration, E2E) à partir de la spec, vérifie les critères d'acceptation, build/tests/lint, régressions, grille `review-checklist`, verdict GO / NO-GO | code de production, désactiver ou assouplir un test |

## Puissance du modèle (paramètre `model` à l'appel)
- **sonnet** (défaut) : spec, ADR, implémentation, QA, design, revue.
- **opus** : seulement sur accord de l'utilisateur, après un échec en sonnet sur une tâche de conception ou un bug difficile.
- **haiku** : recherche dans le code (agent intégré `Explore`), triage UI (`ui-ux-designer` avec `model: haiku`), propagation mécanique (même bloc recopié dans plusieurs repos, renommage, mise en forme de docs).
Choisir le plus petit modèle qui tient la tâche ; remonter d'un cran après un échec plutôt que de relancer à l'identique.

## graphify d'abord
Recopier dans **chaque** prompt de sous-agent qui explore du code : « Si `graphify-out/graph.json` existe, lance `graphify query "<question>"` (ou `graphify path "A" "B"`, `graphify explain "X"`) avant tout grep ou lecture de fichier ; ne lis ensuite que les lignes localisées. Après modification du code, lance `graphify update .`. » Sans graphe (outil absent), grep et lecture directe.

## Contrat de passage de relais
**Entrée (fiche de tâche, rédigée par l'orchestrateur, ≤ 15 lignes)** : objectif ; spec et critères visés (`CA-n`) ; périmètre (fichiers/dossiers, hors périmètre) ; contraintes (ADR, conventions) ; rendu attendu ; règle graphify ci-dessus. Pas d'historique de conversation : le sous-agent part de zéro.

**Sortie (tout rôle)** : commence par une ligne de statut (`FAIT` | `BLOQUÉ` | `GO` | `NO-GO` | `PAS D'IMPACT UI`), puis le détail défini dans l'agent, puis **Questions pour l'utilisateur** (ou « aucune »). Preuves = sorties réelles de commandes, jamais « les tests passent » sans sortie.

## Étapes et portes

| # | Étape | Qui | Porte de sortie |
|---|---|---|---|
| 1 | Cadrage | orchestrateur | besoin compris, type de workflow choisi (complet ou allégé) |
| 2 | Spec / ADR | orchestrateur ou `senior-developer` avec `spec-writer`, `adr` | spec **validée par l'utilisateur**, critères `CA-n` vérifiables, ADR acceptés |
| 3 | Design | `ui-ux-designer` (conception) | §5.4 de la spec rempli (brief `/impeccable shape`) ou « pas d'impact UI » ; questions tranchées par l'utilisateur |
| 4 | Implémentation | `senior-developer`, une tâche `Tn` par appel | `FAIT` avec diff limité au périmètre et **sans fichier de test**, build/lint et tests existants verts (sorties), liste « À tester », `graphify update .` lancé |
| 5 | Tests et QA | `qa-engineer` écrit les tests puis vérifie ; si impact UI, `ui-ux-designer` (conformité) en parallèle | `GO` motivé, chaque `CA-n` prouvé par un test écrit par la QA, aucun bloquant `review-checklist`, design conforme |
| 6 | Revue | orchestrateur : `/code-review` sur le diff | aucun bug confirmé non traité |
| 7 | PR | orchestrateur avec `pr-description` | description avec verdicts QA et design ; commit/push seulement sur accord de l'utilisateur |

**Séparation stricte** : le développeur n'écrit aucun test, la QA aucun code de production. Les tests tirés de la spec (`CA-n`) peuvent être écrits dès l'étape 2 validée, en parallèle de l'implémentation. Les tâches indépendantes d'une spec (back / front) peuvent partir en parallèle.

## Boucles de retour
- **NO-GO QA** ou bug confirmé en revue → `senior-developer` reçoit les constats numérotés **tels quels**, ne corrige que ceux-là → QA re-vérifie (constats + suite complète). Après 3 allers-retours sans GO : arrêt et escalade à l'utilisateur.
- **Non-conformité design** → `senior-developer` avec les constats du designer → contrôle de conformité refait.
- **Écart de spec** découvert par un rôle (`BLOQUÉ`) → l'orchestrateur amende la spec avec l'utilisateur, jamais de décision silencieuse.

## Workflow allégé (correctif trivial)
Conditions, toutes requises : changement local et évident, pas de nouveau comportement visible, pas de changement de contrat d'API, de données ni d'architecture. Alors : `senior-developer` → triage `ui-ux-designer` (`model: haiku`) qui rend « PAS D'IMPACT UI » ou bascule en workflow complet → `qa-engineer` → PR. Pour un bug, `qa-engineer` passe d'abord : il écrit le test qui échoue, puis le développeur corrige sans toucher au test.

## Vérifications de l'orchestrateur (légères)
- `git diff --stat` : seuls les fichiers du périmètre ont changé ; aucun fichier de test dans le rendu du développeur, aucun fichier de production dans celui de la QA.
- Aucun test désactivé, ignoré ou assoupli dans le diff (`skip`, `.only`, `xit`, `Skip =`, `[Ignore]`, seuils de couverture baissés, assertions supprimées).
- Les preuves citées correspondent au commit courant ; en cas de doute, relancer une seule commande, pas toute la QA.
