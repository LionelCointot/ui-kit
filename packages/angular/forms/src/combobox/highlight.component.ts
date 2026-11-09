import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { lcHighlightSegments } from './search-text';

/**
 * Surligne les correspondances d'un terme dans un texte, sans `innerHTML` : le texte est découpé en segments et
 * les correspondances sont entourées de `<mark>` par le gabarit (échappement assuré par Angular).
 *
 * @example
 * <span [lcHighlight]="label" [lcHighlightTerm]="text"></span>
 */
@Component({
  selector: '[lcHighlight]',
  template: `@for (segment of segments(); track $index) {@if (segment.match) {<mark class="lc-highlight__mark">{{ segment.text }}</mark>} @else {{{ segment.text }}}}`,
  styles: `
    .lc-highlight__mark {
      background: transparent;
      color: inherit;
      font-weight: var(--lc-highlight-font-weight, var(--lc-sys-font-weight-semibold));
      text-decoration: underline;
      text-decoration-thickness: var(--lc-sys-border-width-thin);
      text-underline-offset: 0.15em;
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LcHighlightComponent {
  readonly lcHighlight = input.required<string>();
  readonly lcHighlightTerm = input<string>('');

  protected readonly segments = computed(() => lcHighlightSegments(this.lcHighlight(), this.lcHighlightTerm()));
}
