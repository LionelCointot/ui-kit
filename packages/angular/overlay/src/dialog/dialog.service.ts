import { Dialog } from '@angular/cdk/dialog';
import { Injectable, Type, inject } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import { LcConfirmDialogComponent } from './confirm-dialog.component';
import { LC_DIALOG_CONTEXT, LC_DIALOG_DATA, LcDialogContext, LcDialogRef } from './dialog-ref';

export interface LcDialogConfig<D> {
  readonly data?: D;
  /** Défaut 'medium'. */
  readonly size?: 'small' | 'medium' | 'large' | 'fullscreen';
  /** Fermeture par Échap, clic sur le fond et bouton de fermeture ; défaut true. */
  readonly dismissible?: boolean;
  /** Nom accessible ; sinon le titre de `lc-dialog`. */
  readonly ariaLabel?: string;
}

export interface LcConfirmOptions {
  readonly title: string;
  readonly message: string;
  /** Défaut : `LC_LABELS.confirm`. */
  readonly confirmLabel?: string;
  /** Défaut : `LC_LABELS.cancel`. */
  readonly cancelLabel?: string;
  /** Bouton de confirmation en `themeColor="error"`. */
  readonly destructive?: boolean;
}

/**
 * Dialogues modaux sur CDK Dialog : focus piégé puis restauré, premier élément focusable ciblé,
 * empilement géré (Échap ferme le plus haut). Le composant ouvert utilise `lc-dialog` pour sa mise en page.
 */
@Injectable({ providedIn: 'root' })
export class LcDialogService {
  private readonly dialog = inject(Dialog);

  open<C, D = unknown, R = unknown>(component: Type<C>, config: LcDialogConfig<D> = {}): LcDialogRef<R> {
    return this.openDialog<C, D, R>(component, config, 'dialog');
  }

  /** Demande de confirmation : résout `true` si l'utilisateur confirme, `false` sinon. */
  async confirm(options: LcConfirmOptions): Promise<boolean> {
    const ref = this.openDialog<LcConfirmDialogComponent, LcConfirmOptions, boolean>(
      LcConfirmDialogComponent, { data: options, size: 'small' }, 'alertdialog');
    return (await ref.closed) === true;
  }

  private openDialog<C, D, R>(component: Type<C>, config: LcDialogConfig<D>, role: 'dialog' | 'alertdialog'): LcDialogRef<R> {
    const context: LcDialogContext = { titleId: lcUniqueId('dialog-title'), dismissible: config.dismissible ?? true };
    let lcRef: LcDialogRef<R> | undefined;
    this.dialog.open<R, D, C>(component, {
      role,
      data: config.data ?? null,
      ariaLabel: config.ariaLabel ?? null,
      ariaLabelledBy: config.ariaLabel ? null : context.titleId,
      disableClose: !context.dismissible,
      panelClass: ['lc-dialog-panel', `lc-dialog-panel--${config.size ?? 'medium'}`],
      backdropClass: 'lc-dialog-backdrop',
      providers: (cdkRef) => {
        lcRef = new LcDialogRef<R>(cdkRef);
        return [
          { provide: LcDialogRef, useValue: lcRef },
          { provide: LC_DIALOG_DATA, useValue: config.data },
          { provide: LC_DIALOG_CONTEXT, useValue: context },
        ];
      },
    });
    if (!lcRef) {
      throw new Error('[LcDialogService] Le dialogue n\'a pas pu être créé.');
    }
    return lcRef;
  }
}
