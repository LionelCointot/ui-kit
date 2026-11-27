import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, computed, contentChild, effect, inject, input, linkedSignal, output, signal, untracked } from '@angular/core';
import { LC_LABELS, LcIconComponent, lcAnimate, lcCssMs, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcStepActionDirective } from './step-action.directive';

export type LcStepState = 'done' | 'current' | 'upcoming';
export type LcStepperOrientation = 'horizontal' | 'vertical';
/** `default` : pastilles reliées (horizontal ou vertical) ; `rail` : fil du projet, avec réponse, détail et actions par étape. */
export type LcStepperVariant = 'default' | 'rail';
export type LcStepperDirection = 'forward' | 'backward';

export interface LcStep {
  readonly id: string;
  readonly label: string;
  /** État fourni par le consommateur : le composant ne connaît ni le routeur ni la validation. */
  readonly state: LcStepState;
  /** Étape facultative : mention « Facultative » sous le nom. */
  readonly optional?: boolean;
  /** Étape en erreur : pastille et icône `error`, texte masqué « (à corriger) » ajouté au nom. */
  readonly invalid?: boolean;
  /** Étape désactivée : jamais cliquable, opacité réduite. */
  readonly disabled?: boolean;
  /** Nom d'une icône du registre, affichée à la place du numéro (ni la coche d'une étape faite, ni l'icône d'erreur). */
  readonly icon?: string;
  /** Variante `rail` : réponse en cours de l'étape, en texte brut. */
  readonly answer?: string;
  /** Variante `rail` : ligne de détail, atténuée, sous la réponse. */
  readonly detail?: string;
}

type StepGlyph = 'number' | 'check' | 'error' | 'icon';

interface StepView {
  readonly step: LcStep;
  readonly position: number;
  readonly clickable: boolean;
  readonly glyph: StepGlyph;
  /** Nom accessible du bouton (étape cliquable). */
  readonly buttonName: string;
  /** Mentions ajoutées au nom d'une étape non cliquable (texte masqué). */
  readonly hiddenSuffix: string;
}

/** Changement d'étape détecté ; un nouvel objet à chaque changement, même de même sens. */
interface StepMove {
  readonly direction: LcStepperDirection;
}

/**
 * Fil d'étapes d'un parcours guidé : liste ordonnée native (`nav` > `ol`), sans rôle `tab`.
 * Pastilles reliées par des segments de piste, tracés l'un après l'autre jusqu'à l'étape en cours (la pastille des étapes faites et en cours entre en pop). Une étape cliquable est un bouton
 * (`stepSelect`) : avec `linear` (défaut), les étapes faites ; sans, toute étape non désactivée.
 * L'étape en cours porte `aria-current="step"`. Le composant ne change jamais lui-même l'étape : le consommateur met `steps` à jour.
 * Au changement d'étape, la classe `lc-stepper--forward` ou `--backward` est posée sur l'hôte le temps de l'animation et `directionChange` est émis.
 * Sous 768 px (`compact` = `auto`), les libellés sont masqués visuellement et « Étape n sur N : nom » s'affiche sous la piste.
 * `variant="rail"` : « fil du projet » (réponse, détail et actions de chaque étape), voir `variant`.
 */
@Component({
  selector: 'lc-stepper',
  imports: [LcIconComponent, NgTemplateOutlet],
  template: `
    @if (variant() === 'rail') {
      <nav [attr.aria-label]="ariaLabel()">
        <div class="lc-stepper__head">
          <p class="lc-stepper__where">{{ railSummary() }}</p>
          <div class="lc-stepper__bars" aria-hidden="true">
            @for (view of views(); track view.step.id) {
              <span class="lc-stepper__bar" [class.lc-stepper__bar--on]="$index <= shownIndex()"><span class="lc-stepper__fill" [class.lc-stepper__fill--on]="$index <= shownIndex()"></span></span>
            }
          </div>
          <button type="button" class="lc-stepper__toggle" [attr.aria-expanded]="expanded()" [attr.aria-controls]="answersId" (click)="expanded.set(!expanded())">
            <lc-icon [name]="expanded() ? 'chevron-down' : 'chevron-right'" size="small" />
            {{ labels.stepAnswers }}
          </button>
        </div>
        <ol class="lc-stepper__answers" [id]="answersId" [class.lc-stepper__answers--collapsed]="!expanded()">
          @for (view of views(); track view.step.id) {
            <li
              class="lc-stepper__item"
              [class]="itemClass(view)"
              [class.lc-stepper__item--bare]="!view.step.answer && !view.step.detail"
              [attr.aria-current]="view.step.state === 'current' ? 'step' : null"
            >
              <ng-container *ngTemplateOutlet="marker; context: { $implicit: view }" />
              <div class="lc-stepper__content">
                <span class="lc-stepper__title">
                  <span>
                    {{ view.step.label }}
                    @if (view.hiddenSuffix) {
                      <span class="lc-stepper__hidden">{{ ' ' + view.hiddenSuffix }}</span>
                    }
                  </span>
                  @if (view.step.optional) {
                    <span class="lc-stepper__optional" aria-hidden="true">{{ labels.stepOptional }}</span>
                  }
                </span>
                @if (view.step.answer) {
                  <p class="lc-stepper__answer">{{ view.step.answer }}</p>
                }
                @if (view.step.detail) {
                  <p class="lc-stepper__detail">{{ view.step.detail }}</p>
                }
                @if (action(); as actionDirective) {
                  <div class="lc-stepper__actions">
                    <ng-container *ngTemplateOutlet="actionDirective.template; context: { $implicit: view.step }" />
                  </div>
                }
              </div>
            </li>
          }
        </ol>
      </nav>
    } @else {
      <nav [attr.aria-label]="ariaLabel()">
        <div class="lc-stepper__body" [style.--lc-stepper-count]="steps().length">
          @if (steps().length > 1) {
            <span class="lc-stepper__rail" aria-hidden="true">
              @for (segment of segments(); track segment) {
                <span class="lc-stepper__segment"><span class="lc-stepper__fill" [class.lc-stepper__fill--on]="segment < shownIndex()"></span></span>
              }
            </span>
          }
          <ol class="lc-stepper__list">
            @for (view of views(); track view.step.id) {
              <li class="lc-stepper__item" [class]="itemClass(view)" [attr.aria-current]="view.step.state === 'current' ? 'step' : null">
                @if (view.clickable) {
                  <button type="button" class="lc-stepper__step" [attr.aria-label]="view.buttonName" (click)="select(view)">
                    <ng-container *ngTemplateOutlet="content; context: { $implicit: view }" />
                  </button>
                } @else {
                  <span class="lc-stepper__step" [attr.aria-disabled]="view.step.disabled ? 'true' : null">
                    <ng-container *ngTemplateOutlet="content; context: { $implicit: view }" />
                    @if (view.hiddenSuffix) {
                      <span class="lc-stepper__hidden">{{ ' ' + view.hiddenSuffix }}</span>
                    }
                  </span>
                }
              </li>
            }
          </ol>
        </div>
        <p class="lc-stepper__summary">{{ summary() }}</p>
      </nav>
    }
    <ng-template #content let-view>
      <ng-container *ngTemplateOutlet="marker; context: { $implicit: view }" />
      <span class="lc-stepper__text">
        <span class="lc-stepper__name">{{ view.step.label }}</span>
        @if (view.step.optional) {
          <span class="lc-stepper__optional" aria-hidden="true">{{ labels.stepOptional }}</span>
        }
      </span>
    </ng-template>
    <ng-template #marker let-view>
      <span class="lc-stepper__marker" aria-hidden="true">
        <span class="lc-stepper__badge">
          @switch (view.glyph) {
            @case ('check') { <lc-icon name="check" size="small" /> }
            @case ('error') { <lc-icon name="circle-alert" size="small" /> }
            @case ('icon') { <lc-icon [name]="view.step.icon" size="small" /> }
            @default { {{ view.position }} }
          }
        </span>
      </span>
    </ng-template>
  `,
  styleUrl: './stepper.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-stepper',
    '[class.lc-stepper--compact]': 'compact() === true',
    '[class.lc-stepper--full]': 'compact() === false',
    '[class.lc-stepper--rail]': "variant() === 'rail'",
    '[class.lc-stepper--vertical]': "orientation() === 'vertical' && variant() !== 'rail'",
    '[class.lc-stepper--forward]': "move()?.direction === 'forward'",
    '[class.lc-stepper--backward]': "move()?.direction === 'backward'",
  },
})
export class LcStepperComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private running: readonly Animation[] = [];

  readonly steps = input.required<readonly LcStep[]>();
  /** Nom accessible du `nav`. */
  readonly ariaLabel = input.required<string>();
  /** `auto` : forme compacte sous 768 px ; `true` / `false` forcent la forme. Ignoré en vertical (les libellés restent affichés). */
  readonly compact = input<'auto' | boolean>('auto');
  /** `true` (défaut) : seules les étapes faites sont cliquables ; `false` : toute étape non désactivée l'est. */
  readonly linear = input<boolean>(true);
  readonly orientation = input<LcStepperOrientation>('horizontal');
  /**
   * `rail` : fil du projet. Au-delà de 900 px de large de l'ancêtre le plus proche déclarant `container-type: inline-size`, liste verticale
   * (pastille, nom, `answer`, `detail`, gabarit `[lcStepAction]`) ; en dessous, ou sans conteneur, « Étape n sur N · nom », une barre de N segments et
   * le bouton « Voir vos réponses » qui déplie la même liste. `compact` force la forme étroite (`true`) ou large (`false`) ; `orientation`, `linear`
   * et `stepSelect` sont ignorés (les actions sont celles du gabarit).
   */
  readonly variant = input<LcStepperVariant>('default');
  /** Identifiant d'une étape cliquable activée (clic, Entrée, Espace). Jamais émis pour une étape non cliquable. */
  readonly stepSelect = output<string>();
  /** Sens du changement d'étape en cours, émis à chaque changement (jamais au premier rendu). */
  readonly directionChange = output<LcStepperDirection>();

  /** Actions de chaque étape en variante `rail`. */
  protected readonly action = contentChild(LcStepActionDirective);
  protected readonly answersId = lcUniqueId('stepper-answers');
  /** Liste des réponses dépliée (forme étroite de `rail`). */
  protected readonly expanded = signal(false);

  /** Étape affichée par la piste et la forme compacte : l'étape en cours, sinon la première non faite, sinon la dernière. */
  protected readonly shownIndex = computed(() => {
    const steps = this.steps();
    const current = steps.findIndex((step) => step.state === 'current');
    if (current >= 0) return current;
    const pending = steps.findIndex((step) => step.state !== 'done');
    return pending >= 0 ? pending : steps.length - 1;
  });

  /** Un segment de piste entre deux pastilles voisines (forme `default`). */
  protected readonly segments = computed(() => Array.from({ length: Math.max(this.steps().length - 1, 0) }, (_, index) => index));

  /** Index affiché à la passe précédente : sert à ne faire animer que ce qui vient d'être atteint. */
  private previousShown: number | null = null;

  /** Compare l'index affiché avant et après ; vide au premier rendu et une fois l'animation finie. */
  protected readonly move = linkedSignal<number, StepMove | null>({
    source: this.shownIndex,
    computation: (index, previous) => {
      if (previous === undefined || previous.source === index) return null;
      return { direction: index > previous.source ? 'forward' : 'backward' };
    },
  });

  protected readonly views = computed<readonly StepView[]>(() =>
    this.steps().map((step, index) => {
      const position = index + 1;
      const clickable = !step.disabled && (this.linear() ? step.state === 'done' : true);
      const hiddenSuffix = [step.invalid ? this.labels.stepInvalid : '', step.optional ? this.labels.stepOptionalHidden : ''].filter(Boolean).join(' ');
      const glyph: StepGlyph = step.invalid ? 'error' : step.state === 'done' ? 'check' : step.icon ? 'icon' : 'number';
      return {
        step,
        position,
        clickable,
        glyph,
        hiddenSuffix,
        buttonName: `${this.labels.stepGoTo(position, step.label)} ${hiddenSuffix}`.trim(),
      };
    }),
  );

  protected readonly summary = computed(() => {
    const steps = this.steps();
    const index = this.shownIndex();
    return index < 0 ? '' : `${this.labels.stepOf(index + 1, steps.length)} : ${steps[index].label}`;
  });

  protected readonly railSummary = computed(() => {
    const steps = this.steps();
    const index = this.shownIndex();
    return index < 0 ? '' : `${this.labels.stepOf(index + 1, steps.length)} · ${steps[index].label}`;
  });

  constructor() {
    // `lcAnimate` n'annule pas à la destruction : on annule les révélations en cours.
    inject(DestroyRef).onDestroy(() => this.running.forEach((animation) => animation.cancel()));
    effect(() => {
      const move = this.move();
      if (move) untracked(() => this.directionChange.emit(move.direction));
    });
    afterRenderEffect(() => {
      this.views();
      const index = this.shownIndex();
      const previous = this.previousShown ?? -1;
      this.previousShown = index;
      untracked(() => this.reveal(previous, index));
    });
  }

  /**
   * Anime ce qui vient d'être atteint : au premier affichage toutes les barres pleines (tracées l'une après l'autre) et les pastilles faites ou en cours
   * (en pop, l'une après l'autre) ; à un changement d'étape vers l'avant, la seule barre atteinte et la pastille de l'étape atteinte. Un recul ne joue rien.
   * La classe de sens de l'hôte reste posée jusqu'à la fin de ces animations (aussitôt sous mouvement réduit).
   */
  private reveal(previous: number, index: number): void {
    if (index <= previous) return this.settle([]);
    const rail = this.variant() === 'rail';
    const vertical = this.orientation() === 'vertical' && !rail;
    // Piste `default` : le segment p relie les étapes p et p + 1 (plein si p < index) ; `rail` : la barre p est pleine si p <= index.
    const firstFill = previous + (rail ? 1 : 0);
    const fills = Array.from(this.host.querySelectorAll<HTMLElement>('.lc-stepper__fill')).filter((fill, position) => position >= firstFill && fill.classList.contains('lc-stepper__fill--on'));
    const steps = this.steps();
    const dots = Array.from(this.host.querySelectorAll<HTMLElement>('.lc-stepper__badge')).filter((_, position) => position > previous && position <= index && steps[position]?.state !== 'upcoming');
    const animations = [
      ...fills.map((fill, rank) => lcAnimate(fill, [{ scale: vertical ? '1 0' : '0 1' }, { scale: '1 1' }], { duration: '--lc-steps-bar-duration', easing: 'entrance', delay: rank * lcCssMs(getComputedStyle(fill), '--lc-steps-bar-stagger') })),
      ...dots.map((dot, rank) => lcAnimate(dot, [{ scale: 'var(--lc-steps-dot-scale)', opacity: 0 }, { scale: '1', opacity: 1 }], { duration: '--lc-steps-dot-duration', easing: '--lc-steps-dot-easing', delay: rank * lcCssMs(getComputedStyle(dot), '--lc-steps-dot-delay') })),
    ];
    this.settle(animations);
  }

  /** Retire la classe de sens de l'hôte quand les animations lancées sont finies. */
  private settle(animations: readonly Animation[]): void {
    const move = this.move();
    if (!move) return;
    this.running = animations;
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => untracked(() => this.move() === move && this.move.set(null)));
  }

  protected itemClass(view: StepView): string {
    const { step } = view;
    return [
      'lc-stepper__item',
      `lc-stepper__item--${step.state}`,
      view.clickable ? 'lc-stepper__item--clickable' : '',
      step.invalid ? 'lc-stepper__item--invalid' : '',
      step.disabled ? 'lc-stepper__item--disabled' : '',
      step.optional ? 'lc-stepper__item--optional' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  protected select(view: StepView): void {
    if (view.clickable) this.stepSelect.emit(view.step.id);
  }
}
