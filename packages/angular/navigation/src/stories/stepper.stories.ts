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

const meta: Meta<LcStepperComponent> = {
  title: 'Navigation/Fil d\'étapes',
  component: LcStepperComponent,
  decorators: [moduleMetadata({ imports: [LcStepperComponent, StepperDemoComponent] })],
  argTypes: { compact: { control: 'inline-radio', options: ['auto', true, false] } },
  args: { ariaLabel: 'Progression du parcours', steps: stepsAt(2), compact: 'auto' },
  render: (args) => ({
    props: args,
    template: `<lc-stepper [steps]="steps" [ariaLabel]="ariaLabel" [compact]="compact" />`,
  }),
};
export default meta;
type Story = StoryObj<LcStepperComponent>;

/** Au-dessus de 768 px : fil complet ; en dessous : « Étape n sur N : nom » et piste fine. */
export const Defaut: Story = {};

export const Interactif: Story = {
  render: () => ({ template: `<lc-stepper-demo />` }),
};

export const PremiereEtape: Story = { args: { steps: stepsAt(0) } };

export const Terminee: Story = { args: { steps: NAMES.map((label, index) => ({ id: `step-${index}`, label, state: 'done' as const })) } };

export const FormeCompacte: Story = { args: { compact: true } };

export const FormeComplete: Story = { args: { compact: false } };
