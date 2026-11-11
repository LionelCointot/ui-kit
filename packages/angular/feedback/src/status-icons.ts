import { LcStatusKind } from '@lionelcointot/ui-angular';

/** États portés par `lc-status-badge` : les quatre états des alertes, plus la mise en relief et le neutre. */
export type LcStatusBadgeKind = LcStatusKind | 'highlight' | 'neutral';

/** Icône associée à chaque état : l'information n'est jamais portée par la seule couleur. */
export const LC_STATUS_ICONS: Readonly<Record<LcStatusBadgeKind, string>> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-x',
  highlight: 'activity',
  neutral: 'minus',
};
