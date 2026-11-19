---
name: simplification-audit
description: Audit de simplification d'un code existant - repère la complexité inutile, la logique en double et les hypothèses qui ne tiennent plus, avec une preuve pour chaque recommandation, puis propose les plus petits changements qui gardent le fonctionnement. À utiliser quand l'utilisateur dit "audite", "qu'est-ce qu'on peut retirer", "simplifie", "nettoie", "dette technique", "code mort", et à la livraison d'une fonctionnalité pour ce qu'elle a rendu inutile. En lecture seule - il propose, il ne modifie rien.
---

# Audit de simplification

`ponytail` évite d'écrire du code inutile ; cet audit retrouve celui qui est déjà là. Règle générale : **on ne retire ni ne simplifie rien sans preuve, et on choisit toujours le plus petit changement qui garde le fonctionnement.**

## Ce qu'on cherche
1. **Complexité inutile** : abstraction à une seule implémentation, couche qui ne fait que relayer, option ou paramètre jamais utilisé avec une autre valeur, généralité « pour plus tard », code jamais appelé, dépendance qui ne sert plus, configuration que personne ne règle.
2. **Logique en double** : la même règle écrite à deux endroits (code, tests, scripts, documentation), deux chemins qui font la même chose, une constante recopiée, une validation refaite à chaque couche sans raison.
3. **Hypothèses qui ne tiennent plus** : code de transition dont la transition est finie, cas défensif devenu impossible, commentaire ou `shortcut:` dont la condition de levée est arrivée, contournement d'un défaut corrigé, documentation qui décrit un état disparu, test qui protège un comportement supprimé.

## Processus
1. **Périmètre** : celui que l'utilisateur donne (dépôt, module, ce qu'une fonctionnalité a touché). Sans précision : les modules modifiés depuis la dernière livraison (`git diff --stat <base>...HEAD`).
2. **Explorer** : si `graphify-out/graph.json` existe, `graphify query`, `graphify path`, `graphify explain` d'abord (nœuds très reliés, symboles sans appelant, communautés), puis lecture ciblée. Lire `CLAUDE.md`, les ADR et les specs du périmètre : ils disent quelles hypothèses ont changé.
3. **Relever les candidats**, puis **prouver chacun** avant de l'écrire (voir « Preuves »). Un candidat sans preuve va dans « Non vérifié », pas dans les recommandations.
4. **Proposer le plus petit changement** pour chacun, et dire ce qui garantit que le fonctionnement est gardé.
5. **Rendre** au format ci-dessous. Ne rien modifier : l'utilisateur choisit, puis chaque changement retenu passe par `delivery-workflow` (correctif ou tâche).

## Preuves recevables
Une preuve est vérifiable par quelqu'un d'autre, en une commande ou une lecture :
- **Jamais appelé** : la recherche d'appelants et son résultat (`graphify affected "<symbole>"`, `grep -rn`), y compris par réflexion, injection de dépendances, gabarits, configuration et tests.
- **En double** : les deux emplacements, `fichier:ligne` chacun, et ce qu'ils ont d'identique.
- **Toujours la même valeur** : tous les appels ou toutes les configurations, qui passent la même chose.
- **Hypothèse périmée** : le commit, l'ADR, la spec ou le test qui l'a rendue fausse, et le code qui s'appuie encore dessus.
- **Cas impossible** : la garde en amont qui l'exclut, `fichier:ligne`.
- **Dépendance inutile** : aucune importation, ou une seule fonction que la bibliothèque standard fournit.
« Ça a l'air inutile » n'est pas une preuve.

## Le plus petit changement
- Retirer plutôt que réécrire ; fusionner deux copies plutôt qu'en créer une troisième ; inliner une couche plutôt que la redessiner.
- Un changement par recommandation, indépendant des autres, pour pouvoir n'en retenir qu'une partie.
- Dire ce qui garde le fonctionnement : les tests existants qui couvrent le chemin (les nommer), ou le test à écrire **d'abord** s'il n'y en a pas.
- Dire ce qui change quand même pour quelqu'un (contrat public, message, performance) : alors ce n'est plus une simplification pure, il faut l'accord de l'utilisateur, et un ADR si c'est structurant.

## Ce qu'on ne retire pas
- La validation aux frontières, la gestion d'erreur qui évite une perte de données, la sécurité, l'accessibilité, la traçabilité.
- Un test, sauf si le comportement qu'il prouve a été supprimé par une décision écrite (la citer).
- Un contrat public (API, format de fichier, tokens, sélecteurs), une migration livrée, du code généré.
- Une abstraction qui a une seule implémentation mais qui est une frontière voulue par un ADR.

## Format de sortie
Recommandations triées du plus grand gain pour le plus petit risque au contraire.

| N° | Type | Où | Preuve | Plus petit changement | Ce qui garde le fonctionnement | Gain | Risque |
|---|---|---|---|---|---|---|---|
| 1 | Retirer / Fusionner / Simplifier / Hypothèse périmée | `fichier:ligne` | commande ou lecture, et son résultat | une phrase | tests nommés, ou test à écrire d'abord | lignes, fichiers, dépendances en moins | faible / moyen / fort, et pourquoi |

Puis :
- **Regardé et gardé** : ce qui paraissait inutile et ne l'est pas, avec la raison (pour ne pas le réexaminer).
- **Non vérifié** : candidats sans preuve, et ce qu'il faudrait pour trancher.
- **Total** : lignes et dépendances en moins si tout est retenu.

## Quand le lancer
- À la demande de l'utilisateur.
- À la livraison d'une fonctionnalité (phase 5 de `delivery-workflow`) : `code-reviewer` l'applique à ce que la fonctionnalité a touché, pour relever ce qu'elle a rendu inutile (code de transition, faux adaptateur, option, documentation). L'utilisateur choisit ce qui est retiré, dans une tâche à part.
