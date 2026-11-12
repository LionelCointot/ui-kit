import { Directive, TemplateRef, inject, input } from '@angular/core';
import type { LcTableColumn } from './table-model';

export interface LcCellContext<T> {
  readonly $implicit: T;
  readonly column: LcTableColumn<T>;
  /** Niveau du nœud (1 = racine) : fourni par `lc-tree-table` seulement. */
  readonly level?: number;
}

/** Gabarit de cellule : `<ng-template lcCell="status" let-row>…</ng-template>`, pour la colonne d'identifiant `status`.
 * Dans `lc-tree-table`, le contexte fournit aussi `level` : `let-level="level"`. */
@Directive({ selector: 'ng-template[lcCell]' })
export class LcCellDirective<T = unknown> {
  readonly lcCell = input.required<string>();
  readonly template = inject<TemplateRef<LcCellContext<T>>>(TemplateRef);
}
