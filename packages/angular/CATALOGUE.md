# Catalogue des composants

Paquet `@lionelcointot/ui-angular` version 0.1.0. Fichier généré par `npm run catalogue:build` : ne pas modifier à la main.
Entrées : `input()` et `model()` (liaison `[x]`, et `[(x)]` pour `model`) ; sorties : `output()`.

## `@lionelcointot/ui-angular`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `[lcReveal]` | LcRevealDirective | directive | lcReveal, lcRevealIndex | – |
| `[lcSplitText]` | LcSplitTextDirective | directive | lcSplitText (requis) | – |
| `[lcStagger]` | LcStaggerDirective | directive | lcStagger | – |
| `[lcTruncate]` | LcTruncateDirective | directive | – | – |
| `button[lcButton], a[lcButton]` | LcButtonComponent | composant | themeColor, fillMode, size, rounded, loading, iconOnly, fullWidth, pressed | – |
| `lc-avatar` | LcAvatarComponent | composant | name (requis), src, size, colorSeed, label | – |
| `lc-button-group` | LcButtonGroupComponent | composant | ariaLabel (requis), attached | – |
| `lc-icon` | LcIconComponent | composant | name (requis), size, label | – |
| `lc-skeleton` | LcSkeletonComponent | composant | shape, lines, width, height | – |
| `lc-spinner` | LcSpinnerComponent | composant | size, label | – |
| `lc-theme-toggle` | LcThemeToggleComponent | composant | size, fillMode | – |
| `lcDate` | LcDatePipe | pipe | – | – |
| `lcMoney` | LcMoneyPipe | pipe | – | – |
| `lcMonths` | LcMonthsPipe | pipe | – | – |
| `lcNumber` | LcNumberPipe | pipe | – | – |
| `lcPercent` | LcPercentPipe | pipe | – | – |

## `@lionelcointot/ui-angular/charts`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `lc-area-chart` | LcAreaChartComponent | composant | title (requis), titleHidden, description, height, loading, stale, emptyMessage, showDataTable (model), data (requis), yAxis, markers, annotations, stacked, directLabels | pointSelect |
| `lc-bar-chart` | LcBarChartComponent | composant | title (requis), titleHidden, description, height, loading, stale, emptyMessage, showDataTable (model), data (requis), yAxis, orientation, stacked, totals | pointSelect |
| `lc-chart` | LcChartComponent | composant | options (requis), ariaLabel (requis), table, title, description, height, loading, stale, showDataTable (model) | pointSelect |
| `lc-line-chart` | LcLineChartComponent | composant | title (requis), titleHidden, description, height, loading, stale, emptyMessage, showDataTable (model), data (requis), yAxis, markers, annotations, showPoints, directLabels | pointSelect |
| `lc-segmented-bar` | LcSegmentedBarComponent | composant | title (requis), titleHidden, description, height, loading, stale, emptyMessage, showDataTable (model), parts (requis), format, variant, total, palette, legendPosition, legendValues | pointSelect |
| `lc-sparkline` | LcSparklineComponent | composant | values (requis), ariaLabel (requis), height, showEndPoint | – |

## `@lionelcointot/ui-angular/data`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `lc-data-table` | LcDataTableComponent | composant | source (requis), columns (requis), trackBy (requis), caption (requis), captionHidden, query (model), chips, emptyMessage | – |
| `lc-description-list` | LcDescriptionListComponent | composant | items (requis), layout | itemAction |
| `lc-kpi-card` | LcKpiCardComponent | composant | label (requis), value, format, valueText, delta, hint, loading, stale | – |
| `lc-table` | LcTableComponent | composant | data (requis), columns (requis), trackBy (requis), caption (requis), captionHidden, groupBy, footer, sort (model), sortMode, stickyHeader, density, emptyMessage, selectable, selection (model), rowClass | groupToggled |
| `lc-timeline-bar` | LcTimelineBarComponent | composant | segments, lanes, axisEnd, reference, axisLabel, label (requis), description (requis), startLabel, endLabel, minLabelShare, emptyMessage, stale, loading, ticks | – |
| `lc-tree-table` | LcTreeTableComponent | composant | data (requis), children (requis), columns (requis), trackBy (requis), caption (requis), captionHidden, sort (model), expanded (model), expandAllInitially, filter, stickyHeader, density, emptyMessage | rowToggled |
| `li[lcActivityItem]` | LcActivityItemComponent | composant | heading (requis), icon, date, dateTime | – |
| `ng-template[lcCell]` | LcCellDirective | directive | lcCell (requis) | – |
| `ol[lcActivityFeed]` | LcActivityFeedComponent | composant | density | – |

## `@lionelcointot/ui-angular/feedback`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `[lcErrorDetails]` | LcErrorDetailsDirective | directive | – | – |
| `lc-alert` | LcAlertComponent | composant | kind, title, dismissible, live | dismissed |
| `lc-badge` | LcBadgeComponent | composant | themeColor, fillMode, size | – |
| `lc-empty-state` | LcEmptyStateComponent | composant | icon, title (requis), description | – |
| `lc-error-state` | LcErrorStateComponent | composant | title (requis), description, retryLabel | retry |
| `lc-message-thread` | LcMessageThreadComponent | composant | messages (requis), showAvatars, pageSize, ariaLabel | attachmentOpen, systemAction |
| `lc-progress-bar` | LcProgressBarComponent | composant | value, label | – |
| `lc-status-badge` | LcStatusBadgeComponent | composant | kind, icon, size | – |
| `lc-toast-outlet` | LcToastOutletComponent | composant | – | – |

## `@lionelcointot/ui-angular/forms`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `[lcHighlight]` | LcHighlightComponent | composant | lcHighlight (requis), lcHighlightTerm | – |
| `[lcPrefix]` | LcPrefixDirective | directive | – | – |
| `[lcSuffix]` | LcSuffixDirective | directive | – | – |
| `button[lcSwitch]` | LcSwitchComponent | composant | checked (model), disabled, id, extraDescribedBy | touch |
| `input[lcInput], textarea[lcInput]` | LcInputDirective | directive | id, size, invalid, touched, errors, autoResize | – |
| `input[type=checkbox][lcCheckbox]` | LcCheckboxDirective | directive | id, indeterminate, invalid, touched, errors | – |
| `input[type=radio][lcRadio]` | LcRadioDirective | directive | – | – |
| `lc-choice-card` | LcChoiceCardComponent | composant | title (requis), description | – |
| `lc-combobox` | LcComboboxComponent | composant | value (model), options, search, displayWith (requis), trackBy (requis), searchSettings, extraDescribedBy, clearable, placeholder, inputId, ariaLabel, size, fillMode, rounded, disabled, readonly, invalid, touched, required, errors | selectionChange, searchFailed, touch |
| `lc-date-input` | LcDateInputComponent | composant | value (model), min, max, disabled, readonly, invalid, touched, required, errors, size, fillMode, rounded, inputId, ariaLabel | touch |
| `lc-date-range-input` | LcDateRangeInputComponent | composant | value (model), min, max, presets, disabled, readonly, invalid, touched, required, errors, size, fillMode, rounded, inputId, ariaLabel | touch |
| `lc-file-upload` | LcFileUploadComponent | composant | items, accept, multiple, maxFiles, disabled, showSize, chooseIcon, errorPlaceholderIcon, fullWidthMobile, removeLabelVisible, ariaLabel, id | filesAdded, rejected, remove, retry |
| `lc-form-field` | LcFormFieldComponent | composant | label (requis), hint, hintPlacement, errors, required, state, layout, labelHidden | – |
| `lc-list-editor` | LcListEditorComponent | composant | items, savedItems, minActive, maxLength, isDuplicate, addLabel, addButtonLabel, addError, emptyText, listLabel, disabled, busy, ariaLabel, id | add, rename, move, toggle |
| `lc-message-composer` | LcMessageComposerComponent | composant | value (model), disabled, readonly, invalid, touched, required, errors, maxLength, placeholder, inputId, ariaLabel, sending, minRows, maxRows, enterSends, sendIcon, sendLabel, attachments, items | send, sendBlocked, filesAdded, rejected, remove, retry, touch |
| `lc-money-input` | LcMoneyInputComponent | composant | value (model), disabled, readonly, invalid, touched, required, errors, min, max, size, fillMode, rounded, placeholder, inputId, ariaLabel, decimals | touch |
| `lc-number-input` | LcNumberInputComponent | composant | value (model), disabled, readonly, invalid, touched, required, errors, min, max, size, fillMode, rounded, placeholder, inputId, ariaLabel, decimals, step, unit, showStepper | touch |
| `lc-password-input` | LcPasswordInputComponent | composant | value (model), disabled, readonly, invalid, touched, required, errors, size, fillMode, rounded, autocomplete, placeholder, inputId, ariaLabel | touch |
| `lc-percent-input` | LcPercentInputComponent | composant | value (model), disabled, readonly, invalid, touched, required, errors, min, max, size, fillMode, rounded, placeholder, inputId, ariaLabel, decimals, step | touch |
| `lc-radio-group` | LcRadioGroupComponent | composant | legend (requis), orientation | – |
| `lc-segmented-control` | LcSegmentedControlComponent | composant | options (requis), value (model), ariaLabel, extraDescribedBy, size, fillMode, fullWidth, disabled, id, indicatorProgress, controlled | valueRequest, touch |
| `lc-slider` | LcSliderComponent | composant | value (model), min, max, step, unit, decimals, showValue, marks, valueText, inputId, ariaLabel, size, themeColor, disabled, readonly, invalid, touched, required, errors | committed, touch |
| `ng-template[lcComboboxOption]` | LcComboboxOptionDirective | directive | lcComboboxOptionOf | – |
| `select[lcSelect]` | LcSelectDirective | directive | id, size, invalid, touched, errors | – |

## `@lionelcointot/ui-angular/geo`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `lc-address-input` | LcAddressInputComponent | composant | placeholder, inputId, ariaLabel, size, fillMode, rounded, disabled, readonly, invalid, touched, required, errors, value (model), kind, postalCode, cityCode, debounceMs | selectionChange, touch |
| `lc-commune-input` | LcCommuneInputComponent | composant | placeholder, inputId, ariaLabel, size, fillMode, rounded, disabled, readonly, invalid, touched, required, errors, value (model), departmentCode, debounceMs | selectionChange, touch |
| `lc-department-select` | LcDepartmentSelectComponent | composant | placeholder, inputId, ariaLabel, size, fillMode, rounded, disabled, readonly, invalid, touched, required, errors, value (model), regionCode | selectionChange, touch |
| `lc-region-select` | LcRegionSelectComponent | composant | placeholder, inputId, ariaLabel, size, fillMode, rounded, disabled, readonly, invalid, touched, required, errors, value (model) | selectionChange, touch |

## `@lionelcointot/ui-angular/layout`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `[lcDisclosureGroup]` | LcDisclosureGroupDirective | directive | exclusive | – |
| `lc-app-shell` | LcAppShellComponent | composant | navMode, navOpen (model), navCollapsed (model), navLabel | – |
| `lc-card` | LcCardComponent | composant | elevation, padding, collapsible, expanded (model) | – |
| `lc-card-header` | LcCardHeaderComponent | composant | title (requis), subtitle | – |
| `lc-disclosure` | LcDisclosureComponent | composant | expanded (model), headingLevel, disabled, lazy, bordered | – |
| `lc-divider` | LcDividerComponent | composant | orientation | – |
| `lc-grid` | LcGridComponent | composant | columns, gap | – |
| `lc-grid-item` | LcGridItemComponent | composant | span | – |
| `lc-page` | LcPageComponent | composant | title (requis), description | – |
| `lc-stack` | LcStackComponent | composant | direction, gap, align, justify, wrap | – |
| `ng-template[lcDisclosureContent]` | LcDisclosureContentDirective | directive | – | – |

## `@lionelcointot/ui-angular/navigation`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `[lcMenuTriggerFor]` | LcMenuTriggerDirective | directive | lcMenuTriggerFor (requis) | – |
| `[lcSwipePanel]` | LcSwipePanelDirective | directive | – | – |
| `a[lcNavItem]` | LcNavItemComponent | composant | icon, badge, primary, active, ariaCurrentWhenActive, routerLinkActiveOptions, routerLink, queryParams, fragment | – |
| `button[lcMenuItem]` | LcMenuItemComponent | composant | icon, destructive | – |
| `lc-menu` | LcMenuComponent | composant | ariaLabel | opened, closed |
| `lc-nav-group` | LcNavGroupComponent | composant | label (requis), collapsible, expanded (model) | – |
| `lc-nav-list` | LcNavListComponent | composant | collapsed | – |
| `lc-stepper` | LcStepperComponent | composant | steps (requis), ariaLabel (requis), compact, linear, orientation, variant | stepSelect, directionChange |
| `lc-swipe-panels` | LcSwipePanelsComponent | composant | activeIndex (model), layout, chain | – |
| `lc-tab` | LcTabComponent | composant | id (requis), label (requis), disabled, icon | – |
| `lc-tabs` | LcTabsComponent | composant | selected (model), activation, ariaLabel, swipe | selectionChange |
| `ng-template[lcStepAction]` | LcStepActionDirective | directive | – | – |
| `ng-template[lcTabContent]` | LcTabContentDirective | directive | – | – |

## `@lionelcointot/ui-angular/overlay`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `[lcDrawerInitialFocus]` | LcDrawerInitialFocusDirective | directive | – | – |
| `[lcToggletip]` | LcToggletipDirective | directive | lcToggletip (requis), lcToggletipPosition | – |
| `[lcTooltip]` | LcTooltipDirective | directive | lcTooltip (requis), lcTooltipPosition | – |
| `lc-dialog` | LcDialogComponent | composant | title (requis), hideClose | – |
| `lc-drawer` | LcDrawerComponent | composant | title (requis), hideClose | – |
| `lc-sheet` | LcSheetComponent | composant | open (model), title (requis), closeLabel, closeText | closed |
| `lc-toggletip` | LcToggletipComponent | composant | – | – |
| `lc-tooltip-panel` | LcTooltipPanelComponent | composant | – | – |

## `@lionelcointot/ui-angular/theme-builder`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `lc-theme-builder` | LcThemeBuilderComponent | composant | theme (model) | – |
| `lc-theme-contrast-report` | LcThemeContrastReportComponent | composant | resolved (requis) | – |
| `lc-theme-editor` | LcThemeEditorComponent | composant | theme (requis, model), mode | – |
| `lc-theme-preview` | LcThemePreviewComponent | composant | – | – |

## Tokens de mouvement supprimés, renommés ou revalorisés (mouvement v2)

Supprimés (aucun alias : les consommateurs passent aux nouveaux noms) :
- `--lc-sys-motion-offset` (8 px) : remplacé par `--lc-sys-motion-offset-{sm|md|lg|xl}` (8 / 16 / 26 / 40 px), `-sm` reprend l'ancienne valeur.
- `--lc-sys-motion-stagger` (80 ms) : remplacé par `--lc-sys-motion-stagger-{fine|normal|cards|chars}` (12 / 40 / 67 / 22 ms) et `--lc-sys-motion-stagger-cap` (8 rangs).
- `--lc-ref-motion-stagger` : remplacé par `--lc-ref-motion-stagger-*` et `--lc-ref-motion-offset-*`, mêmes suffixes que les rôles.
- `--lc-reveal-duration`, `--lc-reveal-easing`, `--lc-reveal-offset`, `--lc-reveal-stagger` (groupe `reveal` des jetons composant) : plus lus par personne, `lcReveal` lit les rôles `--lc-sys-duration-enter`, `--lc-sys-easing-entrance`, `--lc-sys-motion-offset-sm` et `--lc-sys-motion-stagger-normal`.

Renommés :
- `--lc-tabs-indicator-duration`, `--lc-nav-item-indicator-duration`, `--lc-segmented-control-indicator-duration` : `--lc-<composant>-indicator-front-duration` (bord avant).
- `--lc-tabs-indicator-easing`, `--lc-nav-item-indicator-easing`, `--lc-segmented-control-indicator-easing` : `--lc-<composant>-indicator-front-easing` (bord avant) ; le bord arrière a ses propres jetons `-indicator-back-duration`, `-indicator-back-easing` et `-indicator-back-delay`.

Règle de signe des décalages (`*-offset`) :
- Valeur positive, sans signe : le CSS applique le sens voulu (`translateY(calc(-1 * …))`, départ du bas, du haut ou du côté). C'est le cas de `--lc-sys-motion-offset-*`, `--lc-overlay-offset`, `--lc-page-exit-offset`, `--lc-page-enter-offset`, `--lc-toast-enter-offset`, `--lc-tabbar-enter-offset`, `--lc-topbar-enter-offset`, `--lc-calendar-slide-offset` (le sens du mois s'ajoute) et `--lc-title-letter-offset` (part de la hauteur de la lettre).
- Valeur signée, appliquée telle quelle : `--lc-popover-enter-offset` (−3,7 px), `--lc-lift-offset` (−4 px) et `--lc-disclosure-offset` (−5 px).

Même nom, autre valeur :
- `--lc-sys-duration-fast` 100 → 150 ms, `-normal` 200 → 250 ms, `-slow` 300 → 350 ms, `-long` 350 → 600 ms ; tout composant qui lit directement ces rôles change avec eux.
- `--lc-dialog-enter-scale` 0,96 → 0,91 ; `--lc-list-move-duration` 500 → 420 ms (littéral, plus un rôle) ; `--lc-list-move-easing` : `easing-standard` → `easing-draw`.
- `--lc-button-press-duration` : 100 ms littéral, découplé de `duration-fast` ; `--lc-shell-nav-duration` : 350 ms littéral, découplé de `duration-long`.

Valeurs qui changent par héritage des rôles (le nom du jeton composant ne bouge pas) :
- `--lc-message-thread-enter-stagger` 80 → 40 ms (`stagger-normal`) et `--lc-message-thread-enter-fade-duration` 200 → 250 ms (`duration-normal`).
- `--lc-slide-exit-duration` 200 → 250 ms (`duration-normal`).
- `--lc-overlay-enter-duration` 200 → 250 ms (`duration-normal`), `--lc-overlay-exit-duration` 100 → 150 ms (`duration-fast`), `--lc-chip-enter-duration` 100 → 150 ms.
- Spinner 900 → 700 ms (`--lc-spinner-duration`), y compris le spinner du bouton (`--lc-button-spinner-duration`) et celui du filtre de colonne (`--lc-table-filter-spinner-duration`), qui suivent le spinner. Squelette, bandes indéterminées (`--lc-progress-bar-indeterminate-duration`, reprise par `file-upload` et `message-composer`), appui du bouton et largeur de la barre latérale gardent leur valeur actuelle.
