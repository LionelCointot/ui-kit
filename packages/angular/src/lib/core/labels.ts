import { InjectionToken } from '@angular/core';

/** Tous les textes internes des composants : aucun texte en dur dans un composant. */
export interface LcLabels {
  readonly close: string;
  readonly loading: string;
  readonly noData: string;
  readonly retry: string;
  readonly showData: string;
  readonly hideData: string;
  readonly skipToContent: string;
  readonly openNavigation: string;
  readonly closeNavigation: string;
  readonly other: string;
  readonly confirm: string;
  readonly cancel: string;
  readonly details: string;
  readonly increase: string;
  readonly decrease: string;
  readonly expandGroup: string;
  readonly collapseGroup: string;
  readonly sortAscending: string;
  readonly sortDescending: string;
  readonly total: string;
  readonly notifications: string;
  readonly showPassword: string;
  readonly hidePassword: string;
  readonly unallocated: string;
  readonly truncatedRows: (count: number) => string;
  /** Sélection dans `lc-table` : nom des cases et annonce. */
  readonly selectRow: string;
  readonly selectAll: string;
  readonly selectionCount: (selected: number, total: number) => string;
  /** Jauge (`lc-meter`) : texte lu quand la valeur n'est pas mesurée. */
  readonly noValue: string;
  /** Pagination (`lc-paginator`). */
  readonly pagination: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly pageSize: string;
  readonly pageRange: (first: number, last: number, total: number) => string;
  readonly pageStatus: (page: number, pageCount: number) => string;
  /** Fil d'étapes (`lc-stepper`) : position (« Étape 2 sur 5 »), nom accessible d'une étape cliquable et mentions des étapes en erreur ou facultatives. */
  readonly stepOf: (current: number, total: number) => string;
  /** @deprecated Remplacé par `stepGoTo` (nom accessible d'une étape cliquable du fil d'étapes v2). */
  readonly stepBack: (name: string) => string;
  readonly stepGoTo: (position: number, name: string) => string;
  /** Texte masqué ajouté au nom d'une étape en erreur. */
  readonly stepInvalid: string;
  /** Texte masqué ajouté au nom d'une étape facultative. */
  readonly stepOptionalHidden: string;
  /** Mention visible sous le nom d'une étape facultative. */
  readonly stepOptional: string;
  /** Bouton qui déplie la liste des réponses du fil d'étapes en variante `rail` sous 900 px. */
  readonly stepAnswers: string;
  /** Bloc de code (`lc-code-block`). */
  readonly copy: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly codeTruncated: (count: number) => string;
  /** Journal (`lc-log-view`) : copie, reprise du suivi, avis de lignes masquées, état vide et repères de niveau. */
  readonly logCopy: string;
  readonly logResume: string;
  readonly logTruncated: (count: number) => string;
  readonly logEmpty: string;
  readonly logLevelError: string;
  readonly logLevelInfo: string;
  /** Message (`lc-message`) : variante annoncée avant l'auteur ; la note à diffusion restreinte l'affiche aussi à l'écran. */
  readonly messageReceived: string;
  readonly messageSent: string;
  readonly messageRestricted: string;
  /** Dépôt de fichiers (`lc-file-upload`) : choix, zone de dépôt, limite, état et actions de chaque ligne, annonces. */
  readonly fileUploadChoose: string;
  readonly fileUploadChooseMany: string;
  readonly fileUploadDropHint: string;
  readonly fileUploadList: string;
  readonly fileUploadLimitReached: (max: number) => string;
  readonly fileUploadRemove: (name: string) => string;
  readonly fileUploadRetry: (name: string) => string;
  /** Mot visible du bouton de retrait (`removeLabelVisible`) ; le nom accessible reste `fileUploadRemove(nom)`. */
  readonly fileUploadRemoveShort: string;
  readonly fileUploadPending: string;
  readonly fileUploadUploading: (progress: number | null) => string;
  readonly fileUploadDone: string;
  readonly fileUploadFailed: string;
  readonly fileUploadProgress: (name: string) => string;
  readonly fileUploadAnnounceDone: (name: string) => string;
  readonly fileUploadAnnounceRemoved: (name: string) => string;
  /** Unités de taille de fichier, de l'octet au gigaoctet. */
  readonly fileSizeUnits: readonly [string, string, string, string];
  /** Liste modifiable (`lc-list-editor`) : champ d'ajout, commandes et état de chaque ligne, erreurs détectées, annonces. */
  readonly listEditorList: string;
  readonly listEditorAddLabel: string;
  readonly listEditorAdd: string;
  readonly listEditorEmpty: string;
  readonly listEditorMoveUp: (label: string) => string;
  readonly listEditorMoveDown: (label: string) => string;
  readonly listEditorRename: (label: string) => string;
  readonly listEditorRenameField: (label: string) => string;
  readonly listEditorSave: string;
  readonly listEditorToggle: (label: string) => string;
  readonly listEditorActive: string;
  readonly listEditorInactive: string;
  readonly listEditorLocked: string;
  readonly listEditorMinActive: (min: number) => string;
  readonly listEditorRequired: string;
  readonly listEditorTooLong: (max: number) => string;
  readonly listEditorDuplicate: string;
  readonly listEditorPosition: (label: string, position: number, total: number) => string;
  readonly listEditorAnnounceAdded: (label: string, position: number) => string;
  readonly listEditorAnnounceActive: (label: string) => string;
  readonly listEditorAnnounceInactive: (label: string) => string;
  /** Tableau hiérarchique (`lc-tree-table`) : bascule d'une ligne parente. */
  /** Liste filtrable (`lc-combobox`) et champs géographiques. */
  readonly comboboxNoResults: string;
  readonly comboboxResultsCount: (count: number) => string;
  readonly comboboxSearching: string;
  readonly comboboxSearchUnavailable: string;
  readonly comboboxTooManyRequests: string;
  readonly comboboxRetry: string;
  readonly comboboxChooseProposal: string;
  readonly comboboxClear: string;
  readonly comboboxMinLength: (count: number) => string;
  readonly geoUnknownCode: (code: string) => string;
  /** En-tête de la première colonne de la vue tableau d'un graphique (catégories). */
  readonly category: string;
  /** En-tête de la colonne des éléments d'une barre segmentée. */
  readonly part: string;
  readonly value: string;
  readonly share: string;
  /** Libellés des repères verticaux et points annotés d'un graphique (vue tableau, description accessible). */
  readonly chartMarker: string;
  readonly chartAnnotation: string;
  /** Résumé lu par les technologies d'assistance pour un graphique. */
  readonly chartSummary: (info: LcChartSummaryInfo) => string;
  readonly themeBuilder: LcThemeBuilderLabels;
  /** Tableau filtrable (`lc-data-table`). Pour nommer les lignes (« demandes »), remplacer `rows`, `rowNoun`, `showRows`, `noResultsTitle`. */
  readonly dataTable: LcDataTableLabels;
  /** Champ de date à zones : lettres d'une zone vide, noms des zones, aide et annonces. */
  readonly dateZoneDay: string;
  readonly dateZoneMonth: string;
  readonly dateZoneYear: string;
  readonly dateDayName: string;
  readonly dateMonthName: string;
  readonly dateYearName: string;
  /** Annonce d'une zone : `value` est null quand la zone est vide. */
  readonly dateZoneAnnounce: (name: string, value: string | null) => string;
  readonly dateInputHint: string;
  readonly dateDayClamped: (day: number, month: string) => string;
  /** Panneau du calendrier : titre du dialogue, pied, navigation, nom du titre-bouton (`title` = « novembre 2026 »). */
  readonly dateChoose: string;
  /** Bouton calendrier d'un champ qui a une valeur (`date` en forme longue). */
  readonly dateChange: (date: string) => string;
  readonly dateChoosePeriod: string;
  readonly dateToday: string;
  readonly dateClear: string;
  readonly datePreviousMonth: string;
  readonly dateNextMonth: string;
  readonly dateChooseMonthOf: (title: string) => string;
  readonly dateChooseYearOf: (title: string) => string;
  readonly datePreviousYear: string;
  readonly dateNextYear: string;
  readonly datePreviousYears: string;
  readonly dateNextYears: string;
  /** Titre du niveau des années : première et dernière année affichées. */
  readonly dateYearsRange: (first: number, last: number) => string;
  /** Panneau de période : ligne d'état, boutons, raccourcis et leurs dates (`date` en forme longue). */
  readonly dateChooseStart: string;
  readonly dateStartPicked: (date: string) => string;
  readonly dateChangeStart: string;
  readonly dateNoEnd: string;
  readonly dateClearPeriod: string;
  readonly dateNoneAllowed: string;
  /** Mots qui encadrent les dates d'un raccourci : « du 13 au 19 novembre 2026 ». */
  readonly datePeriodFrom: string;
  readonly datePeriodTo: string;
  readonly dateOnDay: (date: string) => string;
  readonly dateLastWeek: string;
  readonly dateThisMonth: string;
  readonly dateLastMonth: string;
  /** Champ de période : nom du groupe, bouton (`text` : « du 3 au 12 novembre 2026 » ou une borne), ligne d'une seule borne, groupe des raccourcis natifs. */
  readonly datePeriod: string;
  readonly dateChangePeriod: (text: string) => string;
  readonly dateStartingFrom: (date: string) => string;
  readonly dateOpenEnd: (date: string) => string;
  readonly dateOpenStart: (date: string) => string;
  /** Ligne d'état d'un panneau rouvert sur une sélection : `period` est la phrase de `describeInterval`. */
  readonly dateCurrentPeriod: (period: string) => string;
  readonly dateCurrentFrom: (date: string) => string;
  readonly dateCurrentUntil: (date: string) => string;
  readonly dateShortcuts: string;
}

/** Textes du tableau filtrable (`lc-data-table`). */
export interface LcDataTableLabels {
  /** « 3 résultats », « 1 résultat », « aucun résultat ». */
  readonly rows: (count: number) => string;
  /** Nom des lignes après un nombre en gras : « résultats ». */
  readonly rowNoun: (count: number) => string;
  readonly ofTotal: (total: number) => string;
  readonly showRows: (count: number) => string;
  readonly noResultsTitle: string;
  readonly noResultsHint: string;
  readonly rowsError: string;
  /** Nom de l'entonnoir : `state` vaut null sans filtre actif. */
  readonly filterColumn: (column: string, state: string | null) => string;
  readonly valuesChosen: (count: number) => string;
  readonly filterTooltip: string;
  readonly activeFilterTooltip: (summary: string) => string;
  readonly menuTitle: (column: string) => string;
  readonly multiHint: string;
  readonly apply: string;
  readonly clear: string;
  readonly clearFilters: string;
  readonly clearAll: string;
  readonly loadingValues: string;
  readonly announceLoadingValues: (column: string) => string;
  readonly valuesAvailable: (count: number) => string;
  readonly noValues: string;
  readonly noValuesHint: string;
  readonly valuesError: string;
  readonly valuesErrorKept: string;
  readonly valuesErrorUnchanged: string;
  readonly retrying: string;
  readonly searchValues: string;
  readonly selectAll: string;
  readonly selectResults: (count: number) => string;
  readonly noMatch: (query: string) => string;
  readonly valuesNote: (count: number) => string;
  readonly valuesGroup: (column: string) => string;
  readonly emptyValue: string;
  /** Texte cherché, dans le résumé d'un filtre texte. */
  readonly quoted: (text: string) => string;
  readonly lastDays: (days: number) => string;
  readonly from: string;
  readonly to: string;
  readonly since: (date: string) => string;
  readonly until: (date: string) => string;
  readonly datesNote: string;
  readonly dateOrderError: string;
  readonly filters: (active: number) => string;
  readonly filtersButtonLabel: (active: number) => string;
  readonly closeWithoutApplying: string;
  readonly all: string;
  readonly activeFilters: string;
  readonly noFilter: string;
  readonly editFilter: (column: string, summary: string) => string;
  readonly removeFilter: (column: string) => string;
  readonly sort: string;
  readonly defaultOrder: string;
  readonly sortOption: (column: string, direction: 'asc' | 'desc') => string;
  /** Texte masqué du bouton de tri, selon l'état courant. */
  readonly sortHint: (state: 'none' | 'asc' | 'desc') => string;
  /** Fin de la légende cachée : « filtré par État (Qualifiée) » ou « sans filtre ». */
  readonly captionFilters: (filters: string | null) => string;
  readonly announceApplied: (column: string) => string;
  readonly announceCleared: (column: string) => string;
  readonly announceRemoved: (column: string) => string;
  readonly announceAllCleared: string;
  readonly announceFiltersApplied: string;
  readonly announceDraftCleared: string;
}

const DATA_TABLE_FR: LcDataTableLabels = {
  rows: (count) => (count === 0 ? 'aucun résultat' : count === 1 ? '1 résultat' : `${count} résultats`),
  rowNoun: (count) => (count > 1 ? 'résultats' : 'résultat'),
  ofTotal: (total) => `sur ${total}`,
  showRows: (count) => (count === 0 ? 'Aucun résultat' : `Afficher ${count === 1 ? '1 résultat' : `${count} résultats`}`),
  noResultsTitle: 'Aucun résultat ne correspond à ces filtres',
  noResultsHint: 'Modifiez un filtre depuis son entonnoir, ou effacez-les tous pour tout revoir.',
  rowsError: 'Impossible de charger les lignes.',
  filterColumn: (column, state) => (state ? `Filtrer la colonne ${column} (${state})` : `Filtrer la colonne ${column}`),
  valuesChosen: (count) => (count === 1 ? '1 valeur choisie' : `${count} valeurs choisies`),
  filterTooltip: 'Filtrer',
  activeFilterTooltip: (summary) => `Filtre actif : ${summary}`,
  menuTitle: (column) => `Filtrer : ${column}`,
  multiHint: 'Valeurs présentes dans le tableau, selon les autres filtres.',
  apply: 'Appliquer',
  clear: 'Effacer',
  clearFilters: 'Effacer les filtres',
  clearAll: 'Tout effacer',
  loadingValues: 'Chargement des valeurs…',
  announceLoadingValues: (column) => `Chargement des valeurs de ${column}`,
  valuesAvailable: (count) => (count === 1 ? '1 valeur disponible' : `${count} valeurs disponibles`),
  noValues: 'Aucune valeur avec les autres filtres',
  noValuesHint: 'Les autres filtres actifs ne laissent aucune ligne. Retirez-en un pour retrouver des valeurs ici.',
  valuesError: 'Impossible de charger les valeurs',
  valuesErrorKept: 'La liste n\'a pas pu être obtenue. Le filtre déjà appliqué reste en place.',
  valuesErrorUnchanged: 'La liste n\'a pas pu être obtenue. Le tableau n\'est pas modifié.',
  retrying: 'Nouvel essai',
  searchValues: 'Rechercher une valeur',
  selectAll: 'Tout sélectionner',
  selectResults: (count) => (count === 1 ? 'Sélectionner le résultat' : `Sélectionner les ${count} résultats`),
  noMatch: (query) => `Aucune valeur ne contient « ${query} ».`,
  valuesNote: (count) => `${count === 1 ? '1 valeur' : `${count} valeurs`}. Nombres calculés avec les autres filtres actifs.`,
  valuesGroup: (column) => `Valeurs de ${column}`,
  emptyValue: '(vide)',
  quoted: (text) => `« ${text} »`,
  lastDays: (days) => `${days} derniers jours`,
  from: 'Du',
  to: 'Au',
  since: (date) => `depuis le ${date}`,
  until: (date) => `jusqu'au ${date}`,
  datesNote: 'Dates incluses.',
  dateOrderError: 'La date de fin est avant la date de début.',
  filters: (active) => (active ? `Filtres (${active})` : 'Filtres'),
  filtersButtonLabel: (active) => (active === 0 ? 'Filtres' : `Filtres, ${active} ${active > 1 ? 'actifs' : 'actif'}`),
  closeWithoutApplying: 'Fermer sans appliquer',
  all: 'Tout',
  activeFilters: 'Filtres actifs',
  noFilter: 'Aucun filtre. Touchez « Filtres » pour filtrer.',
  editFilter: (column, summary) => `Modifier le filtre ${column} : ${summary}`,
  removeFilter: (column) => `Retirer le filtre ${column}`,
  sort: 'Trier',
  defaultOrder: 'Ordre par défaut',
  sortOption: (column, direction) => `${column} : ${direction === 'asc' ? 'ordre croissant' : 'ordre décroissant'}`,
  sortHint: (state) => (state === 'none' ? ', trier par ordre croissant'
    : state === 'asc' ? ', trié par ordre croissant, activer pour l\'ordre décroissant'
      : ', trié par ordre décroissant, activer pour revenir à l\'ordre par défaut'),
  captionFilters: (filters) => (filters ? `filtré par ${filters}` : 'sans filtre'),
  announceApplied: (column) => `Filtre ${column} appliqué.`,
  announceCleared: (column) => `Filtre ${column} effacé.`,
  announceRemoved: (column) => `Filtre ${column} retiré.`,
  announceAllCleared: 'Filtres effacés.',
  announceFiltersApplied: 'Filtres appliqués.',
  announceDraftCleared: 'Tous les choix sont effacés.',
};

const DATA_TABLE_EN: LcDataTableLabels = {
  rows: (count) => (count === 0 ? 'no results' : count === 1 ? '1 result' : `${count} results`),
  rowNoun: (count) => (count === 1 ? 'result' : 'results'),
  ofTotal: (total) => `of ${total}`,
  showRows: (count) => (count === 0 ? 'No results' : `Show ${count === 1 ? '1 result' : `${count} results`}`),
  noResultsTitle: 'No results match these filters',
  noResultsHint: 'Change a filter from its funnel, or clear them all to see everything again.',
  rowsError: 'The rows could not be loaded.',
  filterColumn: (column, state) => (state ? `Filter the ${column} column (${state})` : `Filter the ${column} column`),
  valuesChosen: (count) => (count === 1 ? '1 value selected' : `${count} values selected`),
  filterTooltip: 'Filter',
  activeFilterTooltip: (summary) => `Active filter: ${summary}`,
  menuTitle: (column) => `Filter: ${column}`,
  multiHint: 'Values present in the table, given the other filters.',
  apply: 'Apply',
  clear: 'Clear',
  clearFilters: 'Clear filters',
  clearAll: 'Clear all',
  loadingValues: 'Loading values…',
  announceLoadingValues: (column) => `Loading the values of ${column}`,
  valuesAvailable: (count) => (count === 1 ? '1 value available' : `${count} values available`),
  noValues: 'No values with the other filters',
  noValuesHint: 'The other active filters leave no rows. Remove one to get values back here.',
  valuesError: 'The values could not be loaded',
  valuesErrorKept: 'The list could not be retrieved. The filter already applied stays in place.',
  valuesErrorUnchanged: 'The list could not be retrieved. The table is unchanged.',
  retrying: 'Trying again',
  searchValues: 'Search for a value',
  selectAll: 'Select all',
  selectResults: (count) => (count === 1 ? 'Select the result' : `Select the ${count} results`),
  noMatch: (query) => `No value contains “${query}”.`,
  valuesNote: (count) => `${count === 1 ? '1 value' : `${count} values`}. Counts take the other active filters into account.`,
  valuesGroup: (column) => `Values of ${column}`,
  emptyValue: '(empty)',
  quoted: (text) => `“${text}”`,
  lastDays: (days) => `Last ${days} days`,
  from: 'From',
  to: 'To',
  since: (date) => `since ${date}`,
  until: (date) => `until ${date}`,
  datesNote: 'Dates included.',
  dateOrderError: 'The end date is before the start date.',
  filters: (active) => (active ? `Filters (${active})` : 'Filters'),
  filtersButtonLabel: (active) => (active === 0 ? 'Filters' : `Filters, ${active} active`),
  closeWithoutApplying: 'Close without applying',
  all: 'All',
  activeFilters: 'Active filters',
  noFilter: 'No filter. Tap “Filters” to filter.',
  editFilter: (column, summary) => `Edit the ${column} filter: ${summary}`,
  removeFilter: (column) => `Remove the ${column} filter`,
  sort: 'Sort',
  defaultOrder: 'Default order',
  sortOption: (column, direction) => `${column}: ${direction === 'asc' ? 'ascending' : 'descending'}`,
  sortHint: (state) => (state === 'none' ? ', sort ascending'
    : state === 'asc' ? ', sorted ascending, activate for descending' : ', sorted descending, activate to restore the default order'),
  captionFilters: (filters) => (filters ? `filtered by ${filters}` : 'no filter'),
  announceApplied: (column) => `${column} filter applied.`,
  announceCleared: (column) => `${column} filter cleared.`,
  announceRemoved: (column) => `${column} filter removed.`,
  announceAllCleared: 'Filters cleared.',
  announceFiltersApplied: 'Filters applied.',
  announceDraftCleared: 'All choices cleared.',
};

/** Textes d'exemple de l'aperçu du theme builder. */
export interface LcThemePreviewSamples {
  readonly primary: string;
  readonly secondary: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly highlight: string;
  readonly neutral: string;
  readonly text: string;
  readonly textValue: string;
  readonly number: string;
  readonly select: string;
  readonly optionOne: string;
  readonly optionTwo: string;
  readonly checkbox: string;
  readonly switch: string;
  readonly invalid: string;
  readonly invalidMessage: string;
  readonly alertInfo: string;
  readonly alertSuccess: string;
  readonly alertWarning: string;
  readonly alertError: string;
  readonly alertText: string;
  readonly badge: string;
  readonly progress: string;
  readonly cardTitle: string;
  readonly cardSubtitle: string;
  readonly cardBody: string;
  readonly tableCaption: string;
  readonly colName: string;
  readonly colAmount: string;
  readonly colShare: string;
  readonly rowA: string;
  readonly rowB: string;
  readonly rowC: string;
  readonly tabOne: string;
  readonly tabTwo: string;
  readonly tabBody: string;
  readonly segmentOne: string;
  readonly segmentTwo: string;
  readonly segmentThree: string;
  readonly chartTitle: string;
  readonly chartDescription: string;
  readonly seriesOne: string;
  readonly seriesTwo: string;
  readonly seriesThree: string;
}

/** Textes du point d'entrée `theme-builder` (éditeur, rapport de contraste, aperçu, builder). */
export interface LcThemeBuilderLabels {
  readonly builderTitle: string;
  readonly settings: string;
  readonly mode: string;
  readonly modeSimple: string;
  readonly modeAdvanced: string;
  readonly groupsLabel: string;
  /** Groupes d'édition (identifiants de `themeGroups`). */
  readonly groups: Readonly<Record<string, string>>;
  readonly name: string;
  readonly nameHint: string;
  readonly base: string;
  readonly baseLight: string;
  readonly baseDark: string;
  readonly actions: string;
  readonly exportTokens: string;
  readonly exportCss: string;
  readonly copy: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly import: string;
  readonly importFileLabel: string;
  readonly importDone: (count: number) => string;
  readonly importRejected: string;
  readonly importNotJson: string;
  readonly importTooLarge: string;
  readonly reset: string;
  readonly exportBlocked: string;
  readonly colorPicker: (token: string) => string;
  readonly unitLabel: (token: string) => string;
  readonly valueModified: string;
  readonly useBaseValue: string;
  /** Jeton calculé à partir d'un autre : lié (suit la source) ou délié (valeur libre). */
  readonly linked: (token: string) => string;
  readonly unlinked: (token: string) => string;
  readonly derivedFrom: (source: string) => string;
  readonly density: string;
  readonly densityLabel: string;
  readonly densityCompact: string;
  readonly densityNormal: string;
  readonly densityComfortable: string;
  readonly densityCustom: string;
  readonly customFont: string;
  /** Piles de polices proposées (identifiants de `themeFontStacks`). */
  readonly fontStacks: Readonly<Record<string, string>>;
  /** Jetons du mode simple (chemin `sys` → libellé). */
  readonly tokens: Readonly<Record<string, string>>;
  readonly noSimpleTokens: string;
  readonly issue: (code: string, path: string, suggestion?: string) => string;
  readonly contrastTitle: string;
  readonly contrastColumnPair: string;
  readonly contrastColumnRatio: string;
  readonly contrastColumnRequired: string;
  readonly contrastColumnResult: string;
  readonly contrastPass: string;
  readonly contrastFail: string;
  readonly contrastSummary: (failing: number, total: number) => string;
  readonly contrastPair: (foreground: string, background: string) => string;
  readonly previewTitle: string;
  readonly previewButtons: string;
  readonly previewFields: string;
  readonly previewFeedback: string;
  readonly previewData: string;
  readonly previewChart: string;
  readonly previewNavigation: string;
  readonly previewSamples: LcThemePreviewSamples;
}

export interface LcChartSummaryInfo {
  readonly title: string;
  readonly seriesCount: number;
  readonly categoryCount: number;
  readonly first: string;
  readonly last: string;
  /** Valeur maximale formatée et position (série, catégorie). */
  readonly max?: { readonly value: string; readonly series: string; readonly category: string };
}

function summaryFr(info: LcChartSummaryInfo): string {
  const series = info.seriesCount === 1 ? '1 série' : `${info.seriesCount} séries`;
  const range = info.categoryCount > 1 ? `, de ${info.first} à ${info.last}` : info.first ? `, ${info.first}` : '';
  const max = info.max ? ` Valeur maximale : ${info.max.value} (${info.max.series}, ${info.max.category}).` : '';
  return `${info.title}, ${series}, ${info.categoryCount} ${info.categoryCount > 1 ? 'catégories' : 'catégorie'}${range}.${max}`;
}

function summaryEn(info: LcChartSummaryInfo): string {
  const series = info.seriesCount === 1 ? '1 series' : `${info.seriesCount} series`;
  const range = info.categoryCount > 1 ? `, from ${info.first} to ${info.last}` : info.first ? `, ${info.first}` : '';
  const max = info.max ? ` Maximum: ${info.max.value} (${info.max.series}, ${info.max.category}).` : '';
  return `${info.title}, ${series}, ${info.categoryCount} ${info.categoryCount > 1 ? 'categories' : 'category'}${range}.${max}`;
}

const THEME_BUILDER_FR: LcThemeBuilderLabels = {
  builderTitle: 'Theme builder',
  settings: 'Paramètres du thème',
  mode: 'Mode d\'édition',
  modeSimple: 'Simple',
  modeAdvanced: 'Avancé',
  groupsLabel: 'Groupes de paramètres',
  groups: { brand: 'Couleurs de marque', status: 'États', surface: 'Surfaces et texte', charts: 'Graphiques', typography: 'Typographie', shape: 'Formes (arrondis)', spacing: 'Espacements', shadows: 'Ombres' },
  name: 'Nom du thème',
  nameHint: 'Valeur de data-theme : minuscules, chiffres et tirets.',
  base: 'Base',
  baseLight: 'Clair',
  baseDark: 'Sombre',
  actions: 'Actions',
  exportTokens: 'Exporter .tokens.json',
  exportCss: 'Exporter .css',
  copy: 'Copier',
  copied: 'Thème copié dans le presse-papiers.',
  copyFailed: 'Copie impossible : le presse-papiers n\'est pas disponible.',
  import: 'Importer',
  importFileLabel: 'Fichier de thème au format DTCG (.tokens.json)',
  importDone: (count) => (count === 0 ? 'Thème importé : aucune surcharge.' : count === 1 ? 'Thème importé : 1 surcharge.' : `Thème importé : ${count} surcharges.`),
  importRejected: 'Import refusé :',
  importNotJson: 'Le fichier n\'est pas un JSON valide.',
  importTooLarge: 'Le fichier est trop volumineux (256 Kio au plus).',
  reset: 'Réinitialiser',
  exportBlocked: 'Export impossible tant que le thème est invalide.',
  colorPicker: (token) => `Sélecteur de couleur : ${token}`,
  unitLabel: (token) => `Unité : ${token}`,
  valueModified: 'Modifié',
  useBaseValue: 'Valeur de la base',
  linked: (token) => `${token} : calculé, cliquer pour le délier`,
  unlinked: (token) => `${token} : valeur libre, cliquer pour le lier`,
  derivedFrom: (source) => `Calculé à partir de ${source}`,
  density: 'Densité',
  densityLabel: 'Densité des espacements',
  densityCompact: 'Compacte',
  densityNormal: 'Normale',
  densityComfortable: 'Aérée',
  densityCustom: 'Personnalisée',
  customFont: 'Personnalisée',
  fontStacks: { base: 'Système', mono: 'Monospace système', rounded: 'Arrondie', humanist: 'Humaniste', serif: 'Avec empattements', transitional: 'Transitionnelle', 'system-mono': 'Chasse fixe' },
  tokens: { 'color.primary': 'Couleur principale', 'color.on-primary': 'Texte sur couleur principale', 'color.primary-container': 'Conteneur principal', 'color.on-primary-container': 'Texte du conteneur principal', 'color.on-secondary': 'Texte sur couleur secondaire', 'color.secondary-container': 'Conteneur secondaire', 'color.on-secondary-container': 'Texte du conteneur secondaire', 'color.on-neutral': 'Texte sur couleur neutre', 'color.focus-ring': 'Anneau de focus', 'color.secondary': 'Couleur secondaire', 'color.neutral': 'Couleur neutre', 'color.surface': 'Surface', 'color.background': 'Arrière-plan', 'radius.md': 'Arrondi', 'font.family.base': 'Police' },
  noSimpleTokens: 'Aucun paramètre en mode simple pour ce groupe.',
  issue: (code, path, suggestion) => {
    switch (code) {
      case 'invalid-name': return 'Le nom doit commencer par une lettre minuscule, puis lettres minuscules, chiffres ou tirets (48 caractères au plus).';
      case 'reserved-name': return 'Ce nom est réservé (« default » et « dark »).';
      case 'invalid-label': return 'Le libellé doit compter de 1 à 60 caractères.';
      case 'unknown-token': return suggestion ? `Jeton inconnu « ${path} » (vouliez-vous dire « ${suggestion} » ?).` : `Jeton inconnu « ${path} ».`;
      case 'not-editable': return `Le jeton « ${path} » n\'est pas modifiable.`;
      case 'invalid-value': return 'Valeur refusée pour ce type de jeton.';
      default: return 'Thème invalide.';
    }
  },
  contrastTitle: 'Contraste des couleurs',
  contrastColumnPair: 'Texte sur fond',
  contrastColumnRatio: 'Ratio',
  contrastColumnRequired: 'Seuil',
  contrastColumnResult: 'Résultat',
  contrastPass: 'Réussi',
  contrastFail: 'Échoué',
  contrastSummary: (failing, total) => (failing === 0 ? `Les ${total} paires respectent le contraste minimal.` : failing === 1 ? `1 paire sur ${total} est sous le contraste minimal.` : `${failing} paires sur ${total} sont sous le contraste minimal.`),
  contrastPair: (foreground, background) => `${foreground} sur ${background}`,
  previewTitle: 'Aperçu des composants',
  previewButtons: 'Boutons',
  previewFields: 'Champs',
  previewFeedback: 'Retours d\'état',
  previewData: 'Données',
  previewChart: 'Graphique',
  previewNavigation: 'Navigation',
  previewSamples: {
    primary: 'Principal', secondary: 'Secondaire', success: 'Succès', warning: 'Alerte', error: 'Erreur', highlight: 'Relief', neutral: 'Neutre',
    text: 'Champ texte', textValue: 'Valeur saisie', number: 'Montant', select: 'Liste', optionOne: 'Première option', optionTwo: 'Seconde option',
    checkbox: 'Case à cocher', switch: 'Interrupteur', invalid: 'Champ invalide', invalidMessage: 'Ce champ est obligatoire.',
    alertInfo: 'Information', alertSuccess: 'Enregistré', alertWarning: 'À vérifier', alertError: 'Échec',
    alertText: 'Texte d\'exemple sur fond de couleur de rôle.', badge: 'Badge', progress: 'Progression',
    cardTitle: 'Carte', cardSubtitle: 'Surface surélevée', cardBody: 'Le texte courant utilise la police et la couleur du thème.',
    tableCaption: 'Exemple de tableau', colName: 'Nom', colAmount: 'Montant', colShare: 'Part', rowA: 'Alpha', rowB: 'Bêta', rowC: 'Gamma',
    tabOne: 'Premier onglet', tabTwo: 'Second onglet', tabBody: 'Contenu de l\'onglet.', segmentOne: 'Un', segmentTwo: 'Deux', segmentThree: 'Trois',
    chartTitle: 'Évolution', chartDescription: 'Trois séries, huit années', seriesOne: 'Série A', seriesTwo: 'Série B', seriesThree: 'Série C',
  },
};

/** Nombres affichés dans les libellés de pagination : « 1 234 » (espace insécable en français). */
const frNumber = new Intl.NumberFormat('fr-FR');
const enNumber = new Intl.NumberFormat('en-US');

export const LC_LABELS_FR: LcLabels = {
  close: 'Fermer',
  loading: 'Chargement',
  noData: 'Aucune donnée',
  retry: 'Réessayer',
  showData: 'Voir les données',
  hideData: 'Masquer les données',
  skipToContent: 'Aller au contenu',
  openNavigation: 'Ouvrir la navigation',
  closeNavigation: 'Fermer la navigation',
  other: 'Autres',
  confirm: 'Confirmer',
  cancel: 'Annuler',
  details: 'Détails',
  increase: 'Augmenter',
  decrease: 'Diminuer',
  expandGroup: 'Déplier le groupe',
  collapseGroup: 'Replier le groupe',
  sortAscending: 'tri croissant',
  sortDescending: 'tri décroissant',
  total: 'Total',
  notifications: 'Notifications',
  showPassword: 'Afficher le mot de passe',
  hidePassword: 'Masquer le mot de passe',
  unallocated: 'Non réparti',
  truncatedRows: (count) => `${count} premières lignes affichées`,
  selectRow: 'Sélectionner la ligne',
  selectAll: 'Tout sélectionner',
  selectionCount: (selected, total) => `${selected} sélectionnées sur ${total}`,
  noValue: 'Non mesuré',
  pagination: 'Pagination',
  previousPage: 'Précédent',
  nextPage: 'Suivant',
  pageSize: 'Éléments par page',
  pageRange: (first, last, total) => (total === 0 ? '0 sur 0' : `${frNumber.format(first)} à ${frNumber.format(last)} sur ${frNumber.format(total)}`),
  pageStatus: (page, pageCount) => `Page ${frNumber.format(page)} sur ${frNumber.format(pageCount)}`,
  stepOf: (current, total) => `Étape ${current} sur ${total}`,
  stepBack: (name) => `Revenir à : ${name}`,
  stepGoTo: (position, name) => `Aller à l'étape ${position} : ${name}`,
  stepInvalid: '(à corriger)',
  stepOptionalHidden: '(facultative)',
  stepOptional: 'Facultative',
  stepAnswers: 'Voir vos réponses',
  copy: 'Copier',
  copied: 'Copié',
  copyFailed: 'Copie impossible',
  codeTruncated: (count) => `Texte tronqué aux ${count} premiers caractères`,
  logCopy: 'Copier le journal',
  logResume: 'Revenir en bas',
  logTruncated: (count) => (count === 1 ? '1 ligne plus ancienne masquée' : `${count} lignes plus anciennes masquées`),
  logEmpty: 'Aucune sortie pour l\'instant.',
  logLevelError: 'err',
  logLevelInfo: 'info',
  messageReceived: 'Message reçu',
  messageSent: 'Message envoyé',
  messageRestricted: 'Note à diffusion restreinte',
  fileUploadChoose: 'Choisir un fichier',
  fileUploadChooseMany: 'Choisir des fichiers',
  fileUploadDropHint: 'Glissez vos fichiers ici, ou',
  fileUploadList: 'Fichiers sélectionnés',
  fileUploadLimitReached: (max) => `Maximum atteint : ${max} ${max === 1 ? 'fichier' : 'fichiers'}. Vous ne pouvez plus en ajouter.`,
  fileUploadRemove: (name) => `Retirer ${name}`,
  fileUploadRetry: (name) => `Réessayer ${name}`,
  fileUploadRemoveShort: 'Retirer',
  fileUploadPending: 'En attente',
  fileUploadUploading: (progress) => (progress === null ? 'Envoi en cours…' : `Envoi en cours… ${progress} %`),
  fileUploadDone: 'Terminé',
  fileUploadFailed: 'Échec de l\'envoi',
  fileUploadProgress: (name) => `Envoi de ${name}`,
  fileUploadAnnounceDone: (name) => `${name} : envoi terminé`,
  fileUploadAnnounceRemoved: (name) => `${name} retiré`,
  fileSizeUnits: ['o', 'Ko', 'Mo', 'Go'],
  listEditorList: 'Éléments',
  listEditorAddLabel: 'Nouvel élément',
  listEditorAdd: 'Ajouter',
  listEditorEmpty: 'Aucun élément.',
  listEditorMoveUp: (label) => `Monter ${label}`,
  listEditorMoveDown: (label) => `Descendre ${label}`,
  listEditorRename: (label) => `Renommer ${label}`,
  listEditorRenameField: (label) => `Nouveau nom de ${label}`,
  listEditorSave: 'Enregistrer',
  listEditorToggle: (label) => `Actif : ${label}`,
  listEditorActive: 'Actif',
  listEditorInactive: 'Désactivé',
  listEditorLocked: 'Protégé',
  listEditorMinActive: (min) => (min === 1 ? 'Seul élément actif : il ne peut pas être désactivé.' : `Au moins ${min} éléments doivent rester actifs.`),
  listEditorRequired: 'Saisissez un libellé.',
  listEditorTooLong: (max) => `Le libellé ne peut pas dépasser ${max} caractères.`,
  listEditorDuplicate: 'Ce libellé existe déjà.',
  listEditorPosition: (label, position, total) => `${label}, position ${position} sur ${total}`,
  listEditorAnnounceAdded: (label, position) => `${label} ajouté en position ${position}.`,
  listEditorAnnounceActive: (label) => `${label} est actif.`,
  listEditorAnnounceInactive: (label) => `${label} est désactivé.`,
  comboboxNoResults: 'Aucun résultat',
  comboboxResultsCount: (count) => (count === 1 ? '1 résultat disponible' : `${count} résultats disponibles`),
  comboboxSearching: 'Recherche en cours',
  comboboxSearchUnavailable: 'Recherche indisponible pour le moment',
  comboboxTooManyRequests: 'Trop de recherches, réessayez dans un instant',
  comboboxRetry: 'Réessayer',
  comboboxChooseProposal: 'Choisissez une proposition dans la liste',
  comboboxClear: 'Effacer',
  comboboxMinLength: (count) => `Saisissez au moins ${count} caractères`,
  geoUnknownCode: (code) => `Code inconnu : ${code}`,
  category: 'Catégorie',
  part: 'Élément',
  value: 'Valeur',
  share: 'Part',
  chartMarker: 'Repère',
  chartAnnotation: 'Point annoté',
  chartSummary: summaryFr,
  themeBuilder: THEME_BUILDER_FR,
  dataTable: DATA_TABLE_FR,
  dateZoneDay: 'jj',
  dateZoneMonth: 'mm',
  dateZoneYear: 'aaaa',
  dateDayName: 'Jour',
  dateMonthName: 'Mois',
  dateYearName: 'Année',
  dateZoneAnnounce: (name, value) => `${name}, ${value ?? 'vide'}`,
  dateInputHint: 'Tapez la date, ou changez chaque zone avec les flèches haut et bas.',
  dateDayClamped: (day, month) => `Jour ramené au ${day} ${month}.`,
  dateChoose: 'Choisir une date',
  dateChange: (date) => `Changer la date, ${date}`,
  dateChoosePeriod: 'Choisir une période',
  dateToday: "Aujourd'hui",
  dateClear: 'Effacer la date',
  datePreviousMonth: 'Mois précédent',
  dateNextMonth: 'Mois suivant',
  dateChooseMonthOf: (title) => `${title} : choisir un mois`,
  dateChooseYearOf: (title) => `${title} : choisir une année`,
  datePreviousYear: 'Année précédente',
  dateNextYear: 'Année suivante',
  datePreviousYears: 'Années précédentes',
  dateNextYears: 'Années suivantes',
  dateYearsRange: (first, last) => `${first} à ${last}`,
  dateChooseStart: 'Choisissez la date de début.',
  dateStartPicked: (date) => `Début : ${date}. Choisissez la date de fin, ou cliquez sur « Sans date de fin ».`,
  dateChangeStart: 'Changer le début',
  dateNoEnd: 'Sans date de fin',
  dateClearPeriod: 'Effacer la période',
  dateNoneAllowed: 'Aucune date autorisée sur cette période.',
  datePeriodFrom: 'du',
  datePeriodTo: 'au',
  dateOnDay: (date) => `le ${date}`,
  dateLastWeek: 'La semaine dernière',
  dateThisMonth: 'Ce mois-ci',
  dateLastMonth: 'Le mois dernier',
  datePeriod: 'Période',
  dateChangePeriod: (text) => `Changer la période, ${text}`,
  dateStartingFrom: (date) => `à partir du ${date}`,
  dateOpenEnd: (date) => `Sans date de fin : tout depuis le ${date}.`,
  dateOpenStart: (date) => `Sans date de début : tout jusqu'au ${date}.`,
  dateCurrentPeriod: (period) => `Période : ${period} inclus. Cliquez un jour pour la changer.`,
  dateCurrentFrom: (date) => `Depuis le ${date}, sans date de fin. Cliquez un jour pour changer.`,
  dateCurrentUntil: (date) => `Jusqu'au ${date} inclus, sans date de début. Cliquez un jour pour changer.`,
  dateShortcuts: 'Raccourcis',
};

const THEME_BUILDER_EN: LcThemeBuilderLabels = {
  builderTitle: 'Theme builder',
  settings: 'Theme settings',
  mode: 'Editing mode',
  modeSimple: 'Simple',
  modeAdvanced: 'Advanced',
  groupsLabel: 'Setting groups',
  groups: { brand: 'Brand colors', status: 'Status', surface: 'Surfaces and text', charts: 'Charts', typography: 'Typography', shape: 'Shapes (radii)', spacing: 'Spacing', shadows: 'Shadows' },
  name: 'Theme name',
  nameHint: 'Value of data-theme: lowercase letters, digits and hyphens.',
  base: 'Base',
  baseLight: 'Light',
  baseDark: 'Dark',
  actions: 'Actions',
  exportTokens: 'Export .tokens.json',
  exportCss: 'Export .css',
  copy: 'Copy',
  copied: 'Theme copied to the clipboard.',
  copyFailed: 'Copy failed: the clipboard is not available.',
  import: 'Import',
  importFileLabel: 'Theme file in DTCG format (.tokens.json)',
  importDone: (count) => (count === 0 ? 'Theme imported: no override.' : count === 1 ? 'Theme imported: 1 override.' : `Theme imported: ${count} overrides.`),
  importRejected: 'Import rejected:',
  importNotJson: 'The file is not valid JSON.',
  importTooLarge: 'The file is too large (256 KiB at most).',
  reset: 'Reset',
  exportBlocked: 'Export is not possible while the theme is invalid.',
  colorPicker: (token) => `Color picker: ${token}`,
  unitLabel: (token) => `Unit: ${token}`,
  valueModified: 'Modified',
  useBaseValue: 'Base value',
  linked: (token) => `${token}: computed, click to unlink`,
  unlinked: (token) => `${token}: free value, click to link`,
  derivedFrom: (source) => `Computed from ${source}`,
  density: 'Density',
  densityLabel: 'Spacing density',
  densityCompact: 'Compact',
  densityNormal: 'Normal',
  densityComfortable: 'Comfortable',
  densityCustom: 'Custom',
  customFont: 'Custom',
  fontStacks: { base: 'System', mono: 'System monospace', rounded: 'Rounded', humanist: 'Humanist', serif: 'Serif', transitional: 'Transitional', 'system-mono': 'Fixed width' },
  tokens: { 'color.primary': 'Primary color', 'color.on-primary': 'Text on primary', 'color.primary-container': 'Primary container', 'color.on-primary-container': 'Primary container text', 'color.on-secondary': 'Text on secondary', 'color.secondary-container': 'Secondary container', 'color.on-secondary-container': 'Secondary container text', 'color.on-neutral': 'Text on neutral', 'color.focus-ring': 'Focus ring', 'color.secondary': 'Secondary color', 'color.neutral': 'Neutral color', 'color.surface': 'Surface', 'color.background': 'Background', 'radius.md': 'Corner radius', 'font.family.base': 'Font' },
  noSimpleTokens: 'No setting in simple mode for this group.',
  issue: (code, path, suggestion) => {
    switch (code) {
      case 'invalid-name': return 'The name must start with a lowercase letter, followed by lowercase letters, digits or hyphens (48 characters at most).';
      case 'reserved-name': return 'This name is reserved ("default" and "dark").';
      case 'invalid-label': return 'The label must be 1 to 60 characters long.';
      case 'unknown-token': return suggestion ? `Unknown token "${path}" (did you mean "${suggestion}"?).` : `Unknown token "${path}".`;
      case 'not-editable': return `The token "${path}" cannot be edited.`;
      case 'invalid-value': return 'Value rejected for this token type.';
      default: return 'Invalid theme.';
    }
  },
  contrastTitle: 'Color contrast',
  contrastColumnPair: 'Text on background',
  contrastColumnRatio: 'Ratio',
  contrastColumnRequired: 'Minimum',
  contrastColumnResult: 'Result',
  contrastPass: 'Pass',
  contrastFail: 'Fail',
  contrastSummary: (failing, total) => (failing === 0 ? `All ${total} pairs meet the minimum contrast.` : failing === 1 ? `1 pair out of ${total} is below the minimum contrast.` : `${failing} pairs out of ${total} are below the minimum contrast.`),
  contrastPair: (foreground, background) => `${foreground} on ${background}`,
  previewTitle: 'Component preview',
  previewButtons: 'Buttons',
  previewFields: 'Fields',
  previewFeedback: 'Feedback',
  previewData: 'Data',
  previewChart: 'Chart',
  previewNavigation: 'Navigation',
  previewSamples: {
    primary: 'Primary', secondary: 'Secondary', success: 'Success', warning: 'Warning', error: 'Error', highlight: 'Highlight', neutral: 'Neutral',
    text: 'Text field', textValue: 'Typed value', number: 'Amount', select: 'List', optionOne: 'First option', optionTwo: 'Second option',
    checkbox: 'Checkbox', switch: 'Switch', invalid: 'Invalid field', invalidMessage: 'This field is required.',
    alertInfo: 'Information', alertSuccess: 'Saved', alertWarning: 'Check this', alertError: 'Failed',
    alertText: 'Sample text on a role color background.', badge: 'Badge', progress: 'Progress',
    cardTitle: 'Card', cardSubtitle: 'Raised surface', cardBody: 'Body text uses the theme font and color.',
    tableCaption: 'Sample table', colName: 'Name', colAmount: 'Amount', colShare: 'Share', rowA: 'Alpha', rowB: 'Beta', rowC: 'Gamma',
    tabOne: 'First tab', tabTwo: 'Second tab', tabBody: 'Tab content.', segmentOne: 'One', segmentTwo: 'Two', segmentThree: 'Three',
    chartTitle: 'Trend', chartDescription: 'Three series, eight years', seriesOne: 'Series A', seriesTwo: 'Series B', seriesThree: 'Series C',
  },
};

export const LC_LABELS_EN: LcLabels = {
  close: 'Close',
  loading: 'Loading',
  noData: 'No data',
  retry: 'Retry',
  showData: 'Show data',
  hideData: 'Hide data',
  skipToContent: 'Skip to content',
  openNavigation: 'Open navigation',
  closeNavigation: 'Close navigation',
  other: 'Other',
  confirm: 'Confirm',
  cancel: 'Cancel',
  details: 'Details',
  increase: 'Increase',
  decrease: 'Decrease',
  expandGroup: 'Expand group',
  collapseGroup: 'Collapse group',
  sortAscending: 'ascending',
  sortDescending: 'descending',
  total: 'Total',
  notifications: 'Notifications',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  unallocated: 'Unallocated',
  truncatedRows: (count) => `First ${count} rows shown`,
  selectRow: 'Select row',
  selectAll: 'Select all',
  selectionCount: (selected, total) => `${selected} selected of ${total}`,
  noValue: 'Not measured',
  pagination: 'Pagination',
  previousPage: 'Previous',
  nextPage: 'Next',
  pageSize: 'Items per page',
  pageRange: (first, last, total) => (total === 0 ? '0 of 0' : `${enNumber.format(first)} to ${enNumber.format(last)} of ${enNumber.format(total)}`),
  pageStatus: (page, pageCount) => `Page ${enNumber.format(page)} of ${enNumber.format(pageCount)}`,
  stepOf: (current, total) => `Step ${current} of ${total}`,
  stepBack: (name) => `Back to: ${name}`,
  stepGoTo: (position, name) => `Go to step ${position}: ${name}`,
  stepInvalid: '(to fix)',
  stepOptionalHidden: '(optional)',
  stepOptional: 'Optional',
  stepAnswers: 'View your answers',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Copy failed',
  codeTruncated: (count) => `Text truncated to the first ${count} characters`,
  logCopy: 'Copy the log',
  logResume: 'Back to bottom',
  logTruncated: (count) => (count === 1 ? '1 older line hidden' : `${count} older lines hidden`),
  logEmpty: 'No output yet.',
  logLevelError: 'err',
  logLevelInfo: 'info',
  messageReceived: 'Received message',
  messageSent: 'Sent message',
  messageRestricted: 'Restricted note',
  fileUploadChoose: 'Choose a file',
  fileUploadChooseMany: 'Choose files',
  fileUploadDropHint: 'Drag your files here, or',
  fileUploadList: 'Selected files',
  fileUploadLimitReached: (max) => `Limit reached: ${max} ${max === 1 ? 'file' : 'files'}. You cannot add more.`,
  fileUploadRemove: (name) => `Remove ${name}`,
  fileUploadRetry: (name) => `Retry ${name}`,
  fileUploadRemoveShort: 'Remove',
  fileUploadPending: 'Waiting',
  fileUploadUploading: (progress) => (progress === null ? 'Uploading…' : `Uploading… ${progress}%`),
  fileUploadDone: 'Done',
  fileUploadFailed: 'Upload failed',
  fileUploadProgress: (name) => `Uploading ${name}`,
  fileUploadAnnounceDone: (name) => `${name}: upload complete`,
  fileUploadAnnounceRemoved: (name) => `${name} removed`,
  fileSizeUnits: ['B', 'KB', 'MB', 'GB'],
  listEditorList: 'Items',
  listEditorAddLabel: 'New item',
  listEditorAdd: 'Add',
  listEditorEmpty: 'No items.',
  listEditorMoveUp: (label) => `Move ${label} up`,
  listEditorMoveDown: (label) => `Move ${label} down`,
  listEditorRename: (label) => `Rename ${label}`,
  listEditorRenameField: (label) => `New name for ${label}`,
  listEditorSave: 'Save',
  listEditorToggle: (label) => `Active: ${label}`,
  listEditorActive: 'Active',
  listEditorInactive: 'Disabled',
  listEditorLocked: 'Protected',
  listEditorMinActive: (min) => (min === 1 ? 'Only active item: it cannot be disabled.' : `At least ${min} items must stay active.`),
  listEditorRequired: 'Enter a label.',
  listEditorTooLong: (max) => `The label cannot exceed ${max} characters.`,
  listEditorDuplicate: 'This label already exists.',
  listEditorPosition: (label, position, total) => `${label}, position ${position} of ${total}`,
  listEditorAnnounceAdded: (label, position) => `${label} added at position ${position}.`,
  listEditorAnnounceActive: (label) => `${label} is active.`,
  listEditorAnnounceInactive: (label) => `${label} is disabled.`,
  comboboxNoResults: 'No results',
  comboboxResultsCount: (count) => (count === 1 ? '1 result available' : `${count} results available`),
  comboboxSearching: 'Searching',
  comboboxSearchUnavailable: 'Search is unavailable at the moment',
  comboboxTooManyRequests: 'Too many searches, try again in a moment',
  comboboxRetry: 'Retry',
  comboboxChooseProposal: 'Choose a suggestion from the list',
  comboboxClear: 'Clear',
  comboboxMinLength: (count) => `Enter at least ${count} characters`,
  geoUnknownCode: (code) => `Unknown code: ${code}`,
  category: 'Category',
  part: 'Item',
  value: 'Value',
  share: 'Share',
  chartMarker: 'Marker',
  chartAnnotation: 'Annotated point',
  chartSummary: summaryEn,
  themeBuilder: THEME_BUILDER_EN,
  dataTable: DATA_TABLE_EN,
  dateZoneDay: 'dd',
  dateZoneMonth: 'mm',
  dateZoneYear: 'yyyy',
  dateDayName: 'Day',
  dateMonthName: 'Month',
  dateYearName: 'Year',
  dateZoneAnnounce: (name, value) => `${name}, ${value ?? 'empty'}`,
  dateInputHint: 'Type the date, or change each part with the up and down arrow keys.',
  dateDayClamped: (day, month) => `Day set to ${month} ${day}.`,
  dateChoose: 'Choose a date',
  dateChange: (date) => `Change date, ${date}`,
  dateChoosePeriod: 'Choose a period',
  dateToday: 'Today',
  dateClear: 'Clear date',
  datePreviousMonth: 'Previous month',
  dateNextMonth: 'Next month',
  dateChooseMonthOf: (title) => `${title}: choose a month`,
  dateChooseYearOf: (title) => `${title}: choose a year`,
  datePreviousYear: 'Previous year',
  dateNextYear: 'Next year',
  datePreviousYears: 'Previous years',
  dateNextYears: 'Next years',
  dateYearsRange: (first, last) => `${first} to ${last}`,
  dateChooseStart: 'Choose the start date.',
  dateStartPicked: (date) => `Start: ${date}. Choose the end date, or click "No end date".`,
  dateChangeStart: 'Change start date',
  dateNoEnd: 'No end date',
  dateClearPeriod: 'Clear period',
  dateNoneAllowed: 'No allowed date in this period.',
  datePeriodFrom: 'from',
  datePeriodTo: 'to',
  dateOnDay: (date) => date,
  dateLastWeek: 'Last week',
  dateThisMonth: 'This month',
  dateLastMonth: 'Last month',
  datePeriod: 'Period',
  dateChangePeriod: (text) => `Change period, ${text}`,
  dateStartingFrom: (date) => `starting ${date}`,
  dateOpenEnd: (date) => `No end date: everything from ${date}.`,
  dateOpenStart: (date) => `No start date: everything up to ${date}.`,
  dateCurrentPeriod: (period) => `Period: ${period} inclusive. Click a day to change it.`,
  dateCurrentFrom: (date) => `Since ${date}, no end date. Click a day to change.`,
  dateCurrentUntil: (date) => `Until ${date} inclusive, no start date. Click a day to change.`,
  dateShortcuts: 'Shortcuts',
};

export const LC_LABELS = new InjectionToken<LcLabels>('LC_LABELS', { providedIn: 'root', factory: () => LC_LABELS_FR });
