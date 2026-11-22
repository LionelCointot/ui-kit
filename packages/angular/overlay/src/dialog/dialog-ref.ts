import { DialogRef } from '@angular/cdk/dialog';
import { InjectionToken } from '@angular/core';
import { LC_OVERLAY_CLOSING_CLASS, lcAnimationsEnd } from '@lionelcointot/ui-angular';

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
  /** Résolue à la fin de la sortie animée avec le résultat (undefined si fermé par Échap, le fond ou sans résultat). */
  readonly closed: Promise<R | undefined>;
  private closing = false;
  private done = false;

  constructor(private readonly cdkRef: Pick<DialogRef<R>, 'close' | 'closed' | 'overlayRef'>) {
    this.closed = new Promise((resolve) => {
      cdkRef.closed.subscribe((result) => {
        this.done = true;
        resolve(result);
      });
    });
  }

  /**
   * Ferme avec la sortie animée : la fermeture effective (et `closed`) vient à la fin de la sortie. Asynchrone ; un second appel est sans effet,
   * le premier résultat est conservé.
   */
  close(result?: R): void {
    if (this.closing) return;
    this.closing = true;
    void this.animateOut().then(() => {
      if (!this.done) this.cdkRef.close(result);
    });
  }

  private async animateOut(): Promise<void> {
    const { overlayElement, backdropElement } = this.cdkRef.overlayRef;
    overlayElement.classList.add(LC_OVERLAY_CLOSING_CLASS);
    backdropElement?.classList.remove('cdk-overlay-backdrop-showing');
    // Sans les descendants : une animation du contenu ne retarde pas la fermeture.
    await lcAnimationsEnd(overlayElement, { subtree: false });
  }
}

/** Échap et clic sur le fond passent par la sortie animée (le CDK ferait une fermeture sèche) ; `disableClose: true` côté CDK. @internal */
export function lcCloseOnDismiss<R>(cdkRef: Pick<DialogRef<R>, 'backdropClick' | 'keydownEvents'>, ref: Pick<LcDialogRef<R>, 'close'>, on: { escape: boolean; backdrop: boolean }): void {
  if (on.backdrop) cdkRef.backdropClick.subscribe(() => ref.close());
  if (on.escape) {
    cdkRef.keydownEvents.subscribe((event) => {
      if (event.key === 'Escape' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        ref.close();
      }
    });
  }
}
