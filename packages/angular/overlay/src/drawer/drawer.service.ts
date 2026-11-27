import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { EnvironmentInjector, Injectable, Injector, Type, afterNextRender, inject, signal } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import { lcCloseOnDismiss } from '../dialog/dialog-ref';
import { lcDrawerEnter, lcOverlayLeave } from '../dialog/overlay-motion';
import { lcOpenInSheet, lcSheetPresentation } from '../dialog/sheet-presenter';
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
 * Le composant ouvert utilise `lc-drawer` pour sa mise en page. Sous 768 px, un tiroir fermable est présenté en `lc-sheet` (feuille du bas) ;
 * un tiroir `dismissible: false` garde le panneau plein écran.
 */
@Injectable({ providedIn: 'root' })
export class LcDrawerService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly environment = inject(EnvironmentInjector);
  private readonly injector = inject(Injector);

  open<C, D = unknown, R = unknown>(component: Type<C>, config: LcDrawerConfig<D> = {}): LcDrawerRef<R> {
    const side = config.side ?? 'end';
    const dismissible = config.dismissible ?? true;
    const sheetTitle = lcSheetPresentation() && dismissible ? signal(config.ariaLabel ?? '') : undefined;
    const context: LcDrawerContext = { titleId: lcUniqueId('drawer-title'), side, dismissible, sheetTitle };
    const providers = (ref: LcDrawerRef<R>) => [
      { provide: LcDrawerRef, useValue: ref },
      { provide: LC_DRAWER_DATA, useValue: config.data },
      { provide: LC_DRAWER_CONTEXT, useValue: context },
    ];
    if (sheetTitle) {
      return lcOpenInSheet<R, LcDrawerRef<R>>(this.environment, {
        component, title: sheetTitle, role: 'dialog',
        makeRef: (handle, leave) => new LcDrawerRef<R>(handle, leave), providers,
      });
    }
    const position = this.overlay.position().global().top('0');
    let lcRef: LcDrawerRef<R> | undefined;
    const cdkRef = this.dialog.open<R, D, C>(component, {
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
      providers: (ref) => {
        lcRef = new LcDrawerRef<R>(ref, () => lcOverlayLeave(ref.overlayRef, 'drawer', side));
        lcCloseOnDismiss(ref, lcRef, { escape: dismissible, backdrop: dismissible });
        return providers(lcRef);
      },
    });
    if (!lcRef) {
      throw new Error('[LcDrawerService] Le tiroir n\'a pas pu être créé.');
    }
    afterNextRender(() => lcDrawerEnter(cdkRef.overlayRef, side), { injector: this.injector });
    return lcRef;
  }
}
