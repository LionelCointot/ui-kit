# Spec : composants et extensions pour un tableau de bord de suivi (K1 à K9)

- **Statut** : Implémentée (tests à écrire par `qa-engineer`)
- **Date** : 2026-11-11
- **Source** : demande du projet consommateur (spec « composants et extensions à ajouter au ui-kit », K1 à K9, critères `CA-K…`). Cette page ne reprend que ce qui est livré et les écarts constatés.
- **Liés** : `2026-11-catalogue-composants.md`, `2026-11-graphiques.md`, `2026-11-socle-tokens-themes.md`, ADR 0002, 0005, 0006

Tout est **générique** : aucun vocabulaire métier dans les API, libellés, tokens ou stories.

## Livré

| Id | Élément | Point d'entrée | API |
|---|---|---|---|
| K1 | `lc-status-badge` | `feedback` | `kind` (`success`, `error`, `warning`, `highlight`, `info`, `neutral`), `icon`, `size`, contenu = libellé ; `LC_STATUS_ICONS` étendu (`LcStatusBadgeKind`) ; tokens `--lc-status-badge-*` |
| K2 | rôle `highlight` | tokens, principal | `ref.color.purple`, `sys.color.{highlight,on-highlight,highlight-container,on-highlight-container}`, 2 paires de contraste, `LcThemeColor` + `'highlight'` (`lc-badge`, `button[lcButton]`, `lc-slider`) |
| K3 | `lc-tree-table<T>` | `data` | `data`, `children`, `columns`, `trackBy`, `caption`, `captionHidden`, `[(sort)]`, `[(expanded)]`, `expandAllInitially`, `filter`, `density`, `stickyHeader`, `emptyMessage`, `rowToggled` ; cellules `lcCell` avec `let-level="level"` |
| K4 | `lc-paginator`, `lcPageSlice`, `lcPageCount` | `data` | `total`, `[(page)]`, `[(pageSize)]`, `pageSizes`, `ariaLabel` |
| K5 | `lc-meter` | `feedback` | `value`, `min`, `max`, `label`, `valueText`, `themeColor`, `size`, `showValue` |
| K6 | `LcChartSeries.colorRole` | `charts` | tokens `--lc-sys-chart-role-*`, `LcChartTheme.roles`, décalque et icône par rôle |
| K7 | `lc-code-block` | `data` | `code`, `ariaLabel`, `wrap`, `maxHeight`, `lineNumbers`, `copyable` |
| K8 | `lc-nav-group` | `navigation` | `label`, `collapsible`, `[(expanded)]` |
| K9 | icônes | principal | `git-branch`, `git-commit-horizontal`, `activity`, `refresh-cw` |

Libellés ajoutés à `LC_LABELS` (fr, en) : `noValue`, `pagination`, `previousPage`, `nextPage`, `pageSize`, `pageRange`, `pageStatus`, `copy`, `copied`, `copyFailed`, `codeTruncated`, `themeBuilder.previewSamples.highlight`.

## Écarts constatés à l'implémentation

| Sujet | Spec | Livré | Pourquoi |
|---|---|---|---|
| K2 : paires | paires ajoutées | 2 paires texte seulement (4,5:1) ; pas de paire `highlight`/`surface` ni `chart.role.*` | ne pas contrôler davantage les thèmes produit existants |
| K2 : tests existants | — | 6 tests échouent : compteurs de paires 26 → 28 (`theme.test.mjs` ×2, `theme-contrast-report.component.spec.ts` ×4) | conséquence des deux paires exigées ; à mettre à jour par `qa-engineer` |
| K2 : aperçu du theme builder | — | la galerie montre aussi `highlight` (`LcThemePreviewSamples.highlight`) | elle énumère `LcThemeColor` |
| K3 : filtre | ancêtres dépliés | un filtre déplie automatiquement jusqu'à la première bascule de l'utilisateur, puis `expanded` fait foi (un nouveau filtre repart du dépliage automatique) | pas de nœud impossible à replier |
| K3 : focus | `FocusKeyManager` | focus sur la ligne (un seul arrêt de tabulation) ; le bouton de dépliage est `aria-hidden`, `tabindex=-1` (souris) ; un contrôle focalisable placé dans un gabarit de cellule reste un arrêt de tabulation | motif treegrid à focus de ligne |
| K3 : performance (CA-K3.5) | rendu < 500 ms | clavier géré par délégation d'évènements sur `tbody` (flèches, Début, Fin calculés sur l'index de la ligne) sans `FocusKeyManager` ni `viewChildren` ; 2 000 lignes : ~145 ms (5 passes à froid, `tools/qa/storybook-browser.mjs perf`) | une requête de vue sur 2 000 lignes coûtait ~1,2 s (collecte O(n²)) ; deux lignes de même `trackBy` gardent la même clé mais un seul arrêt de tabulation (index), avec avertissement en développement |
| K3 : libellés | `expandRow`, `collapseRow` | retirés de `LC_LABELS` | le bouton de dépliage est `aria-hidden` : l'état est annoncé par `aria-expanded` de la ligne |
| Graphiques : axe entier | — | `yAxis.format: 'integer'` impose `minInterval: 1` sur l'axe des valeurs (courbes, aires, barres) : pas de graduation 0,2 ou 0,4 | demande de la revue design du dashboard (axes de comptes) ; option générique, sans nouvelle entrée |
| K4 : `pageChange` | `output` explicite | sortie implicite du `model` `page` | Angular refuse le doublon (NG1054) |
| K4 : `lcPageSlice` | bornes testées | page recadrée, liste vide → `[]`, taille invalide → `RangeError` | cohérent avec le composant |
| K4 : tailles | liste native | `<select class="lc-select">` stylé par `ui-angular.css` | pas d'import de `forms` |
| K5 : `null` | `aria-valuetext` « Non mesuré » | idem ; `aria-valuenow` = `min` | attribut requis par le rôle |
| K5 : `warning` | ≥ 3:1 | jaune clair à 1,6:1 contre la piste : contour 1 px `on-warning-container` ; autres couleurs ≥ 3,5:1 | le contour porte le contraste |
| K6 : tokens | repli sur les emplacements | `chart.role.*` pointent sur `ref.color.chart.{light,dark}.N` (même valeur que l'emplacement), pas sur un token `sys` | le DTCG exporté d'un thème doit donner des valeurs résolues (test existant) ; une surcharge de `categorical.N` ne se propage donc pas |
| K6 : contrastes (marques/`chart.surface`) | ≥ 3:1 sauf `warning` clair | clair : `success` 4,82, `error` 3,85, `highlight` 5,62, `info` 4,30, `neutral` 3,50, `warning` 2,11 (contour) ; sombre : 3,52, 5,39, 5,57, 4,79, 4,85, 5,67 | mesuré |
| K7 : confirmation | toast ou `role="status"` | `role="status"` interne | pas de dépendance au toast |
| K8 : mode réduit | titre masqué | un groupe `collapsible` reste déplié, titre non bouton | éviter un bouton invisible tabulable |
| Format | — | Prettier non appliqué | le dépôt n'y est pas conforme ; pas de lint configuré |
