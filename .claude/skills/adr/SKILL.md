---
name: adr
description: Crée un Architecture Decision Record. À utiliser quand une décision technique structurante est prise ou discutée (choix de framework, base de données, architecture, librairie, hébergement, pattern), ou quand l'utilisateur dit "documente cette décision", "pourquoi on a choisi", "compare ces options".
---

# ADR

1. Liste les ADR existants dans `docs/adr/` pour trouver le prochain numéro (`NNNN`, 4 chiffres).
2. Copie `docs/adr/_TEMPLATE.md` vers `docs/adr/NNNN-<slug-court>.md`.
3. Compare au moins 2 options réelles (pas un homme de paille) avec critères explicites : coût, complexité, maintenabilité, performance, risques, courbe d'apprentissage.
4. Rédige la décision en une phrase claire, puis les conséquences (positives, négatives, dette acceptée).
5. Si l'ADR remplace une décision ancienne, mets l'ancien en statut "Remplacée par ADR-NNNN".
6. Un ADR est court (une page) et immuable une fois accepté : on en crée un nouveau pour changer d'avis.
