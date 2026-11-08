# Spec : socle du ui-kit (paquets, tokens, thèmes, API commune, Storybook, qualité)

- **Statut** : Implémentée (écarts constatés en fin de document)
- **Auteur** : Lionel Cointot (rédaction assistée par Claude Code)
- **Date** : 2026-11-08
- **ADR liés** : [0001 Tokens](../adr/0001-design-tokens.md) · [0002 Comportement et sélecteurs](../adr/0002-comportement-cdk-et-selecteurs.md) · [0003 Graphiques](../adr/0003-bibliotheque-graphiques-echarts.md) · [0004 Grille](../adr/0004-grille-de-donnees.md) · [0005 Icônes](../adr/0005-icones.md)
- **Specs liées** : [catalogue des composants](2026-11-catalogue-composants.md) · [graphiques](2026-11-graphiques.md)

## 1. Contexte et problème

Tous les projets front (le simulateur immobilier et les suivants) doivent partager :
- les mêmes composants (boutons, champs, tableaux, mise en page, graphiques) ;
- un style centralisé, piloté par des tokens.

Chaque projet doit pouvoir appliquer son propre thème **sans modifier ni republier** la bibliothèque. Cette spec définit le socle commun à tous les composants : paquets, tokens, thèmes, API commune, outillage de visualisation (Storybook) et exigences de qualité. Le détail de chaque composant est dans le [catalogue](2026-11-catalogue-composants.md).

## 2. Objectifs

- Deux paquets npm : `@lionelcointot/ui-tokens` (sans Angular) et `@lionelcointot/ui-angular` (composants, points d'entrée secondaires).
- Tokens à trois couches (référence, système, composant) au format DTCG, compilés en variables CSS, avec deux thèmes livrés (`default`, `dark`) et une CLI de thèmes produit.
- Contrôle automatique au build : contraste WCAG AA et palette de graphiques.
- API commune à la Kendo (`themeColor`, `fillMode`, `size`, `rounded`), configurable globalement.
- Services transverses : thème, formats français (montants, pourcentages, dates), libellés traduisibles.
- Storybook 10 : une story par composant, sélecteur de thème, addon accessibilité, tests d'interaction, tests visuels, documentation des tokens.

## 3. Hors périmètre (non-objectifs)

- Theme Builder autonome : la story « Playground des tokens » en tient lieu ; réévaluation après la phase 4.
- Thèmes propres aux produits (ex. thème finance) : ils vivent dans les repos consommateurs.
- Composants métier (tableau d'amortissement, etc.) : ils vivent dans les modules.
- Support des navigateurs antérieurs à Baseline 2024.
- Direction artistique : couleurs de marque, typographie, ton. Elle est définie avec `/impeccable init` puis figée dans `DESIGN.md` (T2) ; cette spec ne fixe que la **structure** et les rôles.

## 4. Utilisateurs et cas d'usage

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Développeur d'un projet | Installer et utiliser les composants | `npm i @lionelcointot/ui-tokens @lionelcointot/ui-angular`, `provideLcUiKit()`, import d'un fichier CSS de thème |
| Développeur d'un projet | Créer le thème de son produit | Un fichier `*.tokens.json` + `lc-tokens build`, contraste vérifié |
| Utilisateur final | Choisir clair, sombre ou automatique | Changement instantané, sans rechargement |
| Mainteneur du ui-kit | Ajouter un composant | Conventions, story et tests imposés ; aucune valeur en dur |
| Designer / relecteur | Voir et essayer les composants | Storybook avec contrôles, thèmes et rapport d'accessibilité |

## 5. Solution proposée

### 5.1 Vue d'ensemble de l'architecture

```
ui-kit/                                    # workspace npm + Angular
  packages/
    tokens/                                # @lionelcointot/ui-tokens (aucune dépendance Angular)
      src/ref/*.tokens.json                # couche référence (palette, échelles)
      src/sys/*.tokens.json                # couche système (rôles), par thème : default/, dark/
      src/components/*.tokens.json         # couche composant (valeurs par défaut → sys)
      src/checks/contrast-pairs.json       # paires texte/fond à vérifier
      bin/lc-tokens                        # CLI : build, check
      dist/                                # généré : css/, json/, ts/, scss/
    angular/                               # @lionelcointot/ui-angular (bibliothèque Angular, ng-packagr)
      core/                                # point d'entrée principal : provideLcUiKit, types, thème, formats, icônes
      button/  forms/  layout/  navigation/  overlay/  feedback/  data/  charts/  data-grid/
                                           # points d'entrée secondaires (un dossier par famille)
  apps/
    storybook/                             # Storybook 10 (non publié)
  tools/
    stylelint/                             # règle « pas de --lc-ref-* dans les composants »
  docs/ adr/ specs/  DESIGN.md (T2)  PRODUCT.md (T2)
```

**Points d'entrée de `@lionelcointot/ui-angular`**

| Point d'entrée | Contenu | Dépendances pair |
|---|---|---|
| `@lionelcointot/ui-angular` | `provideLcUiKit`, types communs, `LcThemeService`, `LcFormatService`, pipes, `LC_LABELS`, `lc-icon`, `provideLcIcons` | `@angular/core`, `@angular/common` ^22 |
| `…/button` | `lcButton`, `lc-button-group` | — |
| `…/forms` | `lc-form-field`, `lcInput`, contrôles monétaires, date, select, cases, interrupteur, contrôle segmenté, liste déroulante | `@angular/cdk` ^22, `@angular/forms` ^22 |
| `…/layout` | `lc-app-shell`, `lc-page`, `lc-stack`, `lc-grid`, `lc-card`, `lc-divider` | — |
| `…/navigation` | `lc-tabs`, `lc-nav-list`, `lc-menu` | `@angular/cdk` |
| `…/overlay` | `LcDialogService`, `lc-dialog`, `lcTooltip` | `@angular/cdk` |
| `…/feedback` | `lc-alert`, `LcToastService`, `lc-badge`, `lc-spinner`, `lc-progress-bar`, `lc-skeleton`, `lc-empty-state`, `lc-error-state` | — |
| `…/data` | `lc-table`, `lc-description-list`, `lc-kpi-card` | `@angular/cdk` |
| `…/charts` | graphiques ([spec](2026-11-graphiques.md)) | `echarts` ^6 (**optionnelle**) |
| `…/data-grid` | `lc-data-grid` (phase 5) | `ag-grid-community`, `ag-grid-angular` ^36 (**optionnelles**) |

Règle : un point d'entrée secondaire ne dépend que du point d'entrée principal, jamais d'un autre point d'entrée secondaire (exception : `data` peut utiliser `feedback` pour ses états vides).

### 5.2 Modèle de données : les tokens

#### 5.2.1 Format

- Format DTCG : `$value`, `$type` (`color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `number`), `$description`.
- Références entre tokens par `{ref.color.blue.500}`.
- Nom CSS = chemin en kebab-case préfixé : `sys.color.primary` donne `--lc-sys-color-primary`.

#### 5.2.2 Couche système (contrat public)

| Catégorie | Tokens | Remarque |
|---|---|---|
| Couleurs d'action | `color-primary`, `color-on-primary`, `color-primary-container`, `color-on-primary-container`, idem `secondary` | `on-*` = texte et icônes posés dessus |
| Couleurs d'état (UI) | `color-success`, `color-warning`, `color-error`, `color-info` + `on-*` + `*-container` + `on-*-container` | Pour l'interface (alertes, badges), distinctes des statuts de graphiques |
| Neutres | `color-neutral`, `color-on-neutral` | `themeColor="neutral"` |
| Surfaces | `color-background`, `color-surface`, `color-surface-raised`, `color-surface-sunken`, `color-on-surface`, `color-on-surface-muted`, `color-on-surface-subtle` | |
| Traits | `color-border`, `color-border-strong`, `color-focus-ring`, `color-backdrop` | |
| États d'interaction | `state-hover-opacity`, `state-pressed-opacity`, `state-disabled-opacity`, `state-selected-opacity` | Appliqués en calque (`color-mix`) |
| Typographie | `font-family-base`, `font-family-mono`, `font-size-xs` à `font-size-3xl`, `line-height-tight` / `-normal` / `-relaxed`, `font-weight-regular` / `-medium` / `-semibold` / `-bold` | `font-size-md` ≥ 16 px (`frontend-guidelines`) |
| Chiffres | `font-numeric-tabular` (`tabular-nums`) | Tableaux, axes |
| Espacements | `space-0`, `space-1` (4 px), `space-2`, `space-3`, `space-4`, `space-5`, `space-6`, `space-8`, `space-10`, `space-12`, `space-16` | Base 4 px |
| Rayons | `radius-none`, `radius-sm`, `radius-md`, `radius-lg`, `radius-full` | `rounded` |
| Hauteurs de contrôle | `control-height-sm` (36 px), `control-height-md` (44 px), `control-height-lg` (52 px) | Cible ≥ 44 px par défaut (`frontend-guidelines`) ; `small` réservé aux zones denses, avec une zone cliquable étendue à 44 px |
| Élévation | `shadow-1` à `shadow-4` | |
| Mouvement | `duration-fast` (100 ms), `duration-normal` (200 ms), `duration-slow` (300 ms), `easing-standard`, `easing-emphasized` | Ramenés à 0 sous `prefers-reduced-motion` |
| Superposition | `z-dropdown`, `z-sticky`, `z-overlay`, `z-dialog`, `z-toast`, `z-tooltip` | |
| Icônes | `icon-size-sm` (16 px), `icon-size-md` (20 px), `icon-size-lg` (24 px) | |
| Focus | `focus-ring-width` (2 px), `focus-ring-offset` (2 px) | Visible sur tout élément focusable |
| Graphiques | `chart-categorical-1` à `-8`, `chart-sequential-100` à `-700`, `chart-diverging-negative`, `-neutral`, `-positive`, `chart-status-good`, `-warning`, `-serious`, `-critical`, `chart-surface`, `chart-gridline`, `chart-axis`, `chart-ink-primary`, `-secondary`, `-muted` | Valeurs initiales : palette de référence validée, voir la [spec graphiques §5.2](2026-11-graphiques.md#52-modèle-de-données) |

Les points de rupture responsive (`sm` 360, `md` 768, `lg` 1024, `xl` 1280) sont exportés en SCSS (`$lc-breakpoint-*`) et en TypeScript (`LC_BREAKPOINTS`), car une variable CSS est inutilisable dans une media query.

#### 5.2.3 Couche composant

Chaque composant déclare ses tokens dans `src/components/<composant>.tokens.json`, avec des valeurs par défaut pointant vers la couche système. Par exemple, pour le bouton :

| Token | Défaut |
|---|---|
| `--lc-button-radius` | `{sys.radius.md}` |
| `--lc-button-font-weight` | `{sys.font.weight.semibold}` |
| `--lc-button-solid-<themeColor>-bg` | `{sys.color.<themeColor>}` |
| `--lc-button-solid-<themeColor>-fg` | `{sys.color.on-<themeColor>}` |
| `--lc-button-outline-<themeColor>-border` | `{sys.color.<themeColor>}` |
| `--lc-button-height-<size>` | `{sys.control.height.<size>}` |

On ne crée un token de composant que si un thème a besoin de le faire varier indépendamment de la couche système (YAGNI).

#### 5.2.4 Thèmes

| Thème | Sélecteur | Contenu |
|---|---|---|
| `default` | `:root, [data-theme="default"]` | couche système claire + couche composant |
| `dark` | `[data-theme="dark"]` | couche système sombre (**réglée** séparément, pas une inversion automatique) |
| produit (ex. `finance`) | `[data-theme="finance"]` | surcharge partielle des couches système et composant ; généré dans le repo consommateur |

Fichiers produits par `ui-tokens` : `dist/css/lc-tokens.css` (référence + composants), `dist/css/theme-default.css`, `dist/css/theme-dark.css`, `dist/json/*.json`, `dist/ts/tokens.ts` (constantes typées), `dist/scss/_breakpoints.scss`.

### 5.3 API / interfaces

#### 5.3.1 CLI `lc-tokens` (paquet `@lionelcointot/ui-tokens`)

| Commande | Rôle |
|---|---|
| `lc-tokens build --theme <fichier.tokens.json> --name <nom> [--extends default\|dark] --out <fichier.css>` | Fusionne le thème produit avec la base choisie, vérifie, puis écrit `[data-theme="<nom>"] { … }` |
| `lc-tokens check --theme <fichier.tokens.json> [--extends …]` | Contrôles seuls (CI) |

Contrôles (échec = code de sortie non nul, rapport lisible) :
1. références résolues, types valides, aucun token inconnu (faute de frappe) ;
2. **contraste** des paires de `contrast-pairs.json` (ex. `on-primary`/`primary`, `on-surface`/`surface`, `on-surface-muted`/`surface`) : 4,5:1 pour le texte, 3:1 pour les bordures de contrôle et l'anneau de focus ;
3. **palette de graphiques** : bande de luminosité, saturation minimale, séparation des paires adjacentes en vision normale et simulée pour les daltoniens (ΔE OKLab ≥ 8 visé, < 6 refusé), contraste avec la surface. C'est la méthode du skill `dataviz`, réimplémentée dans la CLI.

#### 5.3.2 Types communs (`@lionelcointot/ui-angular`)

```ts
export type LcThemeColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
export type LcFillMode = 'solid' | 'outline' | 'flat';
export type LcSize = 'small' | 'medium' | 'large';
export type LcRounded = 'none' | 'small' | 'medium' | 'large' | 'full';
export type LcThemeChoice = 'auto' | 'light' | 'dark';

export interface LcUiKitOptions {
  readonly locale?: string;                 // défaut 'fr-FR'
  readonly currency?: string;               // défaut 'EUR'
  readonly defaults?: Partial<{ size: LcSize; fillMode: LcFillMode; rounded: LcRounded; themeColor: LcThemeColor }>;
  readonly themes?: { readonly light: string; readonly dark: string };   // noms data-theme ; défaut default / dark
  readonly labels?: Partial<LcLabels>;
}
export function provideLcUiKit(options?: LcUiKitOptions): EnvironmentProviders;
export const LC_DEFAULTS: InjectionToken<Required<NonNullable<LcUiKitOptions['defaults']>>>;
```

Toutes les entrées des composants sont des `input()` signaux. Une entrée non renseignée prend la valeur de `LC_DEFAULTS`.

#### 5.3.3 Services transverses

| Élément | API | Comportement |
|---|---|---|
| `LcThemeService` | `choice: Signal<LcThemeChoice>` ; `resolvedScheme: Signal<'light' \| 'dark'>` ; `setChoice(choice)` | Pose `data-theme` sur `<html>` selon le choix et `prefers-color-scheme` (écouté). Mémorise le choix dans `localStorage` (lecture et écriture protégées par `try/catch`, fonctionne sans). Signal lu par les graphiques |
| `LcFormatService` | `money(value, options?)`, `percent(value, decimals = 2)`, `number(value, decimals?)`, `date(value: string \| Date, style: 'short' \| 'long' \| 'month')`, `months(count)` (« 20 ans », « 5 ans et 3 mois ») | `Intl.NumberFormat` et `Intl.DateTimeFormat` avec la locale configurée. Les dates ISO `AAAA-MM-JJ` sont interprétées **sans fuseau** (aucun décalage d'un jour) |
| Pipes purs | `lcMoney`, `lcPercent`, `lcNumber`, `lcDate`, `lcMonths` | Délèguent à `LcFormatService` |
| `LC_LABELS` | `InjectionToken<LcLabels>` ; `LC_LABELS_FR` (défaut), `LC_LABELS_EN` | Tous les textes internes des composants (« Fermer », « Aucun résultat », « Voir les données »…). Aucun texte en dur dans un composant |
| `lc-icon` / `provideLcIcons(record)` | voir [ADR-0005](../adr/0005-icones.md) et le catalogue | |

#### 5.3.4 Conventions de développement des composants

- Standalone, `ChangeDetectionStrategy.OnPush`, zoneless ; `input()`, `output()`, `model()` ; `host: {}` pour les liaisons d'hôte ; aucun service métier injecté (skill `angular-best-practices`).
- Styles : SCSS limité aux variables CSS du composant (repli sur la couche système) ; aucune couleur, taille ou durée en dur ; `--lc-ref-*` interdit (stylelint).
- Classes d'hôte : `lc-<composant>`, `lc-<composant>--<variante>` (ex. `lc-button--solid lc-button--primary lc-button--medium`).
- Fonctionnalités CSS limitées à Baseline 2024 : `color-mix()`, `:has()`, requêtes de conteneur autorisées ; *anchor positioning* interdit (le CDK Overlay positionne).
- Fichiers par composant : `<nom>.ts`, `<nom>.scss`, `<nom>.stories.ts`, `<nom>.spec.ts`, `index.ts`, `<nom>.tokens.json` (dans `packages/tokens/src/components/`).

### 5.4 Interface utilisateur : Storybook

| Élément | Spécification |
|---|---|
| Version | Storybook 10, framework Angular (plage Angular supportée vérifiée à chaque montée) |
| Barre d'outils | Sélecteur de thème (`default`, `dark`, plus des thèmes de démonstration) qui pose `data-theme` sur toutes les stories ; sélecteur de taille par défaut ; sélecteur de langue des libellés (fr, en) |
| Stories | Par composant : `Défaut`, une story par variante (`themeColor` × `fillMode`), `Tailles`, `États` (désactivé, chargement, erreur), `Accessibilité clavier`, `Playground` (tous les contrôles) |
| Documentation | Page MDX par famille ; page **Tokens** générée depuis `ui-tokens/dist/json` (tableaux nom, valeur, aperçu) |
| Playground des tokens | Story avec sélecteurs de couleur et curseurs (rayons, espacements, tailles, police) qui modifient les variables CSS en direct, puis exportent un `*.tokens.json`. Tient lieu de Theme Builder |
| Accessibilité | `@storybook/addon-a11y` (axe), violations sérieuses bloquantes en CI |
| Tests d'interaction | `@storybook/addon-vitest` : les stories `play` servent de tests de composants |
| Tests visuels | Storybook statique + Playwright `toHaveScreenshot` sur les stories clés × thèmes `default` et `dark` ; références commitées |

## 6. Cas limites et gestion des erreurs

| Cas | Comportement |
|---|---|
| Thème produit avec contraste insuffisant | `lc-tokens build` échoue en listant les paires fautives et leurs ratios |
| Token inconnu dans un thème produit (faute de frappe) | Échec avec suggestion du token le plus proche |
| `localStorage` indisponible (navigation privée, webview restreinte) | Le choix de thème fonctionne pour la session sans être mémorisé |
| `echarts` non installé alors que `…/charts` est importé | Erreur de compilation explicite (dépendance pair) ; aucun impact sur les autres points d'entrée |
| `forced-colors` (contraste élevé Windows) | Bordures et focus conservés via `CanvasText`/`Highlight` ; graphiques en motifs ([spec graphiques](2026-11-graphiques.md)) |
| Nom d'icône inconnu | Rien n'est affiché ; avertissement console en développement |

## 7. Sécurité, performance, observabilité

- **Sécurité** :
  - aucun `innerHTML` avec du contenu fourni par l'utilisateur. Seuls les SVG d'icônes enregistrés par le code, et les info-bulles des graphiques construites avec échappement, utilisent `DomSanitizer` ;
  - la CLI ne lit que les fichiers passés en argument ;
  - dépendances auditées (`npm audit`) en CI.
- **Performance** :
  - point d'entrée principal < 15 Kio minifiés et compressés ;
  - chaque famille < 30 Kio (hors `charts` et `data-grid`) ;
  - CSS de thème < 20 Kio ;
  - aucune animation sous `prefers-reduced-motion` ;
  - budgets vérifiés en CI.
- **Observabilité** : N/A (bibliothèque). Avertissements console en développement seulement (`isDevMode()`).

## 8. Alternatives envisagées

| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Trois paquets (tokens, thèmes, composants) comme dans la discussion initiale | Séparation fine | Trois versions à publier pour un même changement | Non : thèmes de base dans `ui-tokens` |
| Un paquet unique sans points d'entrée secondaires | Simple | Impose `echarts` et `ag-grid` à tous | Non |
| Préfixe `ui-` | Lisible | Trop générique, risque de collision | Non : `lc` |
| Theme Builder dès la phase 1 | Outil visuel | Un produit à lui seul | Non : playground Storybook |
| Composants « élément hôte » partout | Uniforme | Casse la sémantique native | Non ([ADR-0002](../adr/0002-comportement-cdk-et-selecteurs.md)) |

## 9. Plan de test

- **Tokens** : tests de la CLI (fusion, références, contraste, palette, messages d'erreur) avec des thèmes de test valides et invalides ; aperçu des fichiers générés (tests de snapshot).
- **Services** : `LcFormatService` (montants `1 159,92 €` avec espace insécable, pourcentages, dates ISO sans décalage de fuseau, `months(240)` donne « 20 ans ») ; `LcThemeService` (choix, `prefers-color-scheme` simulé, absence de `localStorage`).
- **Conventions** : stylelint (`--lc-ref-*` interdit, aucune couleur littérale dans `packages/angular`), test qui vérifie que chaque composant a une story et un fichier de tokens.
- **Accessibilité** : addon a11y en CI sur toutes les stories.
- **Visuel** : captures `default` et `dark` des stories clés.

## 10. Critères d'acceptation

- [ ] `npm i @lionelcointot/ui-tokens @lionelcointot/ui-angular` + `provideLcUiKit()` + import de `theme-default.css` suffisent pour afficher un `button[lcButton]` stylé.
- [ ] Changer `data-theme` de `default` à `dark` modifie l'apparence de toutes les stories sans rechargement.
- [ ] `lc-tokens build` sur un thème dont `on-primary`/`primary` < 4,5:1 échoue et affiche le ratio mesuré.
- [ ] Aucune occurrence de `--lc-ref-` ni de couleur littérale dans `packages/angular` (stylelint en CI).
- [ ] Un projet qui n'importe pas `…/charts` n'a pas `echarts` dans son bundle.
- [ ] Storybook est publié en artefact de CI, sans violation a11y sérieuse.
- [ ] `LcFormatService.money(1159.92)` renvoie `1 159,92 €` (avec espaces insécables).

## 11. Découpage en tâches

- [ ] T1 : workspace (npm, Angular 22, ng-packagr), CI, vérification du statut d'Angular Aria et de l'interopérabilité Signal Forms / CVA (S)
- [ ] T2 : `/impeccable init` + `/impeccable document` : `PRODUCT.md`, `DESIGN.md` (direction visuelle des thèmes `default` et `dark`) (S)
- [ ] T3 : `ui-tokens` : sources DTCG (référence, système, bouton), Style Dictionary, sorties CSS, JSON, TS et SCSS (M)
- [ ] T4 : CLI `lc-tokens` (`build`, `check`, contraste, palette) (M)
- [ ] T5 : point d'entrée principal : `provideLcUiKit`, types, `LcThemeService`, `LcFormatService`, pipes, `LC_LABELS`, `lc-icon` (M)
- [ ] T6 : Storybook (thèmes, a11y, tests d'interaction, page Tokens) + `button[lcButton]` de bout en bout (M)
- [ ] T7 : tests visuels Playwright + budgets + stylelint (S)
- [ ] T8 : publication 0.1.0 (GitHub Packages, release-please) (S)
- [ ] T9 : playground des tokens (S)

## 12. Risques et questions ouvertes

- **Angular Aria** : statut à confirmer en T1 ; repli sur le CDK sans impact sur l'API.
- **Interopérabilité Signal Forms / CVA** en version 22 : à confirmer en T1 ([ADR-0002](../adr/0002-comportement-cdk-et-selecteurs.md)).
- **Retard de Storybook** sur Angular 23 : peut retarder la montée de version de tous les projets ([architecture §8.3](https://github.com/LionelCointot/finance-hub/blob/main/docs/architecture.md#83-monter-de-version-angular-ou-net)).
- **Rendu WebKitGTK** (Tauri sous Linux) : `color-mix()` et les requêtes de conteneur sont à vérifier sur la version embarquée.

## Annexe : conformité aux règles du template

| Règle (skill) | Application |
|---|---|
| Tokens centralisés, aucune valeur en dur (`frontend-guidelines`) | §5.2 et stylelint |
| Texte ≥ 16 px, cibles ≥ 44 px, contraste AA, focus visible (`frontend-guidelines`) | `font-size-md`, `control-height-md`, contrôles de la CLI, `focus-ring-*` |
| Standalone, OnPush, `input()`/`output()`, zoneless (`angular-best-practices`) | §5.3.4 |
| Pas de `innerHTML` non maîtrisé (`security-checklist`) | §7 |
| YAGNI, règle de trois (`clean-code`) | Tokens de composant à la demande ; Theme Builder reporté |
| Décisions structurantes en ADR (`spec-writer`) | ADR 0001 à 0005 |
| Couleur jamais seule, palette validée par calcul (`dataviz`) | Contrôle de palette dans la CLI |

## 13. Écarts constatés à l'implémentation (2026-11-08)

- **CSS au lieu de SCSS** : composants et feuille globale en `.css` (variables `--lc-<composant>-*` avec repli sur `--lc-sys-*`) ; la sortie SCSS des breakpoints est conservée pour les consommateurs Sass.
- **Feuille globale des directives natives** : `styles/ui-angular.css` (publiée dans le paquet) porte les styles des directives sur éléments natifs et des panneaux CDK (dialogue, menu) ; elle est à importer après les fichiers de tokens.
- **Angular Aria non retenu** (voir ADR 0002) : le comportement vient du CDK.
- **Contrôle de palette** : la CLI `lc-tokens check` ne vérifie que le **contraste** ; le contrôle de distinction pour les daltoniens n'est pas implémenté.
- **Node.js ≥ 24.15** requis par Angular CLI 22.
- **Storybook 10** : `@storybook/angular` exige `@angular-devkit/build-angular` (22.x) et `@angular/platform-browser-dynamic` ; configuration dans `.storybook/` (racine) au lieu de `apps/storybook` ; stories placées à côté des composants (`*.stories.ts`) ; sélecteur de thème (`data-theme` default/dark) et addon a11y. Le build statique (`npm run build-storybook`, sortie `dist/storybook`) est vérifié ; les tests visuels Playwright ne sont pas faits.
- **Taille de `charts`** : voir la spec graphiques.
