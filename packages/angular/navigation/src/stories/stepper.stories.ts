import { Component, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcStepActionDirective } from '../stepper/step-action.directive';
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

/** Fil du projet : réponse, détail et gabarit d'action par étape. L'ancêtre `container-type: inline-size` décide de la forme (≥ 900 px : liste ; dessous : « Étape n sur N » + « Voir vos réponses »). */
@Component({
  selector: 'lc-stepper-rail-demo',
  imports: [LcStepperComponent, LcStepActionDirective, LcButtonComponent, LcIconComponent],
  template: `
    <div style="container-type:inline-size">
      <div [style.display]="'grid'" [style.grid-template-columns]="columns()" style="gap:24px">
        <lc-stepper variant="rail" ariaLabel="Votre projet" [steps]="steps()" [compact]="compact()">
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
      ...(index < 4 ? { answer: `Réponse ${index + 1}`, detail: `Réglage ${index + 1} : 3 % par an` } : {}),
    }));
  protected goTo(id: string): void {
    this.current.set(Number(id.replace('step-', '')) - 1);
  }
}

const meta: Meta<LcStepperComponent> = {
  title: 'Navigation/Fil d\'étapes',
  component: LcStepperComponent,
  decorators: [moduleMetadata({ imports: [LcStepperComponent, StepperDemoComponent, StepperNavDemoComponent, StepperRailDemoComponent] })],
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

/** Variante `rail`, bureau : colonne de 290 px dans un conteneur de 1 000 px (≥ 900 px), pastilles reliées, réponse, détail et « Modifier » par étape. */
export const FilDuProjetBureau: Story = {
  render: () => ({ template: `<div style="width:1000px;max-width:100%"><lc-stepper-rail-demo width="bureau" /></div>` }),
};

/** Variante `rail`, 360 px : « Étape n sur 5 · nom », 5 segments et « Voir vos réponses » (replié) ; la même liste se déplie dessous. */
export const FilDuProjet360: Story = {
  render: () => ({ template: `<div style="width:360px;max-width:100%"><lc-stepper-rail-demo width="mobile" /></div>` }),
};

/** `compact` force la forme choisie, quelle que soit la largeur du conteneur (ici, forme étroite à 1 000 px). */
export const FilDuProjetForceEtroit: Story = {
  render: () => ({ template: `<div style="width:1000px;max-width:100%"><lc-stepper-rail-demo width="mobile" [compact]="true" /></div>` }),
};
