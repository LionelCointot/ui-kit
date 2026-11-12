import { ChangeDetectionStrategy, Component, ElementRef, Renderer2, contentChild, effect, inject, input } from '@angular/core';
import { joinIds, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcRadioDirective } from '../radio/radio.directive';

/**
 * Carte de choix : enveloppe (titre et description) autour d'un `input[type=radio][lcRadio]` projeté, dans un `lc-radio-group`.
 * La valeur, le nom et l'état restent sur le radio (Signal Forms : `[formField]`). Toute la carte est la cible du clic ;
 * le titre nomme le radio et la description lui est reliée par `aria-describedby`.
 *
 * @example <lc-choice-card title="Option A" description="Explication"><input type="radio" lcRadio value="a" /></lc-choice-card>
 */
@Component({
  selector: 'lc-choice-card',
  template: `
    <label class="lc-choice-card__label">
      <ng-content select="input[lcRadio]" />
      <span class="lc-choice-card__text">
        <span class="lc-choice-card__title" [id]="titleId">{{ title() }}</span>
        @if (description()) {
          <span class="lc-choice-card__description" [id]="descriptionId">{{ description() }}</span>
        }
      </span>
    </label>
  `,
  styleUrl: './choice-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `title` est aussi un attribut natif : on le retire de l'hôte pour éviter une info-bulle en double.
  host: { class: 'lc-choice-card', '[attr.title]': 'null' },
})
export class LcChoiceCardComponent {
  private readonly renderer = inject(Renderer2);

  readonly title = input.required<string>();
  readonly description = input<string>();

  protected readonly titleId = lcUniqueId('choice-card-title');
  protected readonly descriptionId = lcUniqueId('choice-card-description');
  private readonly radio = contentChild(LcRadioDirective, { read: ElementRef });

  constructor() {
    effect(() => {
      const radio = this.radio()?.nativeElement as HTMLElement | undefined;
      if (!radio) return;
      this.renderer.setAttribute(radio, 'aria-labelledby', this.titleId);
      const describedBy = joinIds(this.description() ? this.descriptionId : null);
      if (describedBy) this.renderer.setAttribute(radio, 'aria-describedby', describedBy);
      else this.renderer.removeAttribute(radio, 'aria-describedby');
    });
  }
}
