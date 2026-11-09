# ADR-0006 : Thèmes à l'exécution et Theme builder

- **Statut** : Proposée
- **Date** : 2026-11-09

## Contexte
Les thèmes sont aujourd'hui compilés au build par `lc-tokens` (Style Dictionary, Node uniquement), et `LcThemeService` ne bascule qu'entre clair, sombre et automatique. On veut un éditeur visuel avec un rendu en direct (Storybook), et des thèmes créés à l'exécution par les applications consommatrices (par exemple des thèmes personnels par utilisateur), sans que le ui-kit connaisse le stockage ni le domaine.

## Options considérées
1. **Cœur de thème en TypeScript pur dans `ui-tokens`, plus une API d'exécution dans `LcThemeService`.** Une seule logique (validation, contraste, rendu CSS) sert au navigateur et au CLI. Il faut ré-implémenter l'émission CSS des thèmes produit, sans Style Dictionary.
2. **Style Dictionary dans le navigateur.** Dépendance lourde, pensée pour Node (fs), et inutile à l'exécution.
3. **Variables inline seulement.** Simple pour une prévisualisation, mais impossible de basculer entre plusieurs thèmes enregistrés, et le sélecteur `data-theme` diverge du build.
4. **Builder en application séparée ou en addon Storybook.** Outillage dupliqué ; le composant ne serait pas réutilisable par les applications.

## Décision
Option 1.
- **`@lionelcointot/ui-tokens/theme`** (sans Angular) porte le schéma des tokens `sys` éditables, la validation stricte par type, la résolution, le rendu `[data-theme="x"]`, le contraste et l'import/export DTCG. `lc-tokens` le réutilise.
- **`LcThemeService`** gagne de façon additive `registerThemes`, `setCustomTheme`, `preview` et `revision`.
- **`@lionelcointot/ui-angular/theme-builder`** fournit l'éditeur, le rapport de contraste, l'aperçu et le builder avec export. Storybook l'héberge sur une page « Outils / Theme builder ».
- Le stockage, le nommage et les droits restent l'affaire du consommateur.

## Conséquences
- Positives :
  - un thème exporté est un thème produit compilable tel quel ;
  - les applications peuvent offrir des thèmes personnels sans recompiler ;
  - le contraste est vérifié de la même manière partout.
- Négatives / dette :
  - deux émetteurs CSS (Style Dictionary pour la base, `renderThemeCss` pour les surcharges), dont la parité doit être testée ;
  - les valeurs utilisateur réinjectées dans une feuille de style imposent une validation stricte par liste blanche (risque d'injection CSS).
- À surveiller :
  - la taille du point d'entrée `theme-builder`, à charger à la demande ;
  - les dérivations automatiques de couleurs, dont le contraste peut être limite.
