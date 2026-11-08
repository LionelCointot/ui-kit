# Spec : graphiques du ui-kit (point d'entrée `charts`, Apache ECharts 6)

- **Statut** : Implémentée (écarts constatés en fin de document)
- **Auteur** : Lionel Cointot (rédaction assistée par Claude Code, règles issues du skill `dataviz`)
- **Date** : 2026-11-08
- **ADR liés** : [0001 Tokens](../adr/0001-design-tokens.md) · [0003 Graphiques ECharts](../adr/0003-bibliotheque-graphiques-echarts.md)
- **Specs liées** : [socle](2026-11-socle-tokens-themes.md) · [catalogue](2026-11-catalogue-composants.md)

## 1. Contexte et problème

Les projets doivent montrer des évolutions (capital restant dû), des compositions (intérêts, capital, assurance par année), des parts d'un tout (coût d'une opération) et des tendances compactes (indicateurs). Les graphiques doivent :
- suivre les thèmes (clair, sombre, produit) comme le reste de l'interface ;
- rester lisibles pour les personnes daltoniennes, à l'impression et en contraste élevé ;
- ne jamais transmettre une information par la seule couleur.

ECharts 6 est retenu ([ADR-0003](../adr/0003-bibliotheque-graphiques-echarts.md)). Cette spec fixe l'API, les règles visuelles et l'intégration aux tokens.

## 2. Objectifs

- Six éléments : `lc-chart` (porte de sortie), `lc-line-chart`, `lc-area-chart`, `lc-bar-chart`, `lc-segmented-bar`, `lc-sparkline`.
- Un modèle de données typé, indépendant d'ECharts.
- Un thème dérivé des tokens `--lc-sys-chart-*`, réappliqué au changement de thème.
- Les règles `dataviz` intégrées par construction :
  - ordre fixe des couleurs ;
  - un seul axe des valeurs ;
  - légende et étiquettes directes ;
  - info-bulles ;
  - vue tableau ;
  - motifs pour l'accessibilité.
- Une palette **validée par calcul** au build (CLI `lc-tokens`).

## 3. Hors périmètre (non-objectifs)

- Camembert et donut : volontairement absents (la barre segmentée les remplace). Ils restent possibles via `lc-chart` pour un besoin exceptionnel.
- **Graphique à deux axes des valeurs** : interdit (deux mesures = deux graphiques).
- Cartes, nuages de points de plus de 3 séries, 3D, temps réel, zoom et sélection de plage (spec ultérieure si besoin).
- Export d'image (l'export de données passe par la vue tableau ou le CSV des modules).

## 4. Utilisateurs et cas d'usage

| Acteur | Besoin | Forme retenue |
|---|---|---|
| Module Crédit | Capital restant dû dans le temps, par prêt | `lc-area-chart` empilé (la somme = le total) |
| Module Crédit | Répartition annuelle intérêts / capital / assurance | `lc-bar-chart` empilé, une barre par année |
| Module Crédit | Composition du coût de l'opération | `lc-segmented-bar` haute (au plus 6 parts) |
| Tout projet | Tendance compacte dans un indicateur | `lc-sparkline` dans `lc-kpi-card` |
| Tout projet | Évolution d'une ou plusieurs mesures | `lc-line-chart` |
| Cas exceptionnel | Type non couvert | `lc-chart` avec des options ECharts brutes (thème appliqué) |

## 5. Solution proposée

### 5.1 Vue d'ensemble de l'architecture

```
packages/angular/charts/
  provide-lc-charts.ts        # provideLcCharts(options) : moteur de rendu, motifs
  echarts-registry.ts         # import fin : echarts/core + LineChart, BarChart, CustomChart, Grid, Tooltip, Legend, Aria, SVGRenderer, CanvasRenderer
  theme/
    chart-theme.service.ts    # LcChartThemeService : tokens CSS → LcChartTheme (signal)
  builders/                   # fonctions PURES : (données, options, thème, format) → option ECharts (internes, testées)
    line.builder.ts  area.builder.ts  bar.builder.ts  segmented-bar.builder.ts  sparkline.builder.ts
    shared/ axes.ts  legend.ts  tooltip.ts  palette.ts  escape-html.ts  decal.ts
  base/
    chart-host.component.ts   # cycle de vie ECharts : init, setOption, ResizeObserver, dispose, clavier
    chart-frame.component.ts  # titre, description, légende HTML, bouton « Voir les données », tableau, états
  line-chart/ area-chart/ bar-chart/ segmented-bar/ sparkline/ chart/
```

Chaîne de rendu :

```
données (input) ─┐
options (input) ─┼─► computed(builder(données, options, thème, format)) ─► chart-host.setOption()
thème (signal) ──┘         ▲
LcThemeService.resolvedScheme / data-theme ─► LcChartThemeService relit les tokens CSS
ResizeObserver ─► resize()   ·   destruction ─► dispose()   ·   largeur nulle (onglet caché) ─► init différé
```

### 5.2 Modèle de données

#### 5.2.1 Types publics

```ts
export type LcChartValue = number | null;                     // null = trou (aucune interpolation)
export type LcColorSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface LcChartSeries {
  readonly id: string;                 // identité stable : la couleur suit l'entité, jamais son rang
  readonly label: string;              // donnée non fiable (saisie possible) : toujours échappée
  readonly values: readonly LcChartValue[];   // alignées sur categories
  readonly colorSlot?: LcColorSlot;    // sinon attribuée (§5.3.6)
  readonly stack?: string;             // groupe d'empilement
}

export interface LcCartesianData {
  readonly categories: readonly string[];      // libellés ou dates ISO selon categoryKind
  readonly categoryKind?: 'label' | 'date' | 'month' | 'year';   // pilote le formatage (défaut label)
  readonly series: readonly LcChartSeries[];
}

export interface LcPart { readonly id: string; readonly label: string; readonly value: number; readonly colorSlot?: LcColorSlot; }

export interface LcValueAxis {
  readonly format?: LcValueFormat;     // défaut 'number'
  readonly compact?: boolean;          // graduations compactes (« 250 k€ ») ; défaut true
  readonly label?: string;             // titre d'axe (optionnel, le titre du graphique suffit souvent)
}

export interface LcChartsOptions {
  readonly renderer?: 'svg' | 'canvas';             // défaut 'svg'
  readonly patterns?: 'auto' | 'always' | 'never';  // motifs d'accessibilité ; défaut 'auto'
}
export function provideLcCharts(options?: LcChartsOptions): EnvironmentProviders;
```

#### 5.2.2 Tokens et palette de départ

La palette ci-dessous est la **palette de référence validée** du skill `dataviz` :
- en mode clair : pire écart entre paires adjacentes pour les daltoniens ΔE 9,1, en vision normale ΔE 19,6 ;
- en mode sombre : ΔE 8,4 et 19,3.

Elle sert de valeurs initiales des tokens `--lc-sys-chart-*`. Toute modification (thème produit compris) doit repasser le contrôle `lc-tokens check`.

| Token | Clair | Sombre |
|---|---|---|
| `chart-categorical-1` (bleu) | `#2a78d6` | `#3987e5` |
| `chart-categorical-2` (orange) | `#eb6834` | `#d95926` |
| `chart-categorical-3` (aqua) | `#1baf7a` | `#199e70` |
| `chart-categorical-4` (jaune) | `#eda100` | `#c98500` |
| `chart-categorical-5` (magenta) | `#e87ba4` | `#d55181` |
| `chart-categorical-6` (vert) | `#008300` | `#008300` |
| `chart-categorical-7` (violet) | `#6250d6` | `#9085e9` |
| `chart-categorical-8` (rouge) | `#e34948` | `#e66767` |
| `chart-sequential-100` → `-700` (bleu) | `#cde2fb`, `#9ec5f4`, `#6da7ec`, `#3987e5`, `#256abf`, `#184f95`, `#0d366b` (pas 100, 200, 300, 400, 500, 600, 700) | identique |
| `chart-diverging-negative` / `-neutral` / `-positive` | `#e34948` / `#f0efec` / `#2a78d6` | `#e66767` / `#383835` / `#3987e5` |
| `chart-status-good` / `-warning` / `-serious` / `-critical` | `#0ca30c` / `#fab219` / `#ec835a` / `#d03b3b` | identique (réservés, jamais une série) |
| `chart-surface` | `#fcfcfb` | `#1a1a19` |
| `chart-gridline` | `#e1e0d9` | `#2c2c2a` |
| `chart-axis` | `#c3c2b7` | `#383835` |
| `chart-ink-primary` / `-secondary` / `-muted` | `#0b0b0b` / `#52514e` / `#898781` | `#f0efec` / `#c3c2b7` / `#898781` |

Contraintes héritées de la validation :
- les emplacements 3, 4 et 5 sont sous 3:1 sur la surface claire. **Règle de compensation** : la vue tableau est toujours disponible, et les étiquettes directes sont activées quand il y a 4 séries ou moins ;
- au-delà de 3 séries, les formes où toutes les paires se côtoient (nuage de points) sont interdites ;
- `chart-surface` doit être la surface réelle sur laquelle le graphique est posé. Si `DESIGN.md` change la surface des cartes, il faut revalider.

#### 5.2.3 Thème calculé

```ts
export interface LcChartTheme {
  readonly categorical: readonly string[];          // 8 couleurs, ordre fixe
  readonly sequential: readonly string[];           // 7 pas
  readonly diverging: { readonly negative: string; readonly neutral: string; readonly positive: string };
  readonly status: { readonly good: string; readonly warning: string; readonly serious: string; readonly critical: string };
  readonly surface: string; readonly gridline: string; readonly axis: string;
  readonly ink: { readonly primary: string; readonly secondary: string; readonly muted: string };
  readonly fontFamily: string; readonly fontSize: number;
  readonly reducedMotion: boolean; readonly patterns: boolean;
}
export class LcChartThemeService { readonly theme: Signal<LcChartTheme>; }
```

### 5.3 API / interfaces

#### 5.3.1 Entrées communes aux graphiques prédéfinis

| Entrée | Type | Défaut | Rôle |
|---|---|---|---|
| `title` | `string` (obligatoire) | — | titre visible ; nom accessible |
| `titleHidden` | `boolean` | `false` | masque visuellement le titre (la carte parente titre déjà), lu par les lecteurs d'écran |
| `description` | `string?` | — | sous-titre visible + description accessible |
| `height` | `string` | `'280px'` | hauteur de la zone de tracé |
| `loading` | `boolean` | `false` | **premier chargement seulement** : squelette |
| `stale` | `boolean` | `false` | recalcul en cours : le rendu précédent reste affiché à 60 % d'opacité, sans squelette ni saut |
| `emptyMessage` | `string?` | `LC_LABELS.noData` | aucune donnée |
| `showDataTable` | model `boolean` | `false` | affiche la vue tableau |

#### 5.3.2 Composants

| Composant | Entrées propres | Règles de forme |
|---|---|---|
| `lc-line-chart` | `data: LcCartesianData`, `yAxis: LcValueAxis`, `showPoints: 'auto' \| 'always' \| 'never'` (auto : points si ≤ 24 catégories), `directLabels: 'auto' \| 'none'` (auto : étiquette en bout de ligne si ≤ 4 séries) | Évolution ; l'axe Y peut ne pas partir de 0 (indiqué par une rupture d'axe visible) |
| `lc-area-chart` | idem + `stacked: boolean` (défaut `true`) | Composition dans le temps ; **axe Y à partir de 0 obligatoire** ; au plus 8 séries |
| `lc-bar-chart` | `data`, `yAxis`, `orientation: 'vertical' \| 'horizontal'`, `stacked: boolean`, `totals: boolean` (total au-dessus des barres empilées si ≤ 12 catégories) | Comparaison ou composition par période ; axe Y à partir de 0 obligatoire |
| `lc-segmented-bar` | `parts: readonly LcPart[]`, `format: LcValueFormat`, `variant: 'tall' \| 'thin'`, `total?: number` | Part d'un tout ; au plus 6 parts, les suivantes regroupées en « Autres ». `tall` : valeur ou part imprimée sur le segment si elle tient, légende des noms. `thin` : aucun texte (les chiffres sont à côté) |
| `lc-sparkline` | `values: readonly LcChartValue[]`, `ariaLabel` (obligatoire), `height` (défaut `'32px'`), `showEndPoint: boolean` | Tendance ; ni axe, ni légende, ni info-bulle ; une seule série |
| `lc-chart` | `options` (option ECharts brute), `ariaLabel` (obligatoire), `table?: { columns: readonly string[]; rows: readonly (readonly (string \| number)[])[] }` | Porte de sortie ; le thème est appliqué ; la vue tableau est obligatoire si `table` est fourni |

Sortie commune `pointSelect: { seriesId: string; categoryIndex: number; value: LcChartValue }` (clic ou Entrée au clavier).

#### 5.3.3 Règles de marques et d'anatomie

| Élément | Règle |
|---|---|
| Lignes | Trait de 2 px, sans lissage (`smooth: false`) ; les valeurs `null` laissent un trou |
| Points | ≥ 8 px quand ils sont affichés, avec un anneau de 2 px couleur surface |
| Barres | Extrémité de la donnée arrondie de 4 px (seule l'extrémité extérieure d'une pile), base carrée posée sur la ligne de base ; **espace de 2 px couleur surface** entre segments empilés et entre barres adjacentes |
| Aires empilées | Bandes pleines séparées par un trait de 2 px couleur surface |
| Barre segmentée | Segments séparés par 2 px couleur surface ; texte blanc sur les segments, sauf `#0b0b0b` sur le jaune |
| Grille | Lignes horizontales seulement, filet `chart-gridline` ; ligne de base `chart-axis` |
| Graduations | Texte `chart-ink-muted`, chiffres tabulaires, format compact (`250 k€`, `1,2 M€`) ; le format complet est réservé à l'info-bulle et au tableau |
| Textes | Toujours en encre (`chart-ink-*`), **jamais dans la couleur de la série** ; la couleur de série n'apparaît que dans la marque et sa pastille |
| Axe des valeurs | **Un seul** (aucune API pour en créer un second) |

#### 5.3.4 Légende et étiquettes

- **2 séries ou plus** : légende HTML (dans `chart-frame`, pas dans le canvas ou le SVG) en haut à gauche, au-dessus du tracé, dans l'ordre des séries. La pastille reprend la marque : trait pour une ligne, rectangle pour une barre ou une aire.
- **1 série** : pas de légende ; le titre la nomme.
- **Étiquettes directes** (4 séries ou moins, mode `auto`) : nom de la série en bout de ligne ou à droite de l'aire. Jamais un nombre sur chaque point.
- Cliquer sur une entrée de légende masque ou affiche la série, **sans repeindre les autres** (§5.3.6). L'entrée est un `button` avec `aria-pressed`.

#### 5.3.5 Info-bulles et interactions

| Forme | Comportement |
|---|---|
| Ligne et aire | Ligne verticale de repère qui s'aimante à la catégorie la plus proche ; **une seule info-bulle listant toutes les séries** à cette abscisse |
| Barre | Info-bulle par marque : catégorie, série, valeur, et total de la barre si elle est empilée ; la marque survolée s'éclaircit légèrement |
| Barre segmentée | Info-bulle par segment : libellé, montant, part en % |
| Hiérarchie | La valeur d'abord, en gras et contrasté, puis le libellé en secondaire ; la série est repérée par un court trait de sa couleur |
| Clavier | Le conteneur du tracé est focusable (`tabindex="0"`). Les flèches gauche et droite déplacent la catégorie active et affichent son info-bulle ; Début et Fin vont aux extrémités ; Échap masque ; Entrée émet `pointSelect` |
| Contenu | Construit par les builders avec **échappement HTML** de tous les libellés (`escape-html.ts`) ; aucun libellé n'est inséré tel quel |
| Rôle | Les info-bulles enrichissent sans conditionner : toute valeur reste accessible par la vue tableau |

#### 5.3.6 Couleurs

1. Les couleurs catégorielles sont attribuées **dans l'ordre fixe des emplacements 1 à 8, jamais en boucle**.
2. Attribution : `colorSlot` explicite si fourni ; sinon, ordre de **première apparition** de l'identifiant de série, **mémorisé** par instance de graphique. Si une série disparaît, les autres gardent leur couleur.
3. Plus de 8 séries : les séries au-delà de la 7e sont regroupées en une série « Autres » (`LC_LABELS.other`), de couleur neutre `chart-ink-muted`. Le consommateur est averti en développement.
4. Séquentiel : une seule teinte, du clair au foncé. Divergent : deux teintes et un gris neutre au milieu. Jamais d'arc-en-ciel.
5. Les couleurs de statut sont réservées aux états. Elles ne servent jamais de série et sont toujours accompagnées d'une icône et d'un libellé.

#### 5.3.7 Accessibilité

- **Nom et description** : le conteneur a `role="figure"`, `aria-labelledby` (titre) et `aria-describedby` (description). L'option ECharts `aria` est activée, avec un résumé généré en français (séries, plage, extrêmes).
- **Vue tableau** : un bouton « Voir les données » (`LC_LABELS.showData`) affiche un `<table>` natif sous le graphique (catégories en lignes, séries en colonnes, valeurs au format complet). Il est rendu par le point d'entrée `charts` lui-même, pour éviter une dépendance vers `data`.
- **Motifs** (`decal`) : hachures à 45° et 135° seulement, encrées ton sur ton.
  - Avec `patterns: 'auto'`, ils s'activent sous `forced-colors: active`, sous `prefers-contrast: more` et à l'impression.
  - `always` les force ; `never` les désactive.
- **Mouvement** : animations ≤ 300 ms, désactivées sous `prefers-reduced-motion`.
- **Contraste** : vérifié au build par la CLI (§5.2.2) ; règle de compensation pour les emplacements 3 à 5.

#### 5.3.8 Thème

- `LcChartThemeService` lit les tokens `--lc-sys-chart-*`, `--lc-sys-font-family-base` et `--lc-sys-font-size-sm` sur `document.documentElement` via `getComputedStyle`. Les variables CSS ne s'appliquent pas à l'intérieur d'ECharts.
- Il les relit à chaque changement de `LcThemeService.resolvedScheme()` et de l'attribut `data-theme` (observé).
- Le thème est passé aux builders. ECharts ne connaît jamais de couleur en dur, et aucun `registerTheme` global n'est utilisé, ce qui évite un état partagé entre instances.

#### 5.3.9 Builders (internes, purs)

```ts
// Non exportés publiquement (peuvent évoluer) ; testés unitairement
function buildLineOption(data: LcCartesianData, options: LineOptions, theme: LcChartTheme, format: LcFormatService): EChartsCoreOption;
function buildAreaOption(…): EChartsCoreOption;
function buildBarOption(…): EChartsCoreOption;
function buildSegmentedBarOption(parts: readonly LcPart[], options: SegmentedOptions, theme: LcChartTheme, format: LcFormatService): EChartsCoreOption;
function buildSparklineOption(values: readonly LcChartValue[], theme: LcChartTheme): EChartsCoreOption;
function assignColorSlots(series: readonly LcChartSeries[], memory: Map<string, LcColorSlot>): ReadonlyMap<string, LcColorSlot>;
function foldExtraSeries(series: readonly LcChartSeries[], max: number, otherLabel: string): readonly LcChartSeries[];
```

### 5.4 Interface utilisateur

**Anatomie** : titre (ou titre masqué), description, légende, zone de tracé (axes, grille, marques), puis le bouton « Voir les données » et le tableau dépliable.

| État | Rendu |
|---|---|
| Premier chargement (`loading`) | Squelette de la zone de tracé, à la même hauteur (pas de saut) |
| Recalcul (`stale`) | Rendu précédent conservé, opacité 60 %, aucun squelette |
| Vide | `emptyMessage` centré dans la zone de tracé, à la même hauteur |
| Erreur | Gérée par le parent (`lc-error-state`) : un graphique n'affiche pas d'erreur réseau |
| Succès | Rendu complet, animation ≤ 300 ms (sauf mouvement réduit) |

## 6. Cas limites et gestion des erreurs

| Cas | Comportement |
|---|---|
| Plus de 8 séries | Regroupement « Autres » (§5.3.6) |
| Plus de 6 parts dans une barre segmentée | Regroupement « Autres » |
| Valeurs négatives (barres) | Sous la ligne de base, arrondi à l'extrémité basse |
| Une seule catégorie | Ligne : un point ; barre : une barre centrée |
| `values` plus courtes que `categories` | Complétées par `null` ; avertissement en développement |
| Conteneur de largeur nulle (onglet masqué) | Initialisation différée jusqu'à une largeur non nulle (ResizeObserver) |
| Changement de thème pendant une animation | Nouvelle option appliquée sans animation |
| Libellé contenant `<script>` | Affiché littéralement (échappé) dans la légende, l'info-bulle et le tableau |
| Plus de 5 000 points | Avertissement en développement ; conseil de passer `renderer: 'canvas'` |
| Somme des parts différente de `total` | Un segment « Non réparti » est ajouté si `total` est supérieur ; erreur en développement s'il est inférieur |

## 7. Sécurité, performance, observabilité

- **Sécurité** :
  - échappement systématique de tous les libellés insérés dans les info-bulles HTML d'ECharts ;
  - légende et tableau rendus par Angular (interpolation) ;
  - `lc-chart` documente que ses options brutes ne doivent pas contenir de HTML non échappé.
- **Performance** :
  - point d'entrée `charts` < 350 Kio minifiés (ECharts importé finement compris) ;
  - chargé à la demande par `@defer (on viewport)` chez les consommateurs ;
  - rendu de 12 séries × 420 points < 100 ms en SVG ;
  - une seule instance ECharts par composant, libérée à la destruction.
- **Observabilité** : N/A ; avertissements en développement seulement.

## 8. Alternatives envisagées

| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Donut pour une part d'un tout | Familier | Angles mal comparés ; règle `dataviz` | Non : `lc-segmented-bar` |
| Deux axes des valeurs | Deux mesures sur un graphique | Lecture trompeuse (erreur n° 1 selon `dataviz`) | Non : deux graphiques |
| Couleurs attribuées par rang | Simple | Les couleurs changent quand un filtre retire une série | Non : identité mémorisée |
| `registerTheme` global d'ECharts | API native | État partagé, changement de thème délicat | Non : thème passé aux builders |
| Canvas par défaut | Plus rapide sur de gros volumes | Moins net, moins accessible, captures moins stables | Non : SVG par défaut |
| Légende dessinée par ECharts | Intégrée | Moins accessible (pas de vrais boutons) | Non : légende HTML |

## 9. Plan de test

- **Unitaires** (builders, purs) :
  - attribution et mémorisation des couleurs (une série retirée ne repeint pas les autres) ;
  - regroupement « Autres » ;
  - axe à 0 obligatoire pour les aires et les barres ;
  - format compact des graduations (`250 k€`) ;
  - échappement HTML des libellés ;
  - motifs activés selon le mode ;
  - étiquettes directes à 4 séries ou moins.
- **Thème** : `LcChartThemeService` relit les tokens quand `data-theme` change (DOM simulé).
- **Composant** :
  - initialisation, redimensionnement et libération (ECharts simulé) ;
  - état `stale` (opacité, pas de squelette) ;
  - vue tableau (contenu, format) ;
  - navigation clavier (flèches, Échap, Entrée) ;
  - `role="figure"`, `aria-labelledby`, `aria-describedby`.
- **Palette** : `lc-tokens check` sur les thèmes `default` et `dark` en CI.
- **Visuel** : captures Storybook de chaque graphique en `default`, `dark` et motifs forcés.
- **Accessibilité** : axe sur les stories ; vérification manuelle avec un lecteur d'écran (VoiceOver, NVDA) avant la 1.0.

## 10. Critères d'acceptation

- [ ] Les 6 éléments du §5.3.2 sont publiés avec stories, tests et captures `default` et `dark`.
- [ ] Changer de thème recolore les graphiques affichés sans rechargement ni recréation du composant.
- [ ] Retirer une série (légende) ne change la couleur d'aucune autre série.
- [ ] Il est impossible de créer un second axe des valeurs avec les composants prédéfinis (aucune entrée prévue).
- [ ] Chaque graphique prédéfini propose « Voir les données », et le tableau contient toutes les valeurs au format complet.
- [ ] Sous `forced-colors: active`, les aires et barres empilées affichent des motifs.
- [ ] Un libellé de série `<img src=x onerror=alert(1)>` s'affiche littéralement partout.
- [ ] Le point d'entrée `charts` pèse moins de 350 Kio minifiés.

## 11. Découpage en tâches

- [ ] T1 : `provideLcCharts`, registre ECharts importé finement, `chart-host` (cycle de vie, redimensionnement, clavier) (M)
- [ ] T2 : `LcChartThemeService` + tokens `chart-*` dans `ui-tokens` + contrôle de palette dans la CLI (M)
- [ ] T3 : `chart-frame` (titre, description, légende HTML, vue tableau, états) (M)
- [ ] T4 : builders partagés (axes, info-bulles, échappement, couleurs, motifs) + tests (M)
- [ ] T5 : `lc-line-chart`, `lc-area-chart` (M)
- [ ] T6 : `lc-bar-chart`, `lc-segmented-bar` (M)
- [ ] T7 : `lc-sparkline`, `lc-chart` (S)
- [ ] T8 : stories, captures, mesure de taille, revue `/impeccable audit` (S)

## 12. Risques et questions ouvertes

- **Taille d'ECharts** : si l'objectif de 350 Kio n'est pas tenu avec l'import fin, il faudra mesurer chaque série et chaque composant importé.
- **Lecteurs d'écran** : la description `aria` d'ECharts est générique. Le résumé français généré par nos builders doit être validé avec VoiceOver et NVDA.
- **Marque du produit** : si `DESIGN.md` impose d'autres teintes, il faut substituer les rampes puis **revalider** avec la CLI. On ne choisit l'ordre que parmi les ordres qui passent les contrôles.
- **WebKitGTK** : rendu SVG et polices à vérifier sous Tauri Linux.

## Annexe : conformité aux règles

| Règle (skill) | Application |
|---|---|
| Choisir la forme selon le rôle des données (`dataviz`) | §4 et §5.3.2 ; barre segmentée plutôt que donut |
| Ordre fixe des couleurs, jamais en boucle ; la couleur suit l'entité (`dataviz`) | §5.3.6 |
| Palette validée par calcul, réglée séparément pour le sombre (`dataviz`) | §5.2.2 et CLI |
| Un seul axe (`dataviz`) | §3 et §5.3.3 |
| Marques fines, espaces de 2 px, extrémités arrondies de 4 px (`dataviz`) | §5.3.3 |
| Légende pour 2 séries ou plus, étiquettes directes sélectives, vue tableau, motifs (`dataviz`) | §5.3.4 et §5.3.7 |
| Info-bulles sur la couche de survol, libellés traités comme non fiables (`dataviz`, `security-checklist`) | §5.3.5 |
| Le recalcul garde le cadre (`dataviz`) | `stale` |
| Couleur jamais seule, mouvement réduit, `@defer` pour les graphiques (`frontend-guidelines`) | §5.3.7 et §7 |
| Fonctions pures testées (`clean-code`, `test-strategy`) | Builders du §5.3.9 |

## 13. Écarts constatés à l'implémentation (2026-11-08)

| Sujet | Spec | Réalisé |
|---|---|---|
| Contrôle de palette | « CLI `lc-tokens` valide la palette (clair/sombre, daltoniens) » | la CLI ne vérifie que le **contraste** ; le contrôle de distinction pour les daltoniens (ΔE par paire adjacente) **n'est pas implémenté** ; la palette de référence validée par le skill `dataviz` reste la source |
| Taille du point d'entrée | < 350 Kio minifiés | **non tenue** : ECharts 6 pèse ~378 Kio minifiés pour `echarts/core` seul ; avec ligne, barre, grille, info-bulle, aria, SVG et canvas : **~563 Kio minifiés, ~193 Kio gzip**. Atténuation : dépendance optionnelle, chargement à la demande (`@defer`), `CustomChart` retiré du registre |
| Arborescence | `charts/builders/shared/…`, `provideLcCharts` dans un fichier dédié | `builders/shared.ts` (axes, info-bulles, motifs, accessibilité), `builders/palette.ts`, `builders/summary.ts`, `builders/table.ts` ; le moteur est injecté via `LC_ECHARTS_ENGINE` (tests sans ECharts réel) |
| Registre ECharts | `LineChart, BarChart, CustomChart, Grid, Tooltip, Legend, Aria, SVG, Canvas` | `LineChart, BarChart, Grid, Tooltip, Aria, SVGRenderer, CanvasRenderer` (pas de légende ECharts : la légende est en HTML) |
| `lc-chart` | `options`, `ariaLabel`, `table?` | + `title?`, `description?`, `height`, `loading`, `stale`, `showDataTable` ; seules les séries `line` et `bar` sont enregistrées |
| Motifs | hachures à 45° et 135°, ton sur ton | `itemStyle.decal` / `areaStyle.decal` par série (rotation alternée), couleur de surface ; le mécanisme `aria.decal` d'ECharts est désactivé |
| Texte sur segment | blanc, sauf `#0b0b0b` sur le jaune | encre ou surface (tokens), selon le meilleur contraste calculé : aucune couleur littérale |
| Rupture d'axe | rupture visible | deux traits obliques (`graphic`) sur l'axe quand une courbe ne part pas de 0 (valeurs positives groupées : écart relatif < 50 %) |
| Résumé accessible | français généré par les builders | `LC_LABELS.chartSummary` (français et anglais) : titre, nombre de séries et de catégories, plage, maximum |
| Barre segmentée | 6 parts | 5 parts + « Autres » ; « Non réparti » en plus si `total` > somme ; légende non interactive |
| Légende | masquer sans repeindre | au moins une série reste affichée (la dernière ne peut pas être masquée) |
| Tests | ECharts simulé | `LC_ECHARTS_ENGINE` simulé ; builders testés sans DOM ; rendu réel vérifié dans le build Storybook |
