import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcStepActionDirective, LcStepperComponent, type LcStep } from '@lionelcointot/ui-angular/navigation';

const NAMES = ['Profil', 'Objectif', 'Ressources', 'Options', 'Résumé'];

const stepsAt = (currentIndex: number): LcStep[] =>
  NAMES.map((label, index) => ({
    id: `step-${index + 1}`,
    label,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }));

/** Le consommateur tient l'état des étapes : ici, activer une étape faite y ramène le parcours. */
@Component({
  selector: 'lc-stepper-demo',
  imports: [LcStepperComponent],
  template: `
    <lc-stepper ariaLabel="Progression du parcours" [steps]="steps()" (stepSelect)="goTo($event)" />
    <p style="margin-block-start:16px">Étape ouverte : {{ current() + 1 }}</p>
    <button type="button" (click)="next()" [disabled]="current() === 4">Continuer</button>
  `,
})
class StepperDemoComponent {
  protected readonly current = signal(2);
  protected readonly steps = () => stepsAt(this.current());
  protected goTo(id: string): void {
    this.current.set(Number(id.replace('step-', '')) - 1);
  }
  protected next(): void {
    this.current.update((value) => Math.min(4, value + 1));
  }
}

/**
 * Démonstration de l'animation : à l'affichage les barres sont tracées l'une après l'autre et les pastilles faites ou en cours entrent en pop (d13, d51) ;
 * « Précédent » et « Suivant » changent l'étape en cours : seule la barre atteinte et la pastille de l'étape atteinte jouent, et rien en reculant.
 */
@Component({
  selector: 'lc-stepper-nav-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcStepperComponent, LcButtonComponent, StoryMotionNoticeComponent],
  template: `
    <lc-story-motion-notice />
    <section #dots data-demo="d13">
      <h3>Bullets <button lcButton fillMode="outline" size="small" (click)="dotsDemo.replay(dots)">Rejouer</button></h3>
      @for (key of dotsDemo.keys(); track key) {
        <lc-stepper ariaLabel="Progression du parcours" [steps]="steps()" [linear]="false" (stepSelect)="goTo($event)" (directionChange)="direction.set($event)" />
      }
      <p style="margin-block-start:16px">Étape {{ current() + 1 }} sur 5 · dernier sens : {{ direction() ?? 'aucun' }}</p>
      <div style="display:flex;gap:var(--lc-sys-space-2)">
        <button type="button" lcButton fillMode="outline" size="small" (click)="move(-1)" [disabled]="current() === 0">Précédent</button>
        <button type="button" lcButton fillMode="outline" size="small" (click)="move(1)" [disabled]="current() === 4">Suivant</button>
      </div>
    </section>
    <section #bars data-demo="d51">
      <h3>Bars <button lcButton fillMode="outline" size="small" (click)="barsDemo.replay(bars)">Rejouer</button></h3>
      @for (key of barsDemo.keys(); track key) {
        <lc-stepper variant="rail" [compact]="true" ariaLabel="Fil du projet" [steps]="railSteps" />
      }
    </section>
  `,
})
class StepperNavDemoComponent {
  protected readonly current = signal(2);
  protected readonly direction = signal<string | null>(null);
  protected readonly steps = () => stepsAt(this.current());
  protected readonly railSteps = stepsAt(3);
  protected readonly dotsDemo = replayable({ destroyRef: inject(DestroyRef) });
  protected readonly barsDemo = replayable({ destroyRef: inject(DestroyRef) });
  protected goTo(id: string): void {
    this.current.set(Number(id.replace('step-', '')) - 1);
  }
  protected move(delta: number): void {
    this.current.update((value) => Math.max(0, Math.min(4, value + delta)));
  }
}

/** Fil du projet : réponse, détail et gabarit d'action par étape. L'ancêtre `container-type: inline-size` décide de la forme (≥ 900 px : liste ; dessous : « Étape n sur N » + « Voir vos réponses »). */
@Component({
  selector: 'lc-stepper-rail-demo',
  imports: [LcStepperComponent, LcStepActionDirective, LcButtonComponent, LcIconComponent],
  template: `
    <div style="container-type:inline-size">
      <div [style.display]="'grid'" [style.grid-template-columns]="columns()" style="gap:var(--lc-sys-space-6)">
        <lc-stepper variant="rail" ariaLabel="Fil du projet" [steps]="steps()" [compact]="compact()">
          <ng-template lcStepAction let-step>
            @if (step.answer) {
              <button type="button" lcButton fillMode="flat" size="small" (click)="goTo(step.id)">
                <lc-icon name="pencil" size="small" /> Modifier
              </button>
            }
          </ng-template>
        </lc-stepper>
        <div>
          <p>Étape ouverte : {{ current() + 1 }}</p>
          <button type="button" lcButton (click)="current.set(current() === 4 ? 0 : current() + 1)">Suivant</button>
        </div>
      </div>
    </div>
  `,
})
class StepperRailDemoComponent {
  readonly width = input<'bureau' | 'mobile'>('bureau');
  readonly compact = input<'auto' | boolean>('auto');
  protected readonly current = signal(2);
  protected readonly columns = () => (this.width() === 'bureau' ? '290px minmax(0,1fr)' : '1fr');
  protected readonly steps = (): LcStep[] =>
    NAMES.map((label, index) => ({
      id: `step-${index + 1}`,
      label,
      state: index < this.current() ? 'done' : index === this.current() ? 'current' : 'upcoming',
      ...(index < 4 ? { answer: `Réponse ${index + 1}`, detail: `Réglage ${index + 1} : valeur par défaut` } : {}),
    }));
  protected goTo(id: string): void {
    this.current.set(Number(id.replace('step-', '')) - 1);
  }
}

/**
 * Step indicator for a guided flow: a native ordered list where the consumer owns each step's state
 * (`done`, `current`, `upcoming`) and updates `steps` itself. Done steps (or every enabled step when `linear` is false) are buttons that emit `stepSelect`.
 * `variant="rail"` shows answers, details and per-step actions in a vertical project thread.
 *
 * Import: `import { LcStepperComponent, LcStepActionDirective } from '@lionelcointot/ui-angular/navigation';`
 */
const meta: Meta<LcStepperComponent> = {
  title: 'Navigation/Stepper',
  component: LcStepperComponent,
  decorators: [moduleMetadata({ imports: [LcStepperComponent, StepperDemoComponent, StepperNavDemoComponent, StepperRailDemoComponent] })],
  argTypes: {
    compact: { control: 'inline-radio', options: ['auto', true, false] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    variant: { control: 'inline-radio', options: ['default', 'rail'] },
    linear: { control: 'boolean' },
    steps: { control: false },
  },
  args: { ariaLabel: 'Progression du parcours', steps: stepsAt(2), compact: 'auto', linear: true, orientation: 'horizontal', variant: 'default' },
};
export default meta;
type Story = StoryObj<LcStepperComponent>;

/** Every input is bound. Horizontal: bullets joined by a track filled up to the current step. Above 768 px the full thread shows; below, "Étape n sur N : nom" and a thin track. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-stepper [steps]="steps" [ariaLabel]="ariaLabel" [compact]="compact" [linear]="linear" [orientation]="orientation" [variant]="variant" />`,
  }),
};

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcStepperComponent, type LcStep } from '@lionelcointot/ui-angular/navigation';

const NAMES = ['Profil', 'Objectif', 'Ressources', 'Options', 'Résumé'];

@Component({
  selector: 'app-example',
  imports: [LcStepperComponent, LcButtonComponent],
  template: \`
    <lc-stepper ariaLabel="Progression du parcours" [steps]="steps()" [linear]="false" (stepSelect)="goTo($event)" />
    <button type="button" lcButton fillMode="outline" (click)="move(-1)" [disabled]="current() === 0">Précédent</button>
    <button type="button" lcButton fillMode="outline" (click)="move(1)" [disabled]="current() === 4">Suivant</button>\`,
})
export class ExampleComponent {
  protected readonly current = signal(2);
  protected readonly steps = (): LcStep[] =>
    NAMES.map((label, index) => ({
      id: \`step-\${index + 1}\`,
      label,
      state: index < this.current() ? 'done' : index === this.current() ? 'current' : 'upcoming',
    }));

  protected goTo(id: string): void {
    this.current.set(Number(id.replace('step-', '')) - 1);
  }

  protected move(delta: number): void {
    this.current.update((value) => Math.max(0, Math.min(4, value + delta)));
  }
}`;

const fixed = (template: string): Story => ({ parameters: fixedExample, render: () => ({ template }) });

/** Consumer-driven state: activating a done step takes the flow back to it. */
export const Interactive: Story = fixed(`<lc-stepper-demo />`);

/** First step current, every other step upcoming. */
export const FirstStep: Story = {
  parameters: fixedExample,
  render: () => ({ props: { steps: stepsAt(0) }, template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" />` }),
};

/** Every step done. */
export const Completed: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { steps: NAMES.map((label, index) => ({ id: `step-${index}`, label, state: 'done' as const })) },
    template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" />`,
  }),
};

/** `compact` forces the narrow form ("Étape n sur N"), whatever the width. */
export const CompactForm: Story = {
  parameters: fixedExample,
  render: () => ({ props: { steps: stepsAt(2) }, template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" [compact]="true" />` }),
};

/** `compact` set to `false` forces the full form, even in a narrow container. */
export const FullForm: Story = {
  parameters: fixedExample,
  render: () => ({ props: { steps: stepsAt(2) }, template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" [compact]="false" />` }),
};

/** Vertical orientation. */
export const Vertical: Story = {
  parameters: fixedExample,
  render: () => ({ props: { steps: stepsAt(2) }, template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" orientation="vertical" />` }),
};

/** With `linear` false, every enabled step is clickable, forward as well as backward (step 5 is disabled here). */
export const NonLinear: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { steps: stepsAt(1).map((step, index) => (index === 4 ? { ...step, disabled: true } : step)) },
    template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" [linear]="false" />`,
  }),
};

/** An invalid step shows an error bullet and a hidden "(à corriger)" suffix in its name. */
export const WithError: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { steps: stepsAt(2).map((step, index) => (index === 1 ? { ...step, invalid: true } : step)) },
    template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" />`,
  }),
};

/** An optional step carries a "Facultative" mention under its name. */
export const Optional: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { steps: stepsAt(2).map((step, index) => (index === 3 ? { ...step, optional: true } : step)) },
    template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" />`,
  }),
};

/** Registry icons replace the step numbers. */
export const WithIcons: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { steps: stepsAt(2).map((step, index) => ({ ...step, icon: ['user', 'house', 'calculator', 'settings', 'chart-line'][index] })) },
    template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" />`,
  }),
};

/** A disabled step is never clickable and is dimmed. */
export const Disabled: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { steps: stepsAt(1).map((step, index) => (index === 3 ? { ...step, disabled: true } : step)) },
    template: `<lc-stepper ariaLabel="Progression du parcours" [steps]="steps" />`,
  }),
};

/** On display the bars are drawn one after the other and the bullets pop in; "Suivant" draws only the bar reached and pops the new bullet, "Précédent" plays nothing. `directionChange` gives the direction. */
export const Animation: Story = {
  ...fixed(`<lc-stepper-nav-demo />`),
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
};

/** `rail` variant on desktop: 290 px column in a 1,000 px container (at least 900 px), joined bullets, answer, detail and an edit action per step. */
export const RailDesktop: Story = fixed(`<div style="width:1000px;max-width:100%"><lc-stepper-rail-demo width="bureau" /></div>`);

/** `rail` variant at 360 px: "Étape n sur 5 · nom", 5 segments and a collapsed "Voir vos réponses"; the same list unfolds below. */
export const RailMobile360: Story = fixed(`<div style="width:360px;max-width:100%"><lc-stepper-rail-demo width="mobile" /></div>`);

/** `compact` forces the chosen form whatever the container width (narrow form at 1,000 px here). */
export const RailForcedNarrow: Story = fixed(`<div style="width:1000px;max-width:100%"><lc-stepper-rail-demo width="mobile" [compact]="true" /></div>`);
