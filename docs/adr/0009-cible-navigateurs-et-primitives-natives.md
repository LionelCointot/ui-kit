# ADR-0009 : Cible navigateurs Baseline 2024 et primitives natives admises

- **Statut** : Acceptée (2026-11-20)
- **Date** : 2026-11-20
- **Amende** : ADR-0002 (« comportement délégué au CDK » devient « CDK par défaut »).

## Contexte
- La règle « pas de fonctionnalité CSS hors Baseline 2024 » était écrite dans `CLAUDE.md` sans décision qui la fonde.
- Modern Web Guidance 1.0 (Chrome, Edge, Firefox, MDN), recopiée en local dans `.claude/skills/modern-web-guidance/`, prend par défaut « Baseline Widely available » (seuil glissant de 30 mois) et pousse vers les primitives natives (`<dialog>`, `popover`, ancrage CSS) plutôt que le JavaScript ; elle laisse chaque projet fixer sa propre cible.
- L'utilisateur, le 2026-11-20, après l'avis de `architect` et l'audit du kit : « Ok ca marche ben on fait comme tu as dit ».

## Options considérées
1. **Seuil glissant « Widely available »** : suit le web sans décision ; mais une bibliothèque publiée en SemVer changerait de cible sans version, et le WebView de Tauri (macOS, Linux) ne suit pas Chrome.
2. **Millésime fixe « Baseline 2024 », revu par décision** : vérifiable, stable ; demande une revue annuelle.
3. **Remplacer le CDK par les primitives natives** : moins de code, accessibilité fournie par le navigateur ; mais `popover` (2025) et l'ancrage CSS (pas encore partout) sont hors cible, le positionnement reste à faire, et le CDK est prouvé.

## Décision
Option 2, et CDK par défaut avec primitives natives admises sous conditions.
- **Cible navigateurs** : Baseline 2024, millésime fixe revu chaque année par ADR. Une fonctionnalité dont le statut Baseline est postérieur est interdite, ou admise seulement avec un repli écrit et testé. Un consommateur peut fixer une cible plus ancienne (finance-hub : plancher du WebView de Tauri), jamais plus récente que celle du kit pour un composant du kit. Un guide externe ne relève pas la cible.
- **Comportement** : CDK par défaut (Angular Aria non retenu). Une primitive HTML native (`dialog`, plus tard `popover`) est admise pour un nouveau composant si elle est dans la cible, avec un test en navigateur réel et sans polyfill. Le positionnement reste celui du CDK Overlay tant que l'ancrage CSS est hors cible. Rien de ce qui fonctionne n'est réécrit sans bug ou besoin identifié.
- **Ordre si l'on migre plus tard** : `<dialog>` pour un nouveau modal ; `popover` simple au passage à Baseline 2025 ; info-bulles et listes déroulantes ancrées quand l'ancrage entre dans la cible ; menu en dernier.

## Conséquences
- Positives : règle écrite et datée ; Modern Web Guidance s'applique à travers elle (statuts Baseline de chaque fiche) ; passage à 2025 par une décision explicite.
- Négatives / dette : revue annuelle à tenir ; certaines améliorations natives attendent (par exemple `field-sizing`, `popover`).
- À surveiller : CDK 22 utilise déjà `popover` quand le navigateur le connaît ; `<dialog>` natif existe déjà dans le panneau mobile de `lc-data-table`.
