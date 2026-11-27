import { InjectionToken, type WritableSignal } from '@angular/core';
import { Observable, from } from 'rxjs';
import { LcDialogRef } from '../dialog/dialog-ref';

/** Données passées au composant ouvert par `LcDrawerService.open()` (`inject(LC_DRAWER_DATA)`). */
export const LC_DRAWER_DATA = new InjectionToken<unknown>('LC_DRAWER_DATA');

export type LcDrawerSide = 'start' | 'end';
export type LcDrawerSize = 'small' | 'medium' | 'large';

/** Contexte interne fourni à `lc-drawer` : identifiant du titre (aria-labelledby), côté d'ouverture et fermeture autorisée. */
export interface LcDrawerContext {
  readonly titleId: string;
  readonly side: LcDrawerSide;
  readonly dismissible: boolean;
  /** Présent quand le tiroir est présenté en `lc-sheet` (sous 768 px), comme `LcDialogContext.sheetTitle`. */
  readonly sheetTitle?: WritableSignal<string>;
}
export const LC_DRAWER_CONTEXT = new InjectionToken<LcDrawerContext>('LC_DRAWER_CONTEXT');

/** Référence d'un tiroir ouvert : injectable dans le composant ouvert pour se fermer avec un résultat. */
export class LcDrawerRef<R = unknown> extends LcDialogRef<R> {
  /** Émet une fois, à la fermeture, avec le résultat (undefined si fermé par Échap, le voile ou sans résultat). */
  afterClosed(): Observable<R | undefined> {
    return from(this.closed);
  }
}
