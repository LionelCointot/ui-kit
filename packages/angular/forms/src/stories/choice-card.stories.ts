import { Component, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcChoiceCardComponent } from '../choice-card/choice-card.component';
import { LcRadioGroupComponent } from '../radio/radio-group.component';
import { LcRadioDirective } from '../radio/radio.directive';

const OPTIONS = [
  { value: 'short', title: 'Court terme', description: 'Un objectif à moins de deux ans.' },
  { value: 'medium', title: 'Moyen terme', description: 'Un objectif entre deux et sept ans.' },
  { value: 'long', title: 'Long terme', description: 'Un objectif à plus de sept ans.' },
];

/** Groupe de cartes de choix : la valeur reste sur les radios natifs (ici un signal, sans formulaire). */
@Component({
  selector: 'lc-choice-card-demo',
  imports: [LcRadioGroupComponent, LcRadioDirective, LcChoiceCardComponent],
  template: `
    <lc-radio-group legend="Horizon de votre projet" [orientation]="orientation()">
      @for (option of options; track option.value) {
        <lc-choice-card [title]="option.title" [description]="option.description">
          <input type="radio" lcRadio [value]="option.value" [checked]="selected() === option.value" (change)="selected.set(option.value)" />
        </lc-choice-card>
      }
    </lc-radio-group>
  `,
})
class ChoiceCardDemoComponent {
  protected readonly options = OPTIONS;
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
  protected readonly selected = signal<string | null>('medium');
}

const meta: Meta<LcChoiceCardComponent> = {
  title: 'Forms/Choice card',
  component: LcChoiceCardComponent,
  decorators: [moduleMetadata({ imports: [ChoiceCardDemoComponent, LcRadioGroupComponent, LcRadioDirective, LcChoiceCardComponent] })],
};
export default meta;
type Story = StoryObj<LcChoiceCardComponent>;

/** Cartes empilées : flèches = déplacement et sélection dans le groupe, Tab entre et sort. */
export const Empilees: Story = {
  render: () => ({ template: `<div style="max-width:32rem"><lc-choice-card-demo /></div>` }),
};

/** Orientation horizontale : 3 cartes par ligne à 180 px minimum, sinon elles passent à la ligne. */
export const EnLigne: Story = {
  render: () => ({ template: `<lc-choice-card-demo orientation="horizontal" />` }),
};

export const Desactivees: Story = {
  render: () => ({
    template: `<div style="max-width:32rem"><lc-radio-group legend="Horizon (indisponible)">
      <lc-choice-card title="Court terme" description="Un objectif à moins de deux ans."><input type="radio" lcRadio value="a" disabled /></lc-choice-card>
      <lc-choice-card title="Long terme" description="Un objectif à plus de sept ans."><input type="radio" lcRadio value="b" checked disabled /></lc-choice-card>
    </lc-radio-group></div>`,
  }),
};

/** Invalide : bord d'erreur ; le message d'erreur reste celui du champ (`aria-describedby` du groupe). */
export const Invalide: Story = {
  render: () => ({
    template: `<div style="max-width:32rem"><lc-radio-group legend="Horizon de votre projet">
      <lc-choice-card title="Court terme" description="Un objectif à moins de deux ans."><input type="radio" lcRadio value="a" aria-invalid="true" /></lc-choice-card>
      <lc-choice-card title="Long terme" description="Un objectif à plus de sept ans."><input type="radio" lcRadio value="b" aria-invalid="true" /></lc-choice-card>
    </lc-radio-group></div>`,
  }),
};

export const SansDescription: Story = {
  render: () => ({
    template: `<div style="max-width:32rem"><lc-radio-group legend="Choix">
      <lc-choice-card title="Oui"><input type="radio" lcRadio value="yes" /></lc-choice-card>
      <lc-choice-card title="Non"><input type="radio" lcRadio value="no" checked /></lc-choice-card>
    </lc-radio-group></div>`,
  }),
};

/**
 * Largeur d'un téléphone. Le voile de survol n'existe que sous `@media (hover: hover)` : pour voir l'effet tactile, activer
 * l'émulation d'un appareil tactile dans les outils du navigateur (aucun voile après un toucher, la carte cochée reste teintée).
 */
export const Tactile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => ({ template: `<div style="max-width:22rem"><lc-choice-card-demo /></div>` }),
};
