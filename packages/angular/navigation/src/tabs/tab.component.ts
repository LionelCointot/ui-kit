import { ChangeDetectionStrategy, Component, Directive, TemplateRef, booleanAttribute, contentChild, inject, input, viewChild } from '@angular/core';

/** Marque le contenu paresseux d'un onglet : `<ng-template lcTabContent>…</ng-template>`, créé à la première sélection. */
@Directive({ selector: 'ng-template[lcTabContent]' })
export class LcTabContentDirective {
  readonly template = inject(TemplateRef);
}

/**
 * Onglet de `lc-tabs`. Le contenu est soit un `<ng-template lcTabContent>` (paresseux),
 * soit le contenu projeté directement dans `lc-tab`.
 */
@Component({
  selector: 'lc-tab',
  template: '<ng-template #body><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: none' },
})
export class LcTabComponent {
  /** Identifiant de l'onglet (valeur de `selected` de `lc-tabs`). */
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly icon = input<string>();

  readonly lazyContent = contentChild(LcTabContentDirective);
  private readonly body = viewChild.required<TemplateRef<unknown>>('body');

  /** Gabarit rendu dans le panneau. */
  contentTemplate(): TemplateRef<unknown> {
    return this.lazyContent()?.template ?? this.body();
  }
}
