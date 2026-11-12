import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LC_LABELS, LcIconComponent } from '@lionelcointot/ui-angular';

export type LcStepState = 'done' | 'current' | 'upcoming';

export interface LcStep {
  readonly id: string;
  readonly label: string;
  /** État fourni par le consommateur : le composant ne connaît ni le routeur ni la validation. */
  readonly state: LcStepState;
}

/**
 * Fil d'étapes d'un parcours guidé : liste ordonnée native (`nav` > `ol`), sans rôle `tab`.
 * Une étape faite est un bouton (`stepSelect`), l'étape en cours porte `aria-current="step"`, une étape à venir n'est pas focalisable.
 * Sous 768 px (`compact` = `auto`), la forme compacte affiche « Étape n sur N : nom » et une piste fine décorative.
 */
@Component({
  selector: 'lc-stepper',
  imports: [LcIconComponent],
  template: `
    <nav [attr.aria-label]="ariaLabel()">
      <p class="lc-stepper__summary">
        <span class="lc-stepper__summary-text">{{ summary() }}</span>
        <span class="lc-stepper__track" aria-hidden="true">
          <span class="lc-stepper__track-fill" [style.inline-size.%]="progress()"></span>
        </span>
      </p>
      <ol class="lc-stepper__list">
        @for (step of steps(); track step.id; let index = $index) {
          <li class="lc-stepper__item" [class]="'lc-stepper__item lc-stepper__item--' + step.state"
            [attr.aria-current]="step.state === 'current' ? 'step' : null">
            @if (step.state === 'done') {
              <button type="button" class="lc-stepper__step" [attr.aria-label]="labels.stepBack(step.label)" (click)="select(step)">
                <span class="lc-stepper__badge" aria-hidden="true"><lc-icon name="check" size="small" /></span>
                <span class="lc-stepper__name">{{ step.label }}</span>
              </button>
            } @else {
              <span class="lc-stepper__step">
                <span class="lc-stepper__badge" aria-hidden="true">{{ index + 1 }}</span>
                <span class="lc-stepper__name">{{ step.label }}</span>
              </span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styleUrl: './stepper.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-stepper',
    '[class.lc-stepper--compact]': 'compact() === true',
    '[class.lc-stepper--full]': 'compact() === false',
  },
})
export class LcStepperComponent {
  protected readonly labels = inject(LC_LABELS);

  readonly steps = input.required<readonly LcStep[]>();
  /** Nom accessible du `nav`. */
  readonly ariaLabel = input.required<string>();
  /** `auto` : forme compacte sous 768 px ; `true` / `false` forcent la forme. */
  readonly compact = input<'auto' | boolean>('auto');
  /** Identifiant d'une étape faite activée (clic, Entrée, Espace). Jamais émis pour les autres étapes. */
  readonly stepSelect = output<string>();

  /** Étape affichée par la forme compacte : l'étape en cours, sinon la première non faite, sinon la dernière. */
  private readonly shownIndex = computed(() => {
    const steps = this.steps();
    const current = steps.findIndex((step) => step.state === 'current');
    if (current >= 0) return current;
    const pending = steps.findIndex((step) => step.state !== 'done');
    return pending >= 0 ? pending : steps.length - 1;
  });

  protected readonly summary = computed(() => {
    const steps = this.steps();
    const index = this.shownIndex();
    return index < 0 ? '' : `${this.labels.stepOf(index + 1, steps.length)} : ${steps[index].label}`;
  });

  protected readonly progress = computed(() => (this.steps().length === 0 ? 0 : ((this.shownIndex() + 1) / this.steps().length) * 100));

  protected select(step: LcStep): void {
    if (step.state === 'done') this.stepSelect.emit(step.id);
  }
}
