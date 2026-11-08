# Spec : catalogue des composants du ui-kit

- **Statut** : En revue
- **Auteur** : Lionel Cointot (rédaction assistée par Claude Code)
- **Date** : 2026-11-08
- **ADR liés** : [0002 Comportement et sélecteurs](../adr/0002-comportement-cdk-et-selecteurs.md) · [0004 Grille](../adr/0004-grille-de-donnees.md) · [0005 Icônes](../adr/0005-icones.md)
- **Specs liées** : [socle](2026-11-socle-tokens-themes.md) (tokens, API commune, Storybook) · [graphiques](2026-11-graphiques.md)

## 1. Contexte et problème

Le socle définit les tokens et l'API commune. Il reste à spécifier **chaque composant** : son sélecteur, ses entrées et sorties typées, son comportement au clavier, son accessibilité, ses tokens et sa phase de livraison. Sans cela, chaque projet réinventerait ses boutons, champs, tableaux et mises en page. Le premier consommateur est le module Crédit du simulateur immobilier, mais le catalogue reste **générique** : aucun composant ne connaît le domaine finance.

## 2. Objectifs

- Couvrir les besoins courants d'une application de gestion : actions, formulaires (dont montants, pourcentages, durées, dates), mise en page, navigation, surcouches, retours d'état, données tabulaires, indicateurs, graphiques.
- Une API cohérente : mêmes noms d'entrées partout (`themeColor`, `fillMode`, `size`, `rounded`, `disabled`, `label`).
- L'accessibilité WCAG AA et une navigation clavier complète pour chaque composant.
- Livrer par phases, dans l'ordre des besoins du module Crédit.

## 3. Hors périmètre (non-objectifs)

- Composants métier (tableau d'amortissement, formulaire de prêt) : ils vivent dans les modules.
- Éditeur de texte riche, téléversement avancé, arbre, planning, carte.
- Thèmes produits (dans les repos consommateurs).
- Les composants de la phase 5 ne sont qu'esquissés : chacun aura sa propre spec quand un projet en exprimera le besoin.

## 4. Utilisateurs et cas d'usage

| Acteur | Cas d'usage | Composants |
|---|---|---|
| Module Crédit | Formulaire d'acquisition et de prêts | `lc-form-field`, `lc-money-input`, `lc-percent-input`, `lc-number-input`, `lc-date-input`, `select[lcSelect]`, `lc-segmented-control`, `button[lcSwitch]`, `lc-card` |
| Module Crédit | Résultats | `lc-kpi-card`, `lc-alert`, `lc-tabs`, `lc-table`, `lc-description-list`, graphiques |
| Shell du hub | Mise en page et navigation | `lc-app-shell`, `lc-nav-list`, `lc-page`, `lc-segmented-control`, `lc-dialog` |
| finance-sdk | Barre de scénarios | `button[lcButton]`, `lc-menu`, `lc-dialog`, `LcToastService` |
| Tout projet | États de chargement, vide et erreur | `lc-skeleton`, `lc-spinner`, `lc-empty-state`, `lc-error-state` |

## 5. Solution proposée

### 5.1 Vue d'ensemble : catalogue et phases

| # | Élément | Sélecteur / API | Point d'entrée | Base comportementale | Phase |
|---|---|---|---|---|---|
| 1 | Bouton | `button[lcButton]`, `a[lcButton]` | `button` | natif | **P1** |
| 2 | Icône | `lc-icon`, `provideLcIcons()` | principal | SVG en ligne | **P1** |
| 3 | Groupe de boutons | `lc-button-group` | `button` | natif (`role="group"`) | P2 |
| 4 | Champ de formulaire | `lc-form-field` | `forms` | natif (`label`, `aria-describedby`) | P2 |
| 5 | Saisie texte | `input[lcInput]`, `textarea[lcInput]` | `forms` | natif | P2 |
| 6 | Saisie de montant | `lc-money-input` | `forms` | natif + formatage | P2 |
| 7 | Saisie de pourcentage | `lc-percent-input` | `forms` | natif + formatage | P2 |
| 8 | Saisie numérique avec unité | `lc-number-input` | `forms` | natif + formatage | P2 |
| 9 | Saisie de date | `lc-date-input` | `forms` | `input[type=date]` | P2 |
| 10 | Liste native | `select[lcSelect]` | `forms` | natif | P2 |
| 11 | Liste déroulante | `lc-dropdown-list` | `forms` | CDK Overlay + listbox (CDK ou Angular Aria) | P2 |
| 12 | Case à cocher | `input[type=checkbox][lcCheckbox]` | `forms` | natif | P2 |
| 13 | Groupe de boutons radio | `lc-radio-group` + `input[type=radio][lcRadio]` | `forms` | natif (`fieldset`) | P2 |
| 14 | Interrupteur | `button[lcSwitch]` | `forms` | natif (`role="switch"`) | P2 |
| 15 | Contrôle segmenté | `lc-segmented-control` | `forms` | radiogroup, focus itinérant (CDK `FocusKeyManager`) | P2 |
| 16 | Coquille d'application | `lc-app-shell` | `layout` | CDK `FocusTrap` (tiroir) | P3 |
| 17 | Page | `lc-page` | `layout` | — | P3 |
| 18 | Pile | `lc-stack` | `layout` | CSS flex | P3 |
| 19 | Grille de mise en page | `lc-grid`, `lc-grid-item` | `layout` | CSS grid + requêtes de conteneur | P3 |
| 20 | Carte | `lc-card`, `lc-card-header` | `layout` | — | P3 |
| 21 | Séparateur | `lc-divider` | `layout` | `hr` / `role="separator"` | P3 |
| 22 | Onglets | `lc-tabs`, `lc-tab` | `navigation` | Angular Aria tabs, sinon CDK `FocusKeyManager` | P3 |
| 23 | Liste de navigation | `lc-nav-list`, `a[lcNavItem]` | `navigation` | natif + `RouterLinkActive` | P3 |
| 24 | Menu | `lc-menu`, `[lcMenuTriggerFor]`, `button[lcMenuItem]` | `navigation` | CDK Menu | P3 |
| 25 | Dialogue | `LcDialogService`, `lc-dialog` | `overlay` | CDK Dialog | P3 |
| 26 | Info-bulle | `[lcTooltip]` | `overlay` | CDK Overlay | P3 |
| 27 | Alerte | `lc-alert` | `feedback` | natif | P3 |
| 28 | Toast | `LcToastService`, `lc-toast-outlet` | `feedback` | CDK `LiveAnnouncer` | P3 |
| 29 | Badge | `lc-badge` | `feedback` | — | P3 |
| 30 | Indicateur de chargement | `lc-spinner` | `feedback` | — | P3 |
| 31 | Barre de progression | `lc-progress-bar` | `feedback` | `role="progressbar"` | P3 |
| 32 | Squelette | `lc-skeleton` | `feedback` | — | P3 |
| 33 | État vide | `lc-empty-state` | `feedback` | — | P3 |
| 34 | État d'erreur | `lc-error-state` | `feedback` | — | P3 |
| 35 | Tableau | `lc-table` | `data` | CDK Table | P3 |
| 36 | Liste de définitions | `lc-description-list` | `data` | `dl` natif | P3 |
| 37 | Carte indicateur (KPI) | `lc-kpi-card` | `data` | — | P3 |
| 38 à 43 | Graphiques | `lc-chart`, `lc-line-chart`, `lc-area-chart`, `lc-bar-chart`, `lc-segmented-bar`, `lc-sparkline` | `charts` | ECharts 6 | **P4** ([spec](2026-11-graphiques.md)) |
| 44 | Grille de données | `lc-data-grid` | `data-grid` | AG Grid Community | P5 (à la demande) |
| 45 | Liste filtrable | `lc-combobox` | `forms` | Angular Aria combobox | P5 (à la demande) |
| 46 | Sélection multiple | `lc-multi-select` | `forms` | CDK listbox | P5 (à la demande) |
| 47 | Calendrier | `lc-date-picker` | `forms` | CDK Overlay + grille | P5 (à la demande) |

### 5.2 Modèle de données (types partagés)

```ts
export type LcSpace = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16';   // → --lc-sys-space-*
export type LcValueFormat = 'money' | 'percent' | 'number' | 'integer' | 'date' | 'text' | ((value: unknown) => string);
export interface LcOption<T> { readonly value: T; readonly label: string; readonly icon?: string; readonly disabled?: boolean; }
export type LcStatusKind = 'info' | 'success' | 'warning' | 'error';

export interface LcTableColumn<T> {
  readonly id: string;
  readonly header: string;
  readonly value: (row: T) => unknown;
  readonly format?: LcValueFormat;            // défaut 'text'
  readonly align?: 'start' | 'center' | 'end';// défaut 'end' pour money/percent/number/integer, sinon 'start'
  readonly sortable?: boolean;
  readonly width?: string;                    // ex. '8rem'
  readonly sticky?: 'start' | 'end';
}
export interface LcTableGrouping<T> {
  readonly key: (row: T) => string;
  readonly label: (key: string, rows: readonly T[]) => string;
  readonly summary?: (rows: readonly T[]) => Readonly<Record<string, unknown>>;   // valeurs par colonne
  readonly initiallyExpanded?: boolean;       // défaut false
}
export interface LcSort { readonly columnId: string; readonly direction: 'asc' | 'desc'; }
export interface LcDescriptionItem {
  readonly term: string;
  readonly value: unknown;
  readonly format?: LcValueFormat;
  readonly detail?: string;
  readonly emphasis?: boolean;                // ligne de total
  readonly badge?: string;                    // ex. « estimation »
}
export interface LcKpiDelta {
  readonly value: number;
  readonly format: LcValueFormat;
  readonly trend: 'up' | 'down' | 'flat';
  readonly sentiment: 'positive' | 'negative' | 'neutral';
}
```

### 5.3 API par composant

Conventions de lecture :
- les entrées sont des `input()` signaux ; « model » signale un `model()` bidirectionnel ;
- une valeur absente prend `LC_DEFAULTS` ;
- tous les libellés internes viennent de `LC_LABELS`.

#### 5.3.1 Actions

**`button[lcButton]`, `a[lcButton]`** (`LcButtonDirective`)

| Entrée | Type | Défaut | Rôle |
|---|---|---|---|
| `themeColor` | `LcThemeColor` | `primary` | couleur de rôle |
| `fillMode` | `LcFillMode` | `solid` | plein, contour ou plat |
| `size` | `LcSize` | `medium` | hauteur `control-height-*` |
| `rounded` | `LcRounded` | `medium` | rayon |
| `loading` | `boolean` | `false` | indicateur en CSS, `aria-busy="true"`, clics ignorés, largeur conservée |
| `iconOnly` | `boolean` | `false` | bouton carré ; `aria-label` obligatoire (avertissement en développement s'il manque) |
| `fullWidth` | `boolean` | `false` | 100 % de la largeur |

- L'état désactivé passe par l'attribut natif `disabled`, ou par `aria-disabled="true"` sur un lien (clic bloqué).
- Les icônes sont projetées : `<button lcButton><lc-icon name="plus" /> Ajouter un prêt</button>`.
- Tokens : `--lc-button-*` ([socle §5.2.3](2026-11-socle-tokens-themes.md#523-couche-composant)).
- Clavier : natif.

**`lc-button-group`** : entrées `ariaLabel` (obligatoire), `attached: boolean` (bordures jointes). Rendu `role="group"`.

#### Icônes

**`lc-icon`** : entrées `name: string` (obligatoire), `size: LcSize | 'inherit'` (défaut `inherit`), `label?: string`. Sans `label`, l'icône est décorative (`aria-hidden="true"`) ; avec un `label`, elle porte `role="img"` et `aria-label`.

**`provideLcIcons(icons: Readonly<Record<string, string>>)`** ajoute ou remplace des icônes (chaînes SVG constantes).

Jeu par défaut (Lucide, ISC) : `check`, `x`, `chevron-down`, `chevron-up`, `chevron-left`, `chevron-right`, `plus`, `minus`, `pencil`, `copy`, `trash-2`, `save`, `folder-open`, `download`, `upload`, `search`, `info`, `circle-check`, `circle-alert`, `triangle-alert`, `circle-x`, `menu`, `ellipsis-vertical`, `settings`, `sun`, `moon`, `monitor`, `calendar`, `table`, `chart-line`, `eye`, `eye-off`, `external-link`, `rotate-ccw`, `house`, `landmark`, `calculator`.

#### 5.3.2 Formulaires

Tous les contrôles composites implémentent `FormValueControl<T>` (Signal Forms) et, si nécessaire, `ControlValueAccessor` ([ADR-0002](../adr/0002-comportement-cdk-et-selecteurs.md)). Entrées communes : `disabled`, `readonly`, `size`, `fillMode`, `rounded`, `invalid` (forcé ; sinon déduit de l'état du formulaire).

**`lc-form-field`**

| Entrée | Type | Rôle |
|---|---|---|
| `label` | `string` (obligatoire) | `<label for>` relié au contrôle projeté |
| `hint` | `string?` | aide sous le champ, reliée par `aria-describedby` |
| `errors` | `readonly string[]` | messages affichés sous le champ, reliés par `aria-describedby` ; non vide donne `aria-invalid="true"` |
| `required` | `boolean` | marque visuelle + `aria-required` |
| `layout` | `'stacked' \| 'inline'` | libellé au-dessus ou à gauche (≥ `md`) |

- Emplacements : `[lcPrefix]`, `[lcSuffix]` (ex. « € », « mois »).
- Le contrôle projeté s'enregistre auprès du champ par le jeton `LC_FORM_FIELD_CONTROL` (identifiants générés, aucun identifiant à fournir).

**`input[lcInput]`, `textarea[lcInput]`** : entrées `size`, `invalid`. Style des états survolé, focus, désactivé, invalide et lecture seule. Le `textarea` accepte `autoResize: boolean`.

**`lc-money-input`**, **`lc-percent-input`**, **`lc-number-input`** (base interne commune `LcNumericInputBase`)

| Entrée | `money` | `percent` | `number` |
|---|---|---|---|
| `value` (model) | `number \| null` | `number \| null` (3.5 = 3,5 %) | `number \| null` |
| `decimals` | 2 | 2 (le crédit utilise 3 pour les taux) | 0 |
| `min` / `max` | `number?` | `number?` | `number?` |
| `unit` | devise des options (affichée « € ») | « % » | `string?` (ex. « mois ») |
| `showStepper` | — | — | `boolean` (boutons − et + avec `aria-label`) |
| `step` | — | 0,05 | 1 |

Comportement commun :
- `inputmode="decimal"` (ou `numeric` si `decimals = 0`) ;
- **hors focus**, la valeur est formatée en français (`250 000`) ; **au focus**, elle s'affiche en clair pour l'édition ;
- virgule et point sont acceptés comme séparateur décimal ; les espaces sont ignorés ;
- un collage de `« 250 000,50 € »` est analysé ;
- les lettres sont refusées ;
- arrondi à `decimals` à la sortie du champ ;
- hors bornes, la valeur est conservée et l'erreur signalée par la validation du formulaire (pas de correction silencieuse) ;
- `null` si le champ est vide ;
- flèches haut et bas = ± `step` (`number` et `percent`).

**`lc-date-input`** : valeur (model) `string | null` au **format ISO `AAAA-MM-JJ`** (aucun objet `Date`, donc aucun décalage de fuseau, cohérent avec `DateOnly` côté .NET). Entrées `min`, `max` (ISO). S'appuie sur `input[type=date]`, natif et accessible. Le calendrier personnalisé est reporté à `lc-date-picker` (P5).

**`select[lcSelect]`** : liste native stylée, pour les listes courtes et fixes (`<option>` natives). Entrées `size`, `invalid`.

**`lc-dropdown-list<T>`**

| Entrée / sortie | Type | Rôle |
|---|---|---|
| `data` | `readonly T[]` (obligatoire) | éléments |
| `textField` | `keyof T \| ((item: T) => string)` | libellé (défaut : l'élément lui-même) |
| `valueField` | `keyof T \| ((item: T) => unknown)` | valeur (défaut : l'élément) |
| `value` (model) | `unknown \| null` | valeur sélectionnée |
| `placeholder` | `string?` | texte sans sélection |
| `opened` / `closed` | `output<void>` | ouverture et fermeture |

- Gabarit d'élément : `<ng-template lcDropdownItem let-item>`.
- Clavier :
  - Entrée, Espace ou Alt+Bas ouvrent ;
  - les flèches, Début et Fin déplacent ;
  - la frappe de lettres va au premier élément correspondant ;
  - Entrée sélectionne ; Échap ferme et rend le focus ; Tab ferme.
- ARIA : déclencheur avec `aria-haspopup="listbox"` et `aria-expanded`, `role="listbox"`, `aria-activedescendant`, `aria-selected`.
- Surcouche CDK positionnée sous le déclencheur ou au-dessus s'il manque de place ; largeur au moins celle du déclencheur.

**`input[type=checkbox][lcCheckbox]`** : entrée `indeterminate: boolean`. Le libellé est un `<label>` natif autour ou à côté.

**`lc-radio-group`** + **`input[type=radio][lcRadio]`** : `lc-radio-group` rend un `<fieldset>` et un `<legend>` (entrée `legend`, obligatoire), plus `orientation`. Valeur gérée par le formulaire (`name` commun généré).

**`button[lcSwitch]`** : valeur (model) `checked: boolean` (`FormValueControl<boolean>`). `role="switch"`, `aria-checked`. Libellé par le contenu ou `aria-label`. Espace et Entrée basculent.

**`lc-segmented-control<T>`** : entrées `options: readonly LcOption<T>[]` (obligatoire), valeur (model) `T`, `ariaLabel` (obligatoire), `size`, `fullWidth`. Sémantique `role="radiogroup"` et `role="radio"`. Focus itinérant : les flèches changent la sélection, Tab sort du groupe. Usage : type de prêt, vue Cumul / prêt, choix du thème.

#### 5.3.3 Mise en page

**`lc-app-shell`**

| Entrée | Type | Rôle |
|---|---|---|
| `navMode` | `'auto' \| 'side' \| 'drawer'` | `auto` : latéral ≥ 1024 px, tiroir en dessous |
| `navOpen` (model) | `boolean` | tiroir ouvert |
| `navCollapsed` (model) | `boolean` | navigation latérale réduite aux icônes |
| `navLabel` | `string` | `aria-label` de `<nav>` |

- Emplacements : `[lcShellHeader]`, `[lcShellNav]`, contenu principal.
- Rendu : `<header>`, `<nav>`, `<main id="lc-main" tabindex="-1">` et un lien d'évitement « Aller au contenu » en premier élément focusable.
- Le tiroir piège le focus (CDK `FocusTrap`), se ferme sur Échap et rend le focus au bouton de menu.

**`lc-page`** : entrées `title` (rendu en `<h1>`), `description?`. Emplacements `[lcPageActions]`, `[lcPageToolbar]` et le contenu. Marges et largeur maximale issues des tokens.

**`lc-stack`** : entrées `direction: 'vertical' | 'horizontal'` (défaut vertical), `gap: LcSpace` (défaut `'4'`), `align`, `justify`, `wrap: boolean`.

**`lc-grid`** / **`lc-grid-item`** :
- `lc-grid` : entrées `columns: number | Partial<Record<'sm' | 'md' | 'lg' | 'xl', number>>`, `gap: LcSpace` ;
- `lc-grid-item` : entrée `span: number | Partial<Record<'sm' | 'md' | 'lg' | 'xl', number>>` ;
- la réactivité s'appuie sur des **requêtes de conteneur** : un module embarqué s'adapte à la place qu'on lui donne, pas à la fenêtre.

**`lc-card`** : entrées `elevation: 0 | 1 | 2`, `padding: LcSpace`, `collapsible: boolean`, `expanded` (model). Emplacements `lc-card-header` (entrées `title`, `subtitle?` ; emplacement `[lcCardActions]`), contenu, `[lcCardFooter]`. Si `collapsible`, l'en-tête devient un bouton (`aria-expanded`, `aria-controls`).

**`lc-divider`** : entrée `orientation: 'horizontal' | 'vertical'`.

#### 5.3.4 Navigation

**`lc-tabs`** / **`lc-tab`**
- `lc-tabs` : entrées `selected` (model, identifiant de l'onglet), `activation: 'automatic' | 'manual'` (défaut automatique), `ariaLabel` ;
- `lc-tab` : entrées `id`, `label`, `disabled`, `icon?` ; contenu paresseux par `<ng-template lcTabContent>`.
- ARIA : `tablist`, `tab`, `tabpanel`, `aria-selected`, `aria-controls`.
- Clavier : flèches gauche et droite, Début, Fin.

**`lc-nav-list`** / **`a[lcNavItem]`** : entrées de l'élément `icon`, `badge?`. L'élément actif (`RouterLinkActive`) reçoit `aria-current="page"`. En mode réduit, seule l'icône est visible et le libellé passe en info-bulle.

**`lc-menu`**, **`[lcMenuTriggerFor]`**, **`button[lcMenuItem]`** : construits sur CDK Menu. `button[lcMenuItem]` accepte `icon?`, `destructive: boolean`, `disabled`. Les séparateurs passent par `lc-divider`.
- ARIA : `menu`, `menuitem`.
- Clavier : flèches, Début, Fin, frappe de lettres, Échap (rend le focus au déclencheur).

#### 5.3.5 Surcouches

**`LcDialogService`**

```ts
export interface LcDialogConfig<D> {
  readonly data?: D;
  readonly size?: 'small' | 'medium' | 'large' | 'fullscreen';   // défaut medium
  readonly dismissible?: boolean;                                  // Échap et clic sur le fond ; défaut true
  readonly ariaLabel?: string;                                     // sinon le titre de lc-dialog
}
export interface LcConfirmOptions {
  readonly title: string; readonly message: string;
  readonly confirmLabel?: string; readonly cancelLabel?: string;   // défaut LC_LABELS
  readonly destructive?: boolean;                                  // bouton de confirmation themeColor="error"
}
export class LcDialogService {
  open<C, D = unknown, R = unknown>(component: Type<C>, config?: LcDialogConfig<D>): LcDialogRef<R>;
  confirm(options: LcConfirmOptions): Promise<boolean>;
}
export class LcDialogRef<R> { close(result?: R): void; readonly closed: Promise<R | undefined>; }
export const LC_DIALOG_DATA: InjectionToken<unknown>;
```

- `lc-dialog` (mise en page) : entrée `title`, contenu, emplacement `[lcDialogActions]` (bouton principal à droite).
- Repose sur CDK Dialog : `aria-modal`, focus piégé puis restauré, premier élément focusable ciblé.

**`[lcTooltip]`** : entrées `lcTooltip: string`, `lcTooltipPosition: 'above' | 'below' | 'start' | 'end'` (défaut `above`). L'info-bulle apparaît au survol et au focus après 500 ms, disparaît sur Échap ou à la sortie, et est reliée par `aria-describedby`. **Elle ne porte jamais d'information indispensable**, car elle est inaccessible au toucher.

#### 5.3.6 Retours d'état

**`lc-alert`** : entrées `kind: LcStatusKind`, `title?`, `dismissible`, `live: boolean` (insertion dynamique : `role="alert"` pour `warning` et `error`, `role="status"` sinon). Sortie `dismissed`. Il y a **toujours une icône et un texte** (jamais la couleur seule).

**`LcToastService`** + **`lc-toast-outlet`**

```ts
export interface LcToastOptions {
  readonly kind: LcStatusKind;
  readonly message: string;
  readonly action?: { readonly label: string; readonly run: () => void };
  readonly durationMs?: number;    // défaut 5000 ; ignoré pour 'error' (reste jusqu'à fermeture)
}
export class LcToastService { show(options: LcToastOptions): void; dismissAll(): void; }
```

Au plus 3 toasts visibles. Le minuteur se met en pause au survol et au focus. Annonce par `LiveAnnouncer` (polie, ou assertive pour les erreurs).

**`lc-badge`** : entrées `themeColor`, `fillMode` (défaut `flat`), `size`. Contenu texte.

**`lc-spinner`** : entrées `size`, `label` (défaut « Chargement »), rendu en texte masqué visuellement avec `role="status"`. Aucune rotation sous `prefers-reduced-motion` (pulsation d'opacité à la place).

**`lc-progress-bar`** : entrée `value: number | null` (0 à 100 ; `null` = indéterminée), `label`. `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.

**`lc-skeleton`** : entrées `shape: 'text' | 'rect' | 'circle'`, `lines: number` (texte), `width`, `height`. `aria-hidden="true"`. Animation désactivée sous `prefers-reduced-motion`.

**`lc-empty-state`** : entrées `icon?`, `title`, `description?`. Emplacement `[lcEmptyActions]`.

**`lc-error-state`** : entrées `title`, `description?`, `retryLabel?` (défaut « Réessayer »). Sortie `retry`. Emplacement `[lcErrorDetails]` (détail technique repliable, ex. `traceId`).

#### 5.3.7 Données

**`lc-table<T>`**

| Entrée / sortie | Type | Rôle |
|---|---|---|
| `data` | `readonly T[]` (obligatoire) | lignes |
| `columns` | `readonly LcTableColumn<T>[]` (obligatoire) | colonnes |
| `trackBy` | `(row: T) => unknown` (obligatoire) | identité stable |
| `caption` | `string` (obligatoire) | `<caption>` |
| `captionHidden` | `boolean` | légende masquée visuellement mais lue |
| `groupBy` | `LcTableGrouping<T>?` | groupes repliables avec sous-totaux |
| `footer` | `Readonly<Record<string, unknown>>?` | ligne de totaux |
| `sort` (model) | `LcSort \| null` | tri côté client, stable |
| `stickyHeader` | `boolean` | en-tête collant |
| `density` | `'comfortable' \| 'compact'` | hauteur des lignes |
| `emptyMessage` | `string?` | défaut `LC_LABELS.noData` |
| `groupToggled` | `output<{ key: string; expanded: boolean }>` | |

- Gabarit de cellule : `<ng-template lcCell="<columnId>" let-row>`.
- Rendu : `<table>` natif sur CDK Table, `<th scope="col">`, `aria-sort` sur la colonne triée (bouton dans le `th`).
- Les nombres sont alignés à droite en chiffres tabulaires.
- Défilement horizontal limité au conteneur du tableau, avec une première colonne collante.
- Groupes : la ligne d'en-tête du groupe contient un bouton `aria-expanded` et les sous-totaux.
- **Limite** : 2 000 lignes affichées, sans virtualisation ([ADR-0004](../adr/0004-grille-de-donnees.md)) ; au-delà, utiliser `lc-data-grid`.

**`lc-description-list`** : entrées `items: readonly LcDescriptionItem[]` (obligatoire), `layout: 'stacked' | 'inline'`. Rendu `<dl>`, `<dt>`, `<dd>`. Une ligne `emphasis` (total) est en gras, séparée par un trait. Un `badge` s'affiche à côté du terme.

**`lc-kpi-card`**

| Entrée | Type | Rôle |
|---|---|---|
| `label` | `string` (obligatoire) | intitulé |
| `value` | `number \| null` | valeur (« — » si `null`) |
| `format` | `LcValueFormat` | formatage de la valeur |
| `delta` | `LcKpiDelta?` | variation : icône de tendance + signe + texte (jamais la couleur seule) |
| `hint` | `string?` | précision (ex. « indicatif ») |
| `loading` | `boolean` | squelette |
| `stale` | `boolean` | valeur atténuée (recalcul en cours) |

- Emplacement `[lcKpiVisual]` pour une `lc-sparkline` fournie par le consommateur. Cela évite toute dépendance du point d'entrée `data` vers `charts`.
- La valeur principale utilise des chiffres proportionnels ; les chiffres tabulaires sont réservés aux colonnes (règle `dataviz`).

#### 5.3.8 Graphiques

Voir la [spec graphiques](2026-11-graphiques.md) : `lc-chart` (porte de sortie ECharts), `lc-line-chart`, `lc-area-chart`, `lc-bar-chart`, `lc-segmented-bar` (part d'un tout, à la place du donut), `lc-sparkline`.

#### 5.3.9 Phase 5 (à la demande, spec dédiée le moment venu)

| Élément | Esquisse |
|---|---|
| `lc-data-grid` | Enveloppe AG Grid Community : entrées `rowData`, `columnDefs` (types AG Grid), `theme` dérivé des tokens ; filtres, redimensionnement, virtualisation, export CSV |
| `lc-combobox` | Liste filtrable (Angular Aria combobox) ; filtrage local ou par fonction asynchrone |
| `lc-multi-select` | Sélection multiple avec puces ; CDK listbox `multiple` |
| `lc-date-picker` | Calendrier dans une surcouche, grille de jours (navigation clavier), valeur ISO |

### 5.4 Interface utilisateur

Chaque composant a ses stories selon le [socle §5.4](2026-11-socle-tokens-themes.md#54-interface-utilisateur--storybook) : `Défaut`, variantes, tailles, états, clavier, playground. Les décisions visuelles (densité, ombres, rayons, ton des libellés) sont prises avec `/impeccable shape` sur chaque famille avant implémentation, puis validées par `/impeccable critique` et `/impeccable audit`.

## 6. Cas limites et gestion des erreurs

| Composant | Cas | Comportement |
|---|---|---|
| `lc-money-input` | Saisie « 1.234,5 » | Interprété comme 1 234,5 (le dernier séparateur est décimal) ; affiché `1 234,50` hors focus |
| `lc-money-input` | Collage de texte non numérique | Refusé, valeur inchangée |
| `lc-date-input` | Navigateur sans sélecteur natif | Saisie texte au format de la locale, analysée et validée en ISO |
| `lc-dropdown-list` | `data` vide | Liste avec `LC_LABELS.noData`, déclencheur actif |
| `lc-table` | Plus de 2 000 lignes | Avertissement console en développement ; affichage tronqué avec mention « 2 000 premières lignes » |
| `lc-table` | Colonne `sortable` avec des valeurs mixtes | Tri : nombres < textes < valeurs nulles, ordre stable |
| `lc-dialog` | Ouverture depuis un dialogue | Empilement géré par CDK Dialog ; Échap ferme le plus haut |
| `button[lcButton]` | `iconOnly` sans `aria-label` | Avertissement console en développement ; échec du test a11y |
| `lc-icon` | Nom inconnu | Rien n'est rendu ; avertissement en développement |
| `lc-toast` | Plus de 3 toasts | Le plus ancien qui n'est pas une erreur est retiré |
| Tous | Texte très long (libellés, valeurs) | Retour à la ligne pour les libellés ; points de suspension + info-bulle dans les cellules étroites |

## 7. Sécurité, performance, observabilité

- **Sécurité** :
  - tout contenu est rendu par interpolation Angular ;
  - `innerHTML` est réservé aux SVG d'icônes enregistrés par le code (constantes) ;
  - aucun composant n'exécute de contenu fourni par l'utilisateur ;
  - `a[lcButton]` avec `target="_blank"` reçoit `rel="noopener noreferrer"`.
- **Performance** :
  - `OnPush` et signaux partout ;
  - `lc-table` : 2 000 lignes rendues en moins de 150 ms (mesure Storybook), groupes repliés par défaut ;
  - surcouches créées à la demande ;
  - contenu des onglets paresseux.
- **Observabilité** : N/A ; avertissements en développement seulement.

## 8. Alternatives envisagées

| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| `lc-datepicker` personnalisé dès la P2 | Rendu identique partout | Coûteux, accessibilité délicate ; le natif suffit au besoin | Non (P5) |
| Colonnes de tableau déclarées par gabarits uniquement | Très flexible | Verbeux pour les cas simples | Non : configuration + gabarits optionnels |
| Sparkline intégrée à `lc-kpi-card` | Pratique | Couple `data` à `charts` (et donc à ECharts) | Non : emplacement projeté |
| Toasts pour les erreurs de validation | Visible | Éloigné du champ, contraire aux règles d'accessibilité | Non : erreurs sous le champ |
| Une seule saisie numérique paramétrable | Moins de composants | API confuse (devise, %, unités) | Non : trois composants sur une base commune |

## 9. Plan de test

Pour chaque composant :
- **Unitaires** (Vitest, sans TestBed pour la logique pure) : analyse et formatage des saisies numériques (tableau de cas : « 250 000 », « 250000,5 », « 1.234,5 », collage avec « € »), tri du tableau, groupement, calcul des sous-totaux.
- **Composant** (TestBed, `fixture.componentRef.setInput`) : DOM et rôles ARIA, liaison `label` / `aria-describedby`, états (désactivé, invalide, chargement).
- **Clavier** : stories `play` (addon Vitest) pour chaque schéma de touches du §5.3.
- **Accessibilité** : axe (addon a11y), sans violation sérieuse.
- **Visuel** : captures `default` et `dark` des stories clés.
- **Formulaires** : chaque contrôle composite fonctionne avec Signal Forms (et avec les formulaires réactifs si la CVA est présente).

## 10. Critères d'acceptation

- [ ] **P1** : `button[lcButton]` (3 `fillMode` × 6 `themeColor` × 3 tailles + chargement + désactivé) et `lc-icon` sont publiés en 0.1.0, avec stories et tests verts.
- [ ] **P2** : le formulaire de prêt du module Crédit peut être construit **uniquement** avec des composants du catalogue, au clavier seul, avec les erreurs serveur affichées sous les champs.
- [ ] **P2** : `lc-money-input` affiche `250 000 €` hors focus et renvoie `250000` (nombre).
- [ ] **P3** : `lc-table` affiche 420 lignes groupées en 35 années, avec sous-totaux, total et tri, sans violation a11y.
- [ ] **P3** : `lc-app-shell` offre un lien d'évitement, un tiroir qui piège le focus sous 1024 px, et `aria-current` sur l'élément actif.
- [ ] Toutes phases : chaque composant a sa story, son fichier de tokens, des tests de composant et de clavier, et aucune valeur visuelle en dur.

## 11. Découpage en tâches

- [ ] P1 : `lcButton`, `lc-icon` + jeu par défaut (S) : livré avec le socle (T6)
- [ ] P2-a : `lc-form-field`, `lcInput`, `lcSelect`, `lcCheckbox`, `lc-radio-group`, `lcSwitch` (M)
- [ ] P2-b : `LcNumericInputBase`, `lc-money-input`, `lc-percent-input`, `lc-number-input` (M)
- [ ] P2-c : `lc-date-input`, `lc-segmented-control`, `lc-button-group` (S)
- [ ] P2-d : `lc-dropdown-list` (M)
- [ ] P3-a : `lc-app-shell`, `lc-page`, `lc-stack`, `lc-grid`, `lc-card`, `lc-divider` (M)
- [ ] P3-b : `lc-tabs`, `lc-nav-list`, `lc-menu` (M)
- [ ] P3-c : `LcDialogService`, `lc-dialog`, `lcTooltip` (M)
- [ ] P3-d : `lc-alert`, `LcToastService`, `lc-badge`, `lc-spinner`, `lc-progress-bar`, `lc-skeleton`, `lc-empty-state`, `lc-error-state` (M)
- [ ] P3-e : `lc-table` (L)
- [ ] P3-f : `lc-description-list`, `lc-kpi-card` (S)
- [ ] P4 : graphiques ([spec](2026-11-graphiques.md))
- [ ] P5 : à la demande

## 12. Risques et questions ouvertes

- **`input[type=date]`** : rendu différent entre WebView2, WKWebView et WebKitGTK. Acceptable en v1 ; `lc-date-picker` s'il est jugé gênant.
- **Angular Aria** : si son statut n'est pas stable en v22, `lc-tabs` et `lc-dropdown-list` s'appuient sur le CDK (`FocusKeyManager`, `cdk/listbox`), sans changement d'API.
- **Saisie numérique localisée** : les cas ambigus (« 1.234 ») sont tranchés par règle. À valider par des tests utilisateurs informels.
- **Dimension du catalogue** : 37 éléments jusqu'à la P3. Le rythme de livraison doit suivre les besoins réels du module Crédit (ne pas livrer de composant sans consommateur).

## Annexe : conformité aux règles du template

| Règle (skill) | Application |
|---|---|
| HTML sémantique, jamais de `div` cliquable (`frontend-guidelines`) | Sélecteurs d'attribut sur les éléments natifs ; `table`, `dl`, `fieldset`, `nav`, `main` |
| Navigation clavier complète, focus visible (`frontend-guidelines`) | Schéma de touches par composant (§5.3), anneau de focus via les tokens |
| Erreurs liées au champ (`aria-describedby`) (`frontend-guidelines`) | `lc-form-field` |
| Couleur jamais seule (`frontend-guidelines`, `dataviz`) | Alertes, badges et deltas avec icône et texte |
| Montants au format français, alignés à droite, chiffres tabulaires (`frontend-guidelines`) | `LcFormatService`, `lc-table` |
| Composants de présentation sans service métier ; `input()`/`output()` (`angular-best-practices`) | Tout le catalogue |
| YAGNI (`clean-code`) | P5 à la demande ; pas de composant sans consommateur |
