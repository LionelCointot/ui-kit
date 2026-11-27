import { Dialog } from '@angular/cdk/dialog';
import { EnvironmentInjector, Injectable, Injector, Type, afterNextRender, inject, signal } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import { LcConfirmDialogComponent } from './confirm-dialog.component';
import { LC_DIALOG_CONTEXT, LC_DIALOG_DATA, LcDialogContext, LcDialogRef, lcCloseOnDismiss } from './dialog-ref';
import { lcDialogEnter, lcOverlayLeave } from './overlay-motion';
import { lcOpenInSheet, lcSheetPresentation } from './sheet-presenter';

export interface LcDialogConfig<D> {
  readonly data?: D;
  /** Défaut 'medium'. */
  readonly size?: 'small' | 'medium' | 'large' | 'fullscreen';
  /** Fermeture par Échap, clic sur le fond et bouton de fermeture ; défaut true. */
  readonly dismissible?: boolean;
  /** Nom accessible ; sinon le titre de `lc-dialog`. */
  readonly ariaLabel?: string;
  /**
   * Rôle ARIA du dialogue : `alertdialog` pour un message qui interrompt et attend une réponse (confirmation, action destructive) ;
   * défaut `dialog`.
   */
  readonly role?: 'dialog' | 'alertdialog';
  /** `id` de l'élément qui décrit le dialogue (le message d'un `alertdialog`) ; relié par `aria-describedby`. */
  readonly ariaDescribedBy?: string;
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
 * Il s'ouvre depuis l'élément actif à l'ouverture (le déclencheur). Sous 768 px, un dialogue fermable est présenté en `lc-sheet` (feuille du bas) ;
 * un dialogue `dismissible: false` garde la carte, la feuille se fermant d'elle-même par Échap, la croix et le geste.
 */
@Injectable({ providedIn: 'root' })
export class LcDialogService {
  private readonly dialog = inject(Dialog);
  private readonly environment = inject(EnvironmentInjector);
  private readonly injector = inject(Injector);

  open<C, D = unknown, R = unknown>(component: Type<C>, config: LcDialogConfig<D> = {}): LcDialogRef<R> {
    return this.openDialog<C, D, R>(component, config, config.role ?? 'dialog');
  }

  /** Demande de confirmation : résout `true` si l'utilisateur confirme, `false` sinon. */
  async confirm(options: LcConfirmOptions): Promise<boolean> {
    const ref = this.openDialog<LcConfirmDialogComponent, LcConfirmOptions, boolean>(
      LcConfirmDialogComponent, { data: options, size: 'small' }, 'alertdialog');
    return (await ref.closed) === true;
  }

  private openDialog<C, D, R>(component: Type<C>, config: LcDialogConfig<D>, role: 'dialog' | 'alertdialog'): LcDialogRef<R> {
    const dismissible = config.dismissible ?? true;
    const trigger = document.activeElement === document.body ? null : document.activeElement;
    const sheetTitle = lcSheetPresentation() && dismissible ? signal(config.ariaLabel ?? '') : undefined;
    const context: LcDialogContext = { titleId: lcUniqueId('dialog-title'), dismissible, sheetTitle };
    const providers = (ref: LcDialogRef<R>) => [
      { provide: LcDialogRef, useValue: ref },
      { provide: LC_DIALOG_DATA, useValue: config.data },
      { provide: LC_DIALOG_CONTEXT, useValue: context },
    ];
    if (sheetTitle) {
      return lcOpenInSheet<R, LcDialogRef<R>>(this.environment, {
        component, title: sheetTitle, role, ariaDescribedBy: config.ariaDescribedBy,
        makeRef: (handle, leave) => new LcDialogRef<R>(handle, leave), providers,
      });
    }
    let lcRef: LcDialogRef<R> | undefined;
    const cdkRef = this.dialog.open<R, D, C>(component, {
      role,
      ariaModal: true,
      data: config.data ?? null,
      ariaLabel: config.ariaLabel ?? null,
      ariaLabelledBy: config.ariaLabel ? null : context.titleId,
      ariaDescribedBy: config.ariaDescribedBy ?? null,
      // Échap et fond gérés ici (sortie animée), comme le tiroir.
      disableClose: true,
      panelClass: ['lc-dialog-panel', `lc-dialog-panel--${config.size ?? 'medium'}`],
      backdropClass: 'lc-dialog-backdrop',
      providers: (ref) => {
        lcRef = new LcDialogRef<R>(ref, () => lcOverlayLeave(ref.overlayRef, 'dialog'));
        lcCloseOnDismiss(ref, lcRef, { escape: dismissible, backdrop: dismissible });
        return providers(lcRef);
      },
    });
    if (!lcRef) {
      throw new Error('[LcDialogService] Le dialogue n\'a pas pu être créé.');
    }
    // Après le rendu : le dialogue est en place, l'origine se mesure dans son repère.
    afterNextRender(() => lcDialogEnter(cdkRef.overlayRef, trigger), { injector: this.injector });
    return lcRef;
  }
}
