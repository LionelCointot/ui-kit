import { Directive, TemplateRef, inject, input } from '@angular/core';

/** Contexte du gabarit d'option : `let-item`, `let-text="text"` (texte saisi), `let-selected="selected"`. */
export interface LcComboboxOptionContext<T> {
  readonly $implicit: T;
  /** Texte saisi, à passer à `lcHighlightTerm` pour surligner les correspondances. */
  readonly text: string;
  readonly selected: boolean;
}

/**
 * Gabarit facultatif d'une option de `lc-combobox` :
 * `<ng-template lcComboboxOption [lcComboboxOptionOf]="items" let-item let-text="text">…</ng-template>`.
 * `lcComboboxOptionOf` ne sert qu'au typage de `let-item` dans le gabarit.
 */
@Directive({ selector: 'ng-template[lcComboboxOption]' })
export class LcComboboxOptionDirective<T = unknown> {
  readonly template = inject<TemplateRef<LcComboboxOptionContext<T>>>(TemplateRef);
  /** Indice de type pour `let-item` (la valeur n'est pas utilisée). */
  readonly lcComboboxOptionOf = input<readonly T[] | T | null>(null);

  static ngTemplateContextGuard<T>(_directive: LcComboboxOptionDirective<T>, context: unknown): context is LcComboboxOptionContext<T> {
    return true;
  }
}
