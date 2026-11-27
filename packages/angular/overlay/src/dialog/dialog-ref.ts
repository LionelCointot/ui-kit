import type { DialogRef } from '@angular/cdk/dialog';
import { InjectionToken, type WritableSignal } from '@angular/core';
import type { Observable } from 'rxjs';

/** Données passées au composant ouvert par `LcDialogService.open()` (`inject(LC_DIALOG_DATA)`). */
export const LC_DIALOG_DATA = new InjectionToken<unknown>('LC_DIALOG_DATA');

/** Contexte interne fourni à `lc-dialog` : identifiant du titre (aria-labelledby) et fermeture autorisée. */
export interface LcDialogContext {
  readonly titleId: string;
  readonly dismissible: boolean;
  /** Présent quand le dialogue est présenté en `lc-sheet` (sous 768 px) : la feuille porte le titre, `lc-dialog` y écrit le sien et masque son en-tête. */
  readonly sheetTitle?: WritableSignal<string>;
}
export const LC_DIALOG_CONTEXT = new InjectionToken<LcDialogContext>('LC_DIALOG_CONTEXT');

/** Ce que `LcDialogRef` attend de ce qui porte le dialogue (CDK Dialog, ou la feuille) : `closed` émet à la fermeture effective, `close` la déclenche. @internal */
export interface LcDialogHandle<R> {
  readonly closed: Observable<R | undefined>;
  close(result?: R): void;
}

/** Référence d'un dialogue ouvert : injectable dans le composant ouvert pour se fermer avec un résultat. */
export class LcDialogRef<R = unknown> {
  /** Résolue à la fin de la sortie animée avec le résultat (undefined si fermé par Échap, le fond ou sans résultat). */
  readonly closed: Promise<R | undefined>;
  private closing = false;
  private done = false;

  /** `leave` joue la sortie animée et se résout quand elle est finie (voir `overlay-motion.ts`, `sheet-presenter.ts`). */
  constructor(private readonly handle: LcDialogHandle<R>, private readonly leave: () => Promise<void>) {
    this.closed = new Promise((resolve) => {
      handle.closed.subscribe((result) => {
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
    void this.leave().then(() => {
      if (!this.done) this.handle.close(result);
    });
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
