---
name: review-checklist
description: Revue de code structurée selon les conventions du projet. À utiliser quand l'utilisateur demande une revue, "review", "relis ce code", "vérifie ma PR/mon diff", ou avant d'ouvrir/merger une pull request. Vérifie correction, respect de la spec, sécurité, tests, lisibilité (clean-code) et conventions de la stack (Angular, .NET).
---

# Revue de code (conventions du projet)

Complémentaire de la commande intégrée `/code-review` (chasse aux bugs multi-agents) : ici on vérifie aussi la spec et nos conventions. Dans `delivery-workflow`, cette grille est appliquée par `code-reviewer`, en parallèle de `qa-engineer` qui prouve le comportement ; ses bloquants valent `CHANGEMENTS REQUIS`.

## Processus
1. Périmètre : `git diff main...HEAD` (ou la PR indiquée). Lire la spec liée dans `docs/specs/`, les ADR concernés et `CLAUDE.md`.
2. Si `graphify-out/graph.json` existe : `graphify affected "<symbole modifié>"` pour repérer les appelants impactés hors du diff.
3. Passer en revue dans cet ordre :
   1. **Correction** : le code fait-il ce que la spec demande ? bugs, cas limites, concurrence, erreurs non gérées, arrondis monétaires.
   2. **Sécurité** : entrées non validées, injection, autorisation manquante, secrets, fuite de données (voir `security-checklist`).
   3. **Tests** : la logique nouvelle a-t-elle ses tests unitaires (écrits par le développeur) ? chaque critère d'acceptation (`CA-n`) a-t-il son test (écrit par `qa-engineer`, non modifié par le développeur) ? tests significatifs (comportement, pas implémentation) ? aucun test désactivé, ignoré ou assoupli dans le diff (voir `test-strategy`) ?
   4. **Architecture** : respect des couches. Angular : aucun composant n'injecte `HttpClient`/client d'API, état en signaux dans un store (voir `angular-best-practices`). .NET : Core sans dépendance web/stockage, endpoints sans logique métier, ProblemDetails (voir `dotnet-best-practices`). Back TypeScript : cœur pur sans I/O, détails (fichiers, processus) derrière des interfaces injectées (voir `clean-code`).
   5. **Lisibilité et maintenabilité** : nommage, taille des fonctions, imbrication, duplication de connaissance, code mort ou commenté (voir `clean-code`).
   6. **Simplicité (contrôle de `ponytail`)** : abstraction, option ou configuration sans usage dans le diff, code « pour plus tard », couche qui ne fait que relayer, dépendance ajoutée sans nécessité, raccourci sans commentaire `shortcut:`. Rien de ce qui ne se rogne pas (validation, erreurs, sécurité, accessibilité) n'a été retiré.
   7. **Performance** : requêtes N+1, boucles coûteuses, re-rendus inutiles, chargements non paresseux.
   8. **Périmètre** : changements hors sujet, dépendance ajoutée sans justification.
   9. **UI** (si le diff a un impact UI, voir `frontend-guidelines`) : verdict de conformité de `ui-ux-designer` (`/impeccable critique` et `audit` sur les écrans modifiés) ; à défaut, le demander.
4. Lancer build, tests et lint (commandes de `CLAUDE.md`) et rapporter le résultat réel. Reprendre une sortie déjà produite par la QA seulement si elle porte sur le même commit.

## Format de sortie
- **Verdict** : Approuvé | Approuvé avec réserves | Changements requis.
- **Faits** : taille du diff, fichiers hors périmètre, dépendances ajoutées, commentaires `shortcut:`.
- **Bloquant** : `fichier:ligne`, problème, correction proposée.
- **Recommandé** : amélioration non bloquante.
- **Nit** : détail de style ou préférence (court) ; jamais un motif de refus.
- **Points positifs** : 1 à 3.

## Règles
- Précis et actionnable : citer les lignes, proposer le correctif.
- Pas de faux positif : vérifier dans le code avant d'affirmer.
- Distinguer clairement bloquant et préférence personnelle.
- Ne pas signaler les diffs de `graphify-out/` (fichiers générés, ignorés par git).
