---
name: spec-writer
description: Rédige une spécification technique complète. À utiliser dès que l'utilisateur demande une spec, un cahier des charges, une conception, un design doc, "comment on va construire X", ou avant d'implémenter toute feature non triviale, même s'il ne dit pas le mot "spec".
---

# Spec Writer

## Processus
1. **Cadrage** : lis `CLAUDE.md`, `docs/adr/` et le code concerné. Puis pose les questions manquantes, **une à la fois**, fermées quand c'est possible (problème, utilisateurs, contraintes, périmètre). Ne rédige pas avant de pouvoir dire le besoin en trois phrases. Si plusieurs approches tiennent, présente-en deux ou trois avec leurs compromis et une recommandation : l'utilisateur choisit. S'il y a un écran : l'utilisateur principal et son niveau de connaissance du sujet sont **confirmés par l'utilisateur** (pas supposés) et, pour un nouvel écran ou une refonte, la direction est choisie par lui sur maquettes avant la spec.
2. **Fiche de cadrage** : copie `docs/specs/_TEMPLATE.md` vers `docs/specs/<AAAA-MM>-<slug>.md` et remplis d'abord la section 0 : la demande **dans les mots de l'utilisateur**, le besoin, les décisions, la taille et les angles ouverts (`delivery-workflow`, phase 0). Fais-la relire par `cadreur` (mode cadrage) et pose ses questions à l'utilisateur.
3. **Rédaction** : remplis TOUTES les sections (écris « N/A » avec une raison si une section ne s'applique pas).
4. **Challenge** : liste les alternatives sérieuses et justifie le choix. Signale les risques et questions ouvertes.
5. **Relectures** (en parallèle, selon les angles ouverts) : `architect` (section 5), `security-reviewer` (section 7), `qa-engineer` en mode plan de test (sections 9 et 10), `cadreur` en mode spec. Intègre leurs constats ; un désaccord devient une question pour l'utilisateur. Note chaque relecture dans la section 13.
6. **Interface** : la §5.4 est remplie par `ui-ux-designer` (brief `/impeccable shape`) ou porte explicitement « Pas d'impact UI » avec la raison. Elle cite la direction choisie et les maquettes.
7. **Validation** : présente un résumé de 10 lignes maximum et demande la validation explicite avant toute implémentation (porte de `delivery-workflow`). Statut de la spec → « Validée ».
8. **À la livraison** : coche chaque `CA-n` prouvé, chaque tâche livrée, et écris les écarts dans la section 13. Une spec livrée dont les critères restent décochés est un défaut de suivi.

## Exigences de qualité
- Chaque critère d'acceptation est vérifiable (testable, pas de « rapide » ou « propre ») et numéroté `CA-1`, `CA-2`... : `qa-engineer` en fait des tests.
- Chaque critère, chaque tâche et chaque élément du modèle se rattache à un objectif de la section 2. Ce qui ne s'y rattache pas n'a pas été demandé.
- Les non-objectifs sont explicites pour éviter le dérapage de périmètre.
- Le découpage en tâches donne des étapes petites (idéalement < 1 jour) et ordonnées, chacune avec sa vérification et les `CA-n` qu'elle couvre ; une tâche = un appel à `senior-developer`.
- Les contrats d'API et le modèle de données sont précis (types, contraintes, erreurs).
- Les décisions structurantes renvoient à un ADR (skill `adr`).
- Les sections ne se contredisent pas : un texte d'écran ne promet pas une donnée que l'API ne fournit pas.

## Ne fais pas
- Ne code pas pendant la phase de spec.
- N'invente pas de besoins : marque-les comme hypothèses.
