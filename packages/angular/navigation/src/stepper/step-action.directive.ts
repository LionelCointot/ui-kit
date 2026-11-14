import { Directive, TemplateRef, inject } from '@angular/core';
import type { LcStep } from './stepper.component';

/** Contexte du gabarit d'action : `let-step` donne l'étape dont les actions sont rendues. */
export interface LcStepActionContext {
  readonly $implicit: LcStep;
}

/**
 * Gabarit des actions d'une étape de `lc-stepper` en variante `rail` (ex. « Modifier ») :
 * `<ng-template lcStepAction let-step><button type="button" (click)="edit(step.id)">Modifier</button></ng-template>`.
 * Rendu une fois par étape, sous sa réponse ; à l'application de décider quelles étapes en portent (`@if`).
 */
@Directive({ selector: 'ng-template[lcStepAction]' })
export class LcStepActionDirective {
  readonly template = inject<TemplateRef<LcStepActionContext>>(TemplateRef);

  static ngTemplateContextGuard(_directive: LcStepActionDirective, context: unknown): context is LcStepActionContext {
    return true;
  }
}
