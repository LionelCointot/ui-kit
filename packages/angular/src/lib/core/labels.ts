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
  /** Jauge (`lc-meter`) : texte lu quand la valeur n'est pas mesurée. */
  readonly noValue: string;
  /** Pagination (`lc-paginator`). */
  readonly pagination: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly pageSize: string;
  readonly pageRange: (first: number, last: number, total: number) => string;
  readonly pageStatus: (page: number, pageCount: number) => string;
  /** Bloc de code (`lc-code-block`). */
  readonly copy: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly codeTruncated: (count: number) => string;
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
}

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
  noValue: 'Non mesuré',
  pagination: 'Pagination',
  previousPage: 'Précédent',
  nextPage: 'Suivant',
  pageSize: 'Éléments par page',
  pageRange: (first, last, total) => (total === 0 ? '0 sur 0' : `${first} à ${last} sur ${total}`),
  pageStatus: (page, pageCount) => `Page ${page} sur ${pageCount}`,
  copy: 'Copier',
  copied: 'Copié',
  copyFailed: 'Copie impossible',
  codeTruncated: (count) => `Texte tronqué aux ${count} premiers caractères`,
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
  noValue: 'Not measured',
  pagination: 'Pagination',
  previousPage: 'Previous',
  nextPage: 'Next',
  pageSize: 'Items per page',
  pageRange: (first, last, total) => (total === 0 ? '0 of 0' : `${first} to ${last} of ${total}`),
  pageStatus: (page, pageCount) => `Page ${page} of ${pageCount}`,
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Copy failed',
  codeTruncated: (count) => `Text truncated to the first ${count} characters`,
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
};

export const LC_LABELS = new InjectionToken<LcLabels>('LC_LABELS', { providedIn: 'root', factory: () => LC_LABELS_FR });
