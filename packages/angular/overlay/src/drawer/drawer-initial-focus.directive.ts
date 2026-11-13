import { Directive } from '@angular/core';

/**
 * Désigne l'élément qui reçoit le focus à l'ouverture d'un tiroir (sinon le premier contrôle focalisable).
 * S'appuie sur l'attribut `cdkFocusInitial` du piège à focus du CDK.
 */
@Directive({
  selector: '[lcDrawerInitialFocus]',
  host: { cdkFocusInitial: '' },
})
export class LcDrawerInitialFocusDirective {}
