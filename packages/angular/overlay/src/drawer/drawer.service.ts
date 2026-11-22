import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { Injectable, Type, inject } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import { lcCloseOnDismiss } from '../dialog/dialog-ref';
import {
  LC_DRAWER_CONTEXT, LC_DRAWER_DATA, LcDrawerContext, LcDrawerRef, LcDrawerSide, LcDrawerSize,
} from './drawer-ref';

export interface LcDrawerConfig<D> {
  readonly data?: D;
  /** Bord d'ouverture ; défaut 'end' (à droite en écriture de gauche à droite). */
  readonly side?: LcDrawerSide;
  /** Largeur : 24, 32 ou 40 rem ; défaut 'medium'. Plein écran sous 768 px. */
  readonly size?: LcDrawerSize;
  /** Fermeture par Échap, clic sur le voile et bouton de fermeture ; défaut true (comme `LcDialogService`). */
  readonly dismissible?: boolean;
  /** Nom accessible ; sinon le titre de `lc-drawer`. */
  readonly ariaLabel?: string;
}

/**
 * Tiroirs latéraux modaux sur CDK Dialog (même mécanique que `LcDialogService`) : focus piégé puis restauré,
 * défilement de la page verrouillé, empilement géré (un dialogue ouvert depuis le tiroir passe au-dessus).
 * Le composant ouvert utilise `lc-drawer` pour sa mise en page.
 */
@Injectable({ providedIn: 'root' })
export class LcDrawerService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);

  open<C, D = unknown, R = unknown>(component: Type<C>, config: LcDrawerConfig<D> = {}): LcDrawerRef<R> {
    const side = config.side ?? 'end';
    const dismissible = config.dismissible ?? true;
    const context: LcDrawerContext = { titleId: lcUniqueId('drawer-title'), side, dismissible };
    const position = this.overlay.position().global().top('0');
    let lcRef: LcDrawerRef<R> | undefined;
    this.dialog.open<R, D, C>(component, {
      role: 'dialog',
      ariaModal: true,
      data: config.data ?? null,
      ariaLabel: config.ariaLabel ?? null,
      ariaLabelledBy: config.ariaLabel ? null : context.titleId,
      // Fermeture gérée ici : le CDK ne sait pas séparer Échap et clic sur le voile, ni jouer la sortie animée.
      disableClose: true,
      positionStrategy: side === 'end' ? position.end('0') : position.start('0'),
      panelClass: ['lc-drawer-panel', `lc-drawer-panel--${side}`, `lc-drawer-panel--${config.size ?? 'medium'}`],
      backdropClass: 'lc-drawer-backdrop',
      providers: (cdkRef) => {
        lcRef = new LcDrawerRef<R>(cdkRef);
        lcCloseOnDismiss(cdkRef, lcRef, { escape: dismissible, backdrop: dismissible });
        return [
          { provide: LcDrawerRef, useValue: lcRef },
          { provide: LC_DRAWER_DATA, useValue: config.data },
          { provide: LC_DRAWER_CONTEXT, useValue: context },
        ];
      },
    });
    if (!lcRef) {
      throw new Error('[LcDrawerService] Le tiroir n\'a pas pu être créé.');
    }
    return lcRef;
  }
}
