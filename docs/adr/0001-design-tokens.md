# ADR-0001 : Design tokens au format DTCG, compilés par Style Dictionary en variables CSS

- **Statut** : Acceptée
- **Date** : 2026-11-08

## Contexte

Le ui-kit sert plusieurs projets, chacun avec son propre thème. Un composant ne doit porter **aucune valeur visuelle en dur**, et un thème doit pouvoir être modifié sans toucher aux composants, ni même republier le ui-kit pour un thème de produit. Le changement de thème (clair, sombre, produit) doit se faire à l'exécution. Le contraste WCAG AA doit être garanti par construction.

## Options considérées

1. **Variables et maps SCSS** : outillage connu, mais compilées, donc pas de changement de thème à l'exécution, et chaque consommateur doit recompiler les styles du ui-kit.
2. **Variables CSS écrites à la main** : thème à l'exécution, mais pas de source structurée, pas de contrôle de contraste automatique, et une duplication entre thèmes.
3. **Tokens au format DTCG** (JSON standard du W3C Design Tokens Community Group), **compilés par Style Dictionary 5** en variables CSS, avec des exports JSON et TypeScript. Source structurée, outillage standard, contrôles automatisés au build.
4. **Thème Tailwind** : rapide, mais il impose Tailwind à tous les consommateurs et mélange style et balisage.

## Décision

**Option 3**, avec trois couches et un préfixe propre `lc` :

| Couche | Préfixe CSS | Exemple | Qui l'utilise |
|---|---|---|---|
| Référence (primitifs : palette brute, échelles) | `--lc-ref-` | `--lc-ref-color-blue-500` | **les fichiers de thème uniquement** |
| Système (rôles sémantiques) | `--lc-sys-` | `--lc-sys-color-primary` | composants et consommateurs |
| Composant | `--lc-<composant>-` | `--lc-button-solid-primary-bg` | le composant concerné ; retombe par défaut sur la couche système |

- Un composant ne lit que ses tokens de composant, avec repli sur la couche système (`var(--lc-button-radius, var(--lc-sys-radius-md))`). L'usage de `--lc-ref-*` dans un fichier de composant est **interdit**, et un contrôle en CI le vérifie (stylelint).
- Thèmes livrés : `default` (clair) et `dark`. Ils s'appliquent par `[data-theme="…"]` sur `<html>`.
- Thèmes de produit : fichiers DTCG dans le repo consommateur, compilés par la CLI `lc-tokens` du paquet `@lionelcointot/ui-tokens`.
- La CLI vérifie, et fait échouer le build sinon :
  - le contraste des paires texte/fond déclarées (AA : 4,5:1 pour le texte, 3:1 pour les composants d'interface) ;
  - la palette de graphiques (séparation pour les daltoniens ; [spec graphiques](../specs/2026-11-graphiques.md)).
- Les tokens (noms et rôles) font partie du **contrat public** : renommer ou supprimer un token est une rupture (version majeure). Un token remplacé reste disponible comme alias déprécié pendant au moins une version mineure.

## Conséquences

- **Positives** : thème à l'exécution ; thèmes de produit sans republier le ui-kit ; contraste garanti par construction ; tokens réutilisables hors Angular (`ui-tokens` n'a aucune dépendance Angular).
- **Négatives / dette** : une chaîne de build de plus (Style Dictionary) ; discipline de nommage à tenir ; les points de rupture responsive ne peuvent pas être des variables CSS dans les media queries (fournis en SCSS et TypeScript).
- **À surveiller** : le nombre de tokens de composant. On n'en crée que pour ce qu'un thème a réellement besoin de varier (YAGNI).
