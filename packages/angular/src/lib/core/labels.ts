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
  readonly unallocated: string;
  readonly truncatedRows: (count: number) => string;
  /** En-tête de la première colonne de la vue tableau d'un graphique (catégories). */
  readonly category: string;
  /** En-tête de la colonne des éléments d'une barre segmentée. */
  readonly part: string;
  readonly value: string;
  readonly share: string;
  /** Résumé lu par les technologies d'assistance pour un graphique. */
  readonly chartSummary: (info: LcChartSummaryInfo) => string;
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
  unallocated: 'Non réparti',
  truncatedRows: (count) => `${count} premières lignes affichées`,
  category: 'Catégorie',
  part: 'Élément',
  value: 'Valeur',
  share: 'Part',
  chartSummary: summaryFr,
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
  unallocated: 'Unallocated',
  truncatedRows: (count) => `First ${count} rows shown`,
  category: 'Category',
  part: 'Item',
  value: 'Value',
  share: 'Share',
  chartSummary: summaryEn,
};

export const LC_LABELS = new InjectionToken<LcLabels>('LC_LABELS', { providedIn: 'root', factory: () => LC_LABELS_FR });
