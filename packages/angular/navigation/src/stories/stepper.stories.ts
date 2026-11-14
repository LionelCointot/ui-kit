import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcStepperComponent, type LcStep } from '../stepper/stepper.component';

const NAMES = ['Votre situation', 'Votre projet', 'Vos ressources', 'Vos hypothèses', 'Résultat'];

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

/** Démonstration de l'animation : « Précédent » et « Suivant » changent l'étape en cours, la piste et la pastille suivent le sens. */
@Component({
  selector: 'lc-stepper-nav-demo',
  imports: [LcStepperComponent],
  template: `
    <lc-stepper ariaLabel="Progression du parcours" [steps]="steps()" [linear]="false" (stepSelect)="goTo($event)" (directionChange)="direction.set($event)" />
    <p style="margin-block-start:16px">Étape {{ current() + 1 }} sur 5 · dernier sens : {{ direction() ?? 'aucun' }}</p>
    <div style="display:flex;gap:8px">
      <button type="button" (click)="move(-1)" [disabled]="current() === 0">Précédent</button>
      <button type="button" (click)="move(1)" [disabled]="current() === 4">Suivant</button>
    </div>
  `,
})
class StepperNavDemoComponent {
  protected readonly current = signal(0);
  protected readonly direction = signal<string | null>(null);
  protected readonly steps = () => stepsAt(this.current());
  protected goTo(id: string): void {
    this.current.set(Number(id.replace('step-', '')) - 1);
  }
  protected move(delta: number): void {
    this.current.update((value) => Math.max(0, Math.min(4, value + delta)));
  }
}

const meta: Meta<LcStepperComponent> = {
  title: 'Navigation/Fil d\'étapes',
  component: LcStepperComponent,
  decorators: [moduleMetadata({ imports: [LcStepperComponent, StepperDemoComponent, StepperNavDemoComponent] })],
  argTypes: {
    compact: { control: 'inline-radio', options: ['auto', true, false] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    linear: { control: 'boolean' },
  },
  args: { ariaLabel: 'Progression du parcours', steps: stepsAt(2), compact: 'auto', linear: true, orientation: 'horizontal' },
  render: (args) => ({
    props: args,
    template: `<lc-stepper [steps]="steps" [ariaLabel]="ariaLabel" [compact]="compact" [linear]="linear" [orientation]="orientation" />`,
  }),
};
export default meta;
type Story = StoryObj<LcStepperComponent>;

/** Horizontal : pastilles reliées par une piste remplie jusqu'à l'étape en cours (étapes faites cliquables). Au-dessus de 768 px : fil complet ; en dessous : « Étape n sur N : nom » et piste fine. */
export const Defaut: Story = {};

export const Interactif: Story = {
  render: () => ({ template: `<lc-stepper-demo />` }),
};

export const PremiereEtape: Story = { args: { steps: stepsAt(0) } };

export const Terminee: Story = { args: { steps: NAMES.map((label, index) => ({ id: `step-${index}`, label, state: 'done' as const })) } };

export const FormeCompacte: Story = { args: { compact: true } };

export const FormeComplete: Story = { args: { compact: false } };

export const Vertical: Story = { args: { orientation: 'vertical' } };

/** `linear` faux : toute étape non désactivée est cliquable, en avant comme en arrière (ici, l'étape 5 est désactivée). */
export const NonLineaire: Story = {
  args: { linear: false, steps: stepsAt(1).map((step, index) => (index === 4 ? { ...step, disabled: true } : step)) },
};

export const EnErreur: Story = {
  args: { steps: stepsAt(2).map((step, index) => (index === 1 ? { ...step, invalid: true } : step)) },
};

export const Facultative: Story = {
  args: { steps: stepsAt(2).map((step, index) => (index === 3 ? { ...step, optional: true } : step)) },
};

export const AvecIcones: Story = {
  args: { steps: stepsAt(2).map((step, index) => ({ ...step, icon: ['user', 'house', 'calculator', 'settings', 'chart-line'][index] })) },
};

export const Desactivee: Story = {
  args: { steps: stepsAt(1).map((step, index) => (index === 3 ? { ...step, disabled: true } : step)) },
};

/** « Précédent » / « Suivant » : la piste s'allonge ou se raccourcit, la pastille grandit, `directionChange` donne le sens. */
export const Animation: Story = {
  render: () => ({ template: `<lc-stepper-nav-demo />` }),
};
