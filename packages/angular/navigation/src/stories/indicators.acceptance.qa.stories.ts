import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcStepperComponent, LcTabComponent, LcTabContentDirective, LcTabsComponent, type LcStep } from '@lionelcointot/ui-angular/navigation';

// Fixtures de la spec 2026-12-mouvement-v2, T8 (CA-21 et indicateurs) : pilotées par `node tools/qa/indicators-browser.mjs`, sans `play`.

/** Onglets dont chaque panneau contient trois lignes `.row` enfants directs du contenu (CA-21, D-21 : cascade à la première ouverture). `three` est rendu à la première sélection (`lcTabContent`). */
@Component({
  selector: 'lc-motion-tabs-cascade',
  imports: [LcTabsComponent, LcTabComponent, LcTabContentDirective],
  template: `<div style="padding:8px">
    <lc-tabs ariaLabel="QA" [(selected)]="selected">
      <lc-tab id="one" label="Un"><p class="row">Un A</p><p class="row">Un B</p><p class="row">Un C</p></lc-tab>
      <lc-tab id="two" label="Deux"><p class="row">Deux A</p><p class="row">Deux B</p><p class="row">Deux C</p></lc-tab>
      <lc-tab id="three" label="Trois"><ng-template lcTabContent><p class="row">Trois A</p><p class="row">Trois B</p><p class="row">Trois C</p></ng-template></lc-tab>
    </lc-tabs>
  </div>`,
})
class MotionTabsCascadeComponent {
  protected readonly selected = signal<string | null>('one');
}

const NAMES = ['Profil', 'Objectif', 'Ressources', 'Options', 'Résumé'];
const at = (current: number): LcStep[] => NAMES.map((label, index) => ({ id: `step-${index + 1}`, label, state: index < current ? 'done' : index === current ? 'current' : 'upcoming' }));

/** `#show` insère le stepper (étape 4 sur 5 en cours) ; `#next` passe à l'étape suivante ; `#hide` le retire. */
@Component({
  selector: 'lc-motion-stepper',
  imports: [LcStepperComponent],
  template: `<div style="padding:8px">
    <button id="show" type="button" (click)="shown.set(true)">Afficher</button>
    <button id="hide" type="button" (click)="shown.set(false); current.set(3)">Retirer</button>
    <button id="next" type="button" (click)="current.set(current() + 1)">Suivant</button>
    @if (shown()) { <lc-stepper ariaLabel="QA" [steps]="steps()" [linear]="false" /> }
  </div>`,
})
class MotionStepperComponent {
  protected readonly shown = signal(false);
  protected readonly current = signal(3);
  protected readonly steps = () => at(this.current());
}

const meta: Meta = {
  title: 'QA/Motion/Indicators navigation',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [MotionTabsCascadeComponent, MotionStepperComponent] })],
};
export default meta;
type Story = StoryObj;

export const TabsCascade: Story = { render: () => ({ template: `<lc-motion-tabs-cascade />` }) };
export const Stepper: Story = { render: () => ({ template: `<lc-motion-stepper />` }) };
