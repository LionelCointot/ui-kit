import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcSegmentedControlComponent } from '../segmented-control/segmented-control.component';

const OPTIONS = [{ value: 'simple', label: 'Simple' }, { value: 'detailed', label: 'Détaillé' }];

/** Valeur pilotée : un choix n'est qu'une demande ; `value` ne change qu'après confirmation du parent. */
@Component({
  selector: 'lc-segmented-control-controlled-demo',
  imports: [LcSegmentedControlComponent],
  template: `
    <lc-segmented-control ariaLabel="Niveau de détail" controlled [options]="options" [value]="level()" (valueRequest)="request($event)" />
    <p>Niveau : {{ level() }}</p>
  `,
})
class ControlledDemoComponent {
  protected readonly options = OPTIONS;
  protected readonly level = signal<string | null>('detailed');

  protected request(next: string | null): void {
    if (confirm('Changer le niveau de détail ?')) this.level.set(next);
  }
}

const meta: Meta<LcSegmentedControlComponent<string>> = {
  title: 'Forms/Segmented control',
  component: LcSegmentedControlComponent,
  decorators: [moduleMetadata({ imports: [ControlledDemoComponent] })],
  args: { options: OPTIONS, value: 'simple', ariaLabel: 'Niveau de détail' },
};
export default meta;
type Story = StoryObj<LcSegmentedControlComponent<string>>;

/** L'option active porte une coche et un fond : l'état ne tient pas à la seule couleur. */
export const Defaut: Story = {};

export const AvecIcones: Story = {
  args: {
    options: [{ value: 'table', label: 'Tableau', icon: 'table' }, { value: 'chart', label: 'Courbe', icon: 'chart-line' }],
    value: 'chart',
  },
};

export const Pilotee: Story = { render: () => ({ template: '<lc-segmented-control-controlled-demo />' }) };
