# ADR-0005 : Icônes SVG Lucide derrière un registre du ui-kit

- **Statut** : Acceptée
- **Date** : 2026-11-08

## Contexte

Les composants ont besoin d'icônes (chevrons, fermeture, alertes…), et les applications aussi : par exemple, le menu construit depuis `ModuleDescriptor.Icon`. Les icônes doivent :
- suivre la couleur du texte (`currentColor`) et les tailles des tokens ;
- rester nettes ;
- fonctionner hors ligne (application de bureau) ;
- ne pas imposer un jeu d'icônes à tous les projets pour toujours.

## Options considérées

1. **Police d'icônes (Material Symbols)** : simple à utiliser, mais un fichier de police entier à charger, un rendu dépendant de la police, et une accessibilité moins nette.
2. **Composants d'un jeu précis** (`@lucide/angular`) : prêts à l'emploi, mais chaque projet se couple à ce jeu, et les noms d'icônes de l'API (`ModuleDescriptor.Icon`) aussi.
3. **Registre d'icônes SVG du ui-kit** : un composant `lc-icon name="…"` résout le nom dans un registre. Le ui-kit enregistre par défaut un jeu restreint d'icônes **Lucide** (licence ISC, importées une par une depuis `lucide-static`), et chaque application peut ajouter ou remplacer des icônes.

## Décision

**Option 3.**
- `lc-icon` affiche un SVG en ligne (`currentColor`, taille issue de `--lc-sys-icon-size-*`). Il est décoratif par défaut (`aria-hidden="true"`), ou étiqueté si `label` est fourni.
- `provideLcIcons(record)` ajoute des icônes. Les noms sont en kebab-case et alignés sur Lucide (`landmark`, `calculator`, `house`).
- Le jeu par défaut, utilisé par les composants eux-mêmes (une trentaine d'icônes), est listé dans la [spec du catalogue](../specs/2026-11-catalogue-composants.md#icônes).
- Les SVG enregistrés sont des **constantes du code** (jamais du contenu fourni par l'utilisateur). Ils sont donc insérés sans risque d'injection, et aucun chargement réseau n'a lieu.

## Conséquences

- **Positives** : pas de couplage durable à un jeu d'icônes ; fonctionnement hors ligne ; seules les icônes utilisées sont embarquées ; noms stables dans le contrat des modules.
- **Négatives / dette** : maintenir la liste du jeu par défaut ; un nom inconnu doit être signalé (avertissement en console en développement, rien d'affiché en production).
- **À surveiller** : la cohérence visuelle si un projet mélange plusieurs jeux d'icônes.
