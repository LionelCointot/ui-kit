---
name: pr-description
description: Rédige la description d'une pull request et les messages de commit. À utiliser quand l'utilisateur veut ouvrir une PR, commiter, résumer des changements, ou demande "message de commit", "description de PR", "changelog".
---

# PR Description

1. Examine `git log main..HEAD` et `git diff main...HEAD` ; lis la spec liée.
2. Commits : format Conventional Commits, impératif, ≤ 72 caractères pour le titre (`feat(auth): ajoute la connexion par lien magique`). Corps optionnel : le pourquoi.
3. Description de PR en suivant `.github/pull_request_template.md` :
   - **Résumé** : quoi et pourquoi (pas un recopiage du diff).
   - **Changements principaux** : 3 à 7 puces.
   - **Risques** : migrations, rupture de compatibilité, perf, sécurité.
   - **Plan de test** : commandes et étapes manuelles réalisables.
   - Liens vers spec/ADR/issue.
4. Une PR = un sujet. Si le diff mélange plusieurs sujets, propose de le découper.
5. Ne mentionne rien qui n'est pas dans le diff.
