import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, Directive, ElementRef, TemplateRef, booleanAttribute, computed, contentChild,
  effect, inject, input, linkedSignal, model, untracked, viewChild,
} from '@angular/core';
import { LcIconComponent, lcUniqueId } from '@lionelcointot/ui-angular';

export type LcDisclosureHeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Contenu à ne créer qu'au premier dépliage (avec `lazy`) :
 * `<ng-template lcDisclosureContent>…</ng-template>` dans `lc-disclosure`.
 */
@Directive({ selector: 'ng-template[lcDisclosureContent]' })
export class LcDisclosureContentDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Groupe de lignes dépliables. Avec `exclusive`, ouvrir une ligne referme les autres (accordéon) ; le parent pilote
 * `exclusive` (par exemple selon la largeur). Sans groupe, ou sans `exclusive`, plusieurs lignes restent ouvertes.
 */
@Directive({ selector: '[lcDisclosureGroup]', exportAs: 'lcDisclosureGroup' })
export class LcDisclosureGroupDirective {
  readonly exclusive = input(false, { transform: booleanAttribute });
  private readonly members = new Set<LcDisclosureComponent>();

  /** @internal */
  register(member: LcDisclosureComponent): () => void {
    this.members.add(member);
    return () => this.members.delete(member);
  }

  /** @internal Une ligne vient de s'ouvrir : en mode exclusif, les autres se referment. */
  opened(member: LcDisclosureComponent): void {
    if (!this.exclusive()) return;
    for (const other of this.members) {
      if (other !== member) other.expanded.set(false);
    }
  }
}

/**
 * Ligne dépliable : l'en-tête est un bouton (`aria-expanded`, `aria-controls`) dont le contenu est projeté par
 * `[lcDisclosureSummary]`, suivi des actions (`[lcDisclosureActions]`), jamais imbriquées dans le bouton.
 * Plusieurs lignes peuvent être ouvertes en même temps, sauf dans un `lcDisclosureGroup` `exclusive` (accordéon).
 */
@Component({
  selector: 'lc-disclosure',
  imports: [LcIconComponent, NgTemplateOutlet],
  template: `
    <ng-template #summaryButton>
      <button #summary type="button" class="lc-disclosure__summary" [id]="summaryId" [disabled]="disabled()"
        [attr.aria-expanded]="expanded()" [attr.aria-controls]="regionId" (click)="toggle()">
        <lc-icon class="lc-disclosure__chevron" name="chevron-right" aria-hidden="true" />
        <span class="lc-disclosure__summary-content"><ng-content select="[lcDisclosureSummary]" /></span>
      </button>
    </ng-template>
    <div class="lc-disclosure__header">
      @switch (headingLevel()) {
        @case (2) { <h2 class="lc-disclosure__heading"><ng-container *ngTemplateOutlet="summaryButton" /></h2> }
        @case (3) { <h3 class="lc-disclosure__heading"><ng-container *ngTemplateOutlet="summaryButton" /></h3> }
        @case (4) { <h4 class="lc-disclosure__heading"><ng-container *ngTemplateOutlet="summaryButton" /></h4> }
        @case (5) { <h5 class="lc-disclosure__heading"><ng-container *ngTemplateOutlet="summaryButton" /></h5> }
        @case (6) { <h6 class="lc-disclosure__heading"><ng-container *ngTemplateOutlet="summaryButton" /></h6> }
        @default { <div class="lc-disclosure__heading"><ng-container *ngTemplateOutlet="summaryButton" /></div> }
      }
      <div class="lc-disclosure__actions"><ng-content select="[lcDisclosureActions]" /></div>
    </div>
    <div class="lc-disclosure__region" role="group" [id]="regionId" [attr.aria-labelledby]="summaryId"
      [hidden]="!expanded()" [attr.inert]="expanded() ? null : ''">
      @if (rendered()) {
        @if (lazyContent(); as lazyTemplate) {
          <ng-container *ngTemplateOutlet="lazyTemplate.template" />
        } @else {
          <ng-content />
        }
      }
    </div>
  `,
  styleUrl: './disclosure.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-disclosure',
    '[class.lc-disclosure--expanded]': 'expanded()',
    '[class.lc-disclosure--bordered]': 'bordered()',
  },
})
export class LcDisclosureComponent {
  private readonly summaryButton = viewChild<ElementRef<HTMLButtonElement>>('summary');
  private readonly lazyContent = contentChild(LcDisclosureContentDirective);
  private readonly group = inject(LcDisclosureGroupDirective, { optional: true });

  protected readonly summaryId = lcUniqueId('disclosure-summary');
  protected readonly regionId = lcUniqueId('disclosure-region');

  /** Déplié ou replié (liaison bidirectionnelle). */
  readonly expanded = model(false);
  /** Niveau de titre qui enveloppe le bouton (sans enveloppe si `null`). */
  readonly headingLevel = input<LcDisclosureHeadingLevel | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Le contenu n'est rendu qu'au premier dépliage, puis conservé. */
  readonly lazy = input(false, { transform: booleanAttribute });
  /** Filet en haut et en bas de la ligne. */
  readonly bordered = input(false, { transform: booleanAttribute });

  /** Vrai dès le premier dépliage et pour toujours ensuite (le contenu est conservé). */
  private readonly opened = linkedSignal<boolean, boolean>({
    source: this.expanded,
    computation: (expanded, previous) => expanded || (previous?.value ?? false),
  });
  protected readonly rendered = computed(() => this.opened() || !this.lazy());

  constructor() {
    const group = this.group;
    if (!group) return;
    inject(DestroyRef).onDestroy(group.register(this));
    effect(() => {
      if (this.expanded()) untracked(() => group.opened(this));
    });
  }

  toggle(): void {
    if (!this.disabled()) this.expanded.update((value) => !value);
  }

  focusSummary(): void {
    this.summaryButton()?.nativeElement.focus();
  }
}
