import { DialogRef } from '@angular/cdk/dialog';
import { InjectionToken } from '@angular/core';

/** Données passées au composant ouvert par `LcDialogService.open()` (`inject(LC_DIALOG_DATA)`). */
export const LC_DIALOG_DATA = new InjectionToken<unknown>('LC_DIALOG_DATA');

/** Contexte interne fourni à `lc-dialog` : identifiant du titre (aria-labelledby) et fermeture autorisée. */
export interface LcDialogContext {
  readonly titleId: string;
  readonly dismissible: boolean;
}
export const LC_DIALOG_CONTEXT = new InjectionToken<LcDialogContext>('LC_DIALOG_CONTEXT');

/** Référence d'un dialogue ouvert : injectable dans le composant ouvert pour se fermer avec un résultat. */
export class LcDialogRef<R = unknown> {
  /** Résolue à la fermeture avec le résultat (undefined si fermé par Échap, le fond ou sans résultat). */
  readonly closed: Promise<R | undefined>;

  constructor(private readonly cdkRef: Pick<DialogRef<R>, 'close' | 'closed'>) {
    this.closed = new Promise((resolve) => {
      cdkRef.closed.subscribe((result) => resolve(result));
    });
  }

  close(result?: R): void {
    this.cdkRef.close(result);
  }
}
