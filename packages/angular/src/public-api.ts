/*
 * API publique du point d'entrée principal @lionelcointot/ui-angular :
 * types communs, configuration, libellés, formats, pipes, thème, bouton, icône,
 * indicateur de chargement, squelette et avatar.
 */
export * from './lib/core/types';
export * from './lib/core/labels';
export * from './lib/core/options';
export * from './lib/core/provide-ui-kit';
export * from './lib/core/number-parsing';
export * from './lib/core/format.service';
export * from './lib/core/pipes';
export * from './lib/core/theme.service';
export type { LcThemeBase, LcThemeDefinition } from '@lionelcointot/ui-tokens/theme';
export * from './lib/core/id';
export * from './lib/core/data-state';
export * from './lib/core/safe-text';
export { LC_DEFAULT_ICONS } from './lib/icon/default-icons';
export { LC_ICONS, provideLcIcons } from './lib/icon/icons';
export * from './lib/icon/icon.component';
export * from './lib/avatar/avatar.component';
export * from './lib/button/button.component';
export * from './lib/button/button-group.component';
export * from './lib/theme-toggle/theme-toggle.component';
export * from './lib/spinner/spinner.component';
export * from './lib/skeleton/skeleton.component';
export * from './lib/truncate/truncate.directive';
export * from './lib/motion';
export * from './lib/navigation-registry';
