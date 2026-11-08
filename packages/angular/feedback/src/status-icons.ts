import { LcStatusKind } from '@lionelcointot/ui-angular';

/** Icône associée à chaque état : l'information n'est jamais portée par la seule couleur. */
export const LC_STATUS_ICONS: Readonly<Record<LcStatusKind, string>> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-x',
};
