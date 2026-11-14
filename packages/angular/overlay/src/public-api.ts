/*
 * API publique du point d'entrée @lionelcointot/ui-angular/overlay : dialogues, tiroirs latéraux (CDK Dialog) et info-bulles.
 */
export { LC_DIALOG_DATA, LcDialogRef } from './dialog/dialog-ref';
export * from './dialog/dialog.service';
export * from './dialog/dialog.component';
export * from './tooltip/tooltip.directive';
export { LC_DRAWER_DATA, LcDrawerRef } from './drawer/drawer-ref';
export type { LcDrawerSide, LcDrawerSize } from './drawer/drawer-ref';
export * from './drawer/drawer.service';
export * from './drawer/drawer.component';
export * from './drawer/drawer-initial-focus.directive';
