# Catalogue des composants

Paquet `@lionelcointot/ui-angular` version 0.1.0. Fichier généré par `npm run catalogue:build` : ne pas modifier à la main.
Entrées : `input()` et `model()` (liaison `[x]`, et `[(x)]` pour `model`) ; sorties : `output()`.

## `@lionelcointot/ui-angular`

| Sélecteur | Classe | Genre | Entrées | Sorties |
|---|---|---|---|---|
| `[lcCountUp]` | LcCountUpDirective | directive | lcCountUp (requis), lcCountUpFormat | – |
| `[lcDraw]` | LcDrawDirective | directive | lcDraw (requis) | – |
| `[lcFill]` | LcFillDirective | directive | lcFill (requis), lcFillAxis, lcFillIndex | – |
| `[lcFlash]` | LcFlashDirective | directive | lcFlash | – |
| `[lcFlip]` | LcFlipDirective | directive | lcFlip | – |
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

## Tokens de mouvement

Rôles (`--lc-sys-*`, valeurs du thème par défaut) :

- durées : `--lc-sys-duration-fast` 150ms · `--lc-sys-duration-exit` 200ms · `--lc-sys-duration-normal` 250ms · `--lc-sys-duration-slow` 350ms · `--lc-sys-duration-enter` 450ms · `--lc-sys-duration-move` 500ms · `--lc-sys-duration-long` 600ms · `--lc-sys-duration-view` 700ms · `--lc-sys-duration-title` 850ms · `--lc-sys-duration-draw` 1100ms · `--lc-sys-duration-fill` 950ms
- courbes : `--lc-sys-easing-standard` cubic-bezier(0.2, 0, 0, 1) · `--lc-sys-easing-emphasized` cubic-bezier(0.3, 0, 0, 1) · `--lc-sys-easing-entrance` cubic-bezier(0.16, 1, 0.3, 1) · `--lc-sys-easing-fill` cubic-bezier(0.16, 1, 0.3, 1) · `--lc-sys-easing-out` cubic-bezier(0.215, 0.61, 0.355, 1) · `--lc-sys-easing-pop` cubic-bezier(0.34, 1.7, 0.64, 1) · `--lc-sys-easing-pop-strong` cubic-bezier(0.34, 2, 0.64, 1) · `--lc-sys-easing-title` cubic-bezier(0.22, 1, 0.36, 1) · `--lc-sys-easing-draw` cubic-bezier(0.455, 0.03, 0.515, 0.955) · `--lc-sys-easing-inout` cubic-bezier(0.645, 0.045, 0.355, 1) · `--lc-sys-easing-exit` cubic-bezier(0.42, 0, 1, 1) · `--lc-sys-easing-stack` cubic-bezier(0.32, 0.72, 0, 1)
- distances, décalages, plafond, échelles et angles : `--lc-sys-motion-offset-sm` 8px · `--lc-sys-motion-offset-md` 16px · `--lc-sys-motion-offset-lg` 26px · `--lc-sys-motion-offset-xl` 40px · `--lc-sys-motion-stagger-fine` 12ms · `--lc-sys-motion-stagger-normal` 40ms · `--lc-sys-motion-stagger-cards` 60ms · `--lc-sys-motion-stagger-chars` 22ms · `--lc-sys-motion-stagger-cap` 8 · `--lc-sys-motion-scale-pop` 0.94 · `--lc-sys-motion-scale-enter` 0.95 · `--lc-sys-motion-rotate-tilt` 2.5deg · `--lc-sys-motion-rotate-char` 6deg

Jetons composant (`--lc-<groupe>-<nom>` ; `→` renvoie au rôle ou au jeton dont la valeur est reprise) :

- `button` : `press-scale` 0.97 · `press-duration` 100ms · `spinner-duration` → spinner-duration
- `message-thread` : `enter-duration` 550ms · `enter-fade-duration` → sys-duration-normal · `enter-stagger` → sys-motion-stagger-normal · `enter-easing` linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938 16.7%, 1.017 19.4%, 1.067, 1.099 24.3%, 1.108 26%, 1.104, 1.088 30.6%, 1.03 37.7%, 1.008 41.4%, 0.993 45.8%, 0.988 50%, 0.993 59.8%, 1.002 75.4%, 1) · `enter-scale` 0.6
- `reveal` : `duration` 550ms · `easing` → sys-easing-out · `tilt-duration` → sys-duration-title · `tilt-pace` 70ms · `card-duration` 800ms · `card-easing` → sys-easing-entrance · `card-scale` 0.985
- `tabs` : `indicator-front-duration` 380ms · `indicator-front-easing` → sys-easing-title · `indicator-back-duration` 400ms · `indicator-back-easing` → sys-easing-inout · `indicator-back-delay` 80ms
- `nav-item` : `indicator-front-duration` 380ms · `indicator-front-easing` → sys-easing-title · `indicator-back-duration` 400ms · `indicator-back-easing` → sys-easing-inout · `indicator-back-delay` 80ms
- `segmented-control` : `indicator-front-duration` 300ms · `indicator-front-easing` → sys-easing-out · `indicator-back-duration` 410ms · `indicator-back-easing` → sys-easing-inout · `indicator-back-delay` 75ms
- `tabbar` : `enter-duration` → sys-duration-view · `enter-delay` 200ms · `enter-easing` → sys-easing-entrance · `enter-offset` 90px · `height` 66px · `indicator-radius` 16px · `indicator-front-duration` → segmented-control-indicator-front-duration · `indicator-front-easing` → segmented-control-indicator-front-easing · `indicator-back-duration` → segmented-control-indicator-back-duration · `indicator-back-easing` → segmented-control-indicator-back-easing · `indicator-back-delay` → segmented-control-indicator-back-delay
- `overlay` : `enter-duration` → sys-duration-normal · `exit-duration` → sys-duration-fast · `easing` → sys-easing-standard
- `chip` : `enter-duration` → sys-duration-fast
- `list` : `move-duration` 420ms · `move-easing` → sys-easing-draw
- `slide` : `enter-duration` → sys-duration-move · `exit-duration` → sys-duration-normal
- `page` : `exit-duration` 190ms · `exit-offset` → sys-motion-offset-md · `enter-duration` → sys-duration-view · `enter-easing` → sys-easing-entrance · `enter-offset` → sys-motion-offset-lg · `stack-duration` → sys-duration-move · `stack-easing` → sys-easing-stack · `stack-recede` 30% · `layer-kpi` 100ms · `layer-cards` 120ms · `layer-rows` 400ms · `layer-gauges` → sys-duration-move · `layer-dots` 800ms · `layer-window` 1500ms · `stack-dim` 0.12
- `sheet` : `radius` → sys-radius-lg · `top-radius` 24px · `max-height` 92dvh · `enter-duration` 550ms · `enter-easing` → sys-easing-entrance · `exit-duration` 300ms · `exit-easing` → sys-easing-exit · `spring-duration` → sys-duration-move · `spring-easing` cubic-bezier(0.34, 1.56, 0.64, 1) · `backdrop-enter-duration` 300ms · `backdrop-enter-easing` cubic-bezier(0, 0, 0.58, 1) · `card-width` 35rem · `card-max-height` 80dvh
- `dialog` : `enter-scale` 0.86 · `enter-duration` → sys-duration-move · `enter-easing` → sys-easing-pop · `exit-scale` 0.94 · `exit-duration` → sys-duration-exit · `exit-easing` → sys-easing-exit
- `drawer` : `enter-duration` → sys-duration-long · `enter-easing` → sys-easing-entrance · `exit-duration` 320ms · `exit-easing` → sys-easing-exit · `backdrop-enter-duration` 300ms · `backdrop-exit-duration` → sys-duration-exit · `content-offset` 14px · `content-duration` → sys-duration-move · `content-delay` 120ms · `content-stagger` → sys-motion-stagger-normal
- `popover` : `enter-duration` → sys-duration-enter · `enter-easing` → sys-easing-pop · `enter-scale` → sys-motion-scale-enter · `enter-offset` -3.7px · `exit-duration` → sys-duration-fast
- `menu` : `enter-duration` 400ms · `enter-easing` → sys-easing-pop · `enter-scale` 0.92 · `enter-offset` -6px · `exit-duration` → sys-duration-fast
- `toast` : `enter-duration` → sys-duration-move · `enter-easing` → sys-easing-pop · `enter-offset` 30px · `enter-scale` 0.94 · `exit-duration` → sys-duration-normal · `exit-offset` → sys-motion-offset-md · `exit-easing` cubic-bezier(0.55, 0.085, 0.68, 0.53) · `tabbar-gap` → sys-motion-offset-md
- `switch` : `duration` 465ms · `easing` → sys-easing-pop · `track-duration` → sys-duration-exit
- `steps` : `bar-duration` 800ms · `bar-stagger` 117ms · `dot-duration` → sys-duration-long · `dot-easing` → sys-easing-pop-strong · `dot-scale` 0.6 · `dot-delay` → sys-motion-stagger-normal
- `count-up` : `duration` 1200ms
- `flash` : `duration` → sys-duration-fill · `easing` → sys-easing-title
- `title` : `letter-duration` → sys-duration-title · `letter-easing` → sys-easing-title · `letter-offset` 115% · `letter-rotate` → sys-motion-rotate-char · `letter-stagger` → sys-motion-stagger-chars · `line-duration` → sys-duration-view · `line-easing` → sys-easing-inout · `line-delay` 320ms
- `live` : `duration` 2000ms · `opacity-from` 0.1 · `opacity-to` 0.45
- `lift` : `offset` -4px · `duration` → sys-duration-slow · `easing` → sys-easing-out
- `calendar` : `duration` → overlay-enter-duration · `easing` → overlay-easing · `slide-offset` 18px · `slide-duration` → sys-duration-enter · `slide-opacity` 0.14 · `row-stagger` 30ms
- `chart` : `sparkline-duration` 1300ms · `update-duration` → sys-duration-view · `update-stagger` 20ms
- `topbar` : `enter-offset` 10px · `enter-duration` → sys-duration-move · `enter-stagger` 30ms · `enter-delay` 80ms
- `disclosure` : `enter-duration` 300ms · `exit-duration` 100ms · `offset` -5px · `chevron-duration` → disclosure-enter-duration
- `theme-toggle` : `duration` → sys-duration-enter · `easing` cubic-bezier(0.65, 0, 0.35, 1)
- `spinner` : `duration` 700ms · `pulse-duration` 1500ms
- `progress-bar` : `indeterminate-duration` 1500ms
- `file-upload` : `indeterminate-duration` → progress-bar-indeterminate-duration
- `message-composer` : `shake-duration` → sys-duration-normal · `indeterminate-duration` → progress-bar-indeterminate-duration
- `table` : `filter-spinner-duration` → spinner-duration · `refill-delay` 200ms
- `skeleton` : `duration` 1500ms
- `shell` : `nav-duration` 350ms

## Tokens de mouvement supprimés, renommés ou revalorisés (mouvement v2)

Supprimés (aucun alias : les consommateurs passent aux nouveaux noms) :
- `--lc-sys-motion-offset` (8 px) : remplacé par `--lc-sys-motion-offset-{sm|md|lg|xl}` (8 / 16 / 26 / 40 px), `-sm` reprend l'ancienne valeur.
- `--lc-sys-motion-stagger` (80 ms) : remplacé par `--lc-sys-motion-stagger-{fine|normal|cards|chars}` (12 / 40 / 60 / 22 ms) et `--lc-sys-motion-stagger-cap` (8 rangs).
- `--lc-ref-motion-stagger` : remplacé par `--lc-ref-motion-stagger-*` et `--lc-ref-motion-offset-*`, mêmes suffixes que les rôles.
- `--lc-reveal-offset`, `--lc-reveal-stagger` (groupe `reveal` des jetons composant) : plus lus par personne, `lcReveal` lit `--lc-sys-motion-offset-sm` et `--lc-sys-motion-stagger-normal` ; `--lc-reveal-offset` n'est plus un jeton mais le délai de départ posé par l'hôte (0 par défaut). `--lc-reveal-duration`, `--lc-reveal-easing` (550 ms, `--lc-sys-easing-out`, variantes de base) et `--lc-reveal-tilt-duration` (850 ms, courbe `pop`, variante `tilt`) sont les jetons propres de `lcReveal`, séparés de `--lc-sys-duration-enter` (popover, calendrier, bascule de thème).
- `--lc-collapse-duration` : la section dépliable de `lc-data-table` suit `lc-disclosure` (`--lc-disclosure-enter-duration`, `--lc-disclosure-exit-duration`, `--lc-disclosure-chevron-duration`, `--lc-disclosure-offset`).
- `--lc-sys-easing-soft` (et `--lc-ref-easing-soft`) : plus lu depuis l'alignement des cascades sur le site (`out`).
- `--lc-overlay-offset` (le décalage d'ouverture est joué par les keyframes de chaque composant), `--lc-sheet-top-gap` (feuille à la hauteur de son contenu) et `--lc-dialog-sheet-radius` (la feuille porte son propre rayon, `--lc-sheet-top-radius`) : sans lecteur.

Renommés :
- `--lc-tabs-indicator-duration`, `--lc-nav-item-indicator-duration`, `--lc-segmented-control-indicator-duration` : `--lc-<composant>-indicator-front-duration` (bord avant).
- `--lc-tabs-indicator-easing`, `--lc-nav-item-indicator-easing`, `--lc-segmented-control-indicator-easing` : `--lc-<composant>-indicator-front-easing` (bord avant) ; le bord arrière a ses propres jetons `-indicator-back-duration`, `-indicator-back-easing` et `-indicator-back-delay`.

Règle de signe des décalages (`*-offset`) :
- Valeur positive, sans signe : le CSS applique le sens voulu (`translateY(calc(-1 * …))`, départ du bas, du haut ou du côté). C'est le cas de `--lc-sys-motion-offset-*`, `--lc-page-exit-offset`, `--lc-page-enter-offset`, `--lc-toast-enter-offset`, `--lc-tabbar-enter-offset`, `--lc-topbar-enter-offset`, `--lc-calendar-slide-offset` (le sens du mois s'ajoute) et `--lc-title-letter-offset` (part de la hauteur de la lettre).
- Valeur signée, appliquée telle quelle : `--lc-popover-enter-offset` (−3,7 px), `--lc-lift-offset` (−4 px) et `--lc-disclosure-offset` (−5 px).

Même nom, autre valeur :
- `--lc-sys-duration-fast` 100 → 150 ms, `-normal` 200 → 250 ms, `-slow` 300 → 350 ms, `-long` 350 → 600 ms ; tout composant qui lit directement ces rôles change avec eux.
- `--lc-sys-duration-draw` 900 → 1100 ms (tracé `lcDraw`) ; nouveau rôle `--lc-sys-duration-fill` (950 ms) pour `lcFill`, qui lisait `-draw` ; nouveau jeton `--lc-count-up-duration` (1200 ms) pour `lcCountUp`, qui lisait `-draw`.
- `--lc-dialog-enter-scale` 0,96 → 0,86 (Talmo) ; `--lc-list-move-duration` 500 → 420 ms (littéral, plus un rôle) ; `--lc-list-move-easing` : `easing-standard` → `easing-draw`.
- `--lc-button-press-duration` : 100 ms littéral, découplé de `duration-fast` ; `--lc-shell-nav-duration` : 350 ms littéral, découplé de `duration-long`.

Valeurs qui changent par héritage des rôles (le nom du jeton composant ne bouge pas) :
- `--lc-message-thread-enter-stagger` 80 → 40 ms (`stagger-normal`) et `--lc-message-thread-enter-fade-duration` 200 → 250 ms (`duration-normal`).
- `--lc-slide-exit-duration` 200 → 250 ms (`duration-normal`).
- `--lc-overlay-enter-duration` 200 → 250 ms (`duration-normal`), `--lc-overlay-exit-duration` 100 → 150 ms (`duration-fast`), `--lc-chip-enter-duration` 100 → 150 ms.
- Spinner 900 → 700 ms (`--lc-spinner-duration`), y compris le spinner du bouton (`--lc-button-spinner-duration`) et celui du filtre de colonne (`--lc-table-filter-spinner-duration`), qui suivent le spinner. Squelette, bandes indéterminées (`--lc-progress-bar-indeterminate-duration`, reprise par `file-upload` et `message-composer`), appui du bouton et largeur de la barre latérale gardent leur valeur actuelle.
