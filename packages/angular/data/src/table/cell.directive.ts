import { Directive, TemplateRef, inject, input } from '@angular/core';
import type { LcTableColumn } from './table-model';

export interface LcCellContext<T> {
  readonly $implicit: T;
  readonly column: LcTableColumn<T>;
}

/** Gabarit de cellule : `<ng-template lcCell="status" let-row>…</ng-template>`, pour la colonne d'identifiant `status`. */
@Directive({ selector: 'ng-template[lcCell]' })
export class LcCellDirective<T = unknown> {
  readonly lcCell = input.required<string>();
  readonly template = inject<TemplateRef<LcCellContext<T>>>(TemplateRef);
}
