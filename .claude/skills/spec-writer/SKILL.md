---
name: spec-writer
description: Rédige une spécification technique complète. À utiliser dès que l'utilisateur demande une spec, un cahier des charges, une conception, un design doc, "comment on va construire X", ou avant d'implémenter toute feature non triviale, même s'il ne dit pas le mot "spec".
---

# Spec Writer

## Processus
1. **Cadrage** : lis `CLAUDE.md`, `docs/adr/` et le code concerné. Puis pose les questions manquantes (problème, utilisateurs, contraintes, périmètre). Ne rédige pas avant d'avoir compris le "pourquoi".
2. **Rédaction** : copie `docs/specs/_TEMPLATE.md` vers `docs/specs/<AAAA-MM>-<slug>.md` et remplis TOUTES les sections (écris "N/A" avec une raison si une section ne s'applique pas).
3. **Challenge** : liste les alternatives sérieuses et justifie le choix. Signale les risques et questions ouvertes.
4. **Validation** : présente un résumé de 10 lignes maximum et demande la validation explicite avant toute implémentation.

## Exigences de qualité
- Chaque critère d'acceptation est vérifiable (testable, pas de "rapide" ou "propre").
- Les non-objectifs sont explicites pour éviter le dérapage de périmètre.
- Le découpage en tâches donne des étapes petites (idéalement < 1 jour) et ordonnées, chacune avec sa vérification.
- Les contrats d'API et le modèle de données sont précis (types, contraintes, erreurs).
- Les décisions structurantes renvoient à un ADR (skill `adr`).
- Tiens compte de la sécurité, de la performance et de l'observabilité dès la spec.

## Ne fais pas
- Ne code pas pendant la phase de spec.
- N'invente pas de besoins : marque-les comme hypothèses.
