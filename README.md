# ui-kit

Bibliothèque de composants Angular et de design tokens, **générique** et réutilisable par tous les projets : boutons, champs (dont montants, pourcentages, durées, dates), tableaux, mise en page, navigation, dialogues, retours d'état, indicateurs et graphiques. Le style est entièrement piloté par des tokens : chaque projet applique son thème sans modifier la bibliothèque.

> **Statut** : spécification. Le code arrive phase par phase (voir les specs).

## Paquets

| Paquet | Contenu |
|---|---|
| `@lionelcointot/ui-tokens` | Tokens au format DTCG, CSS des thèmes `default` et `dark`, CLI `lc-tokens` (thèmes produit, contrôles de contraste et de palette). Sans Angular |
| `@lionelcointot/ui-angular` | Composants Angular 22, avec un point d'entrée secondaire par famille : `button`, `forms`, `layout`, `navigation`, `overlay`, `feedback`, `data`, `charts` (ECharts 6, optionnel), `theme-builder`, `data-grid` (AG Grid Community, phase 5) |

## Utilisation (cible)

```bash
npm i @lionelcointot/ui-tokens @lionelcointot/ui-angular   # registre GitHub Packages (.npmrc : @lionelcointot)
```

```html
<button lcButton themeColor="primary" fillMode="solid">Simuler</button>
<lc-form-field label="Prix du bien"><lc-money-input [(value)]="price" /></lc-form-field>
```

Un thème produit se décrit dans un fichier `*.tokens.json`, puis se compile avec `npx lc-tokens build --theme finance.tokens.json --name finance --out theme-finance.css`.

## Documentation

| Document | Contenu |
|---|---|
| [Spec du socle](docs/specs/2026-11-socle-tokens-themes.md) | Paquets, tokens (référence, système, composant), thèmes, CLI, API commune, services, Storybook, qualité |
| [Catalogue des composants](docs/specs/2026-11-catalogue-composants.md) | Les 47 éléments, leur API, leur accessibilité et leur phase de livraison |
| [Graphiques](docs/specs/2026-11-graphiques.md) | Courbes, aires, barres, barre segmentée, sparkline ; palette validée ; règles `dataviz` |
| [ADR](docs/adr/) | 0001 Tokens · 0002 Comportement CDK et sélecteurs · 0003 ECharts · 0004 Grille de données · 0005 Icônes |
| [Architecture du produit](https://github.com/LionelCointot/finance-hub/blob/main/docs/architecture.md) | Place du ui-kit parmi les repos du simulateur |

## Installer et lancer

Le ui-kit n'a aucun repo voisin. Après le clonage :

| Système | Installer | Lancer Storybook |
|---|---|---|
| macOS | double-clic sur `installer.command` | double-clic sur `lancer.command` |
| Windows | double-clic sur `installer.cmd` | double-clic sur `lancer.cmd` |
| Linux | `bash installer.command` | `bash lancer.command` |

Les scripts installent si besoin Node >= 24.15 dans votre dossier utilisateur (sans droits administrateur), installent les dépendances, construisent les tokens et la bibliothèque (`dist/ui-angular`, consommée par les autres repos en `file:`), puis lancent Storybook (http://localhost:6006). Configuration : `dev.config.json`. Détails et dépannage : [architecture, « Installer et lancer »](https://github.com/LionelCointot/finance-hub/blob/main/docs/architecture.md).

## Développer

Prérequis : Node.js 24, un jeton GitHub `read:packages` pour le registre privé. Puis `./scripts/setup.sh` (graphify et impeccable), et les commandes listées dans [CLAUDE.md](CLAUDE.md).

Créé depuis [project-template](https://github.com/LionelCointot/project-template) (workflow spec d'abord avec Claude Code).
