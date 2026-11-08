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
};

export const LC_LABELS = new InjectionToken<LcLabels>('LC_LABELS', { providedIn: 'root', factory: () => LC_LABELS_FR });
