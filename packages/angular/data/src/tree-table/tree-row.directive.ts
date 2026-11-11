import type { FocusableOption } from '@angular/cdk/a11y';
import { Directive, ElementRef, inject } from '@angular/core';

/** Ligne focusable d'un `lc-tree-table` (interne) : élément géré par le `FocusKeyManager` du tableau. */
@Directive({ selector: 'tr[lcTreeRow]' })
export class LcTreeRowDirective implements FocusableOption {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  focus(): void {
    this.element.focus();
  }
}
