import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes, fixedExample } from '@lc/storybook';
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

/**
 * Exclusive choice between a few options, shown as a row of segments (`lc-segmented-control`). The active option carries a check and a
 * background, so the state never relies on colour alone. In controlled mode, a click is only a request (`valueRequest`).
 *
 * Import: `import { LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcSegmentedControlComponent<string>> = {
  title: 'Forms/Segmented control',
  component: LcSegmentedControlComponent,
  decorators: [moduleMetadata({ imports: [LcSegmentedControlComponent, ControlledDemoComponent] })],
  args: { ariaLabel: 'Niveau de détail', size: 'medium', fullWidth: false, disabled: false },
  argTypes: {
    size: commonArgTypes.size,
    options: { control: false },
    value: { control: false },
    valueRequest: { action: 'valueRequest' },
  },
};
export default meta;
type Story = StoryObj<LcSegmentedControlComponent<string>>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, options: OPTIONS, selection: signal<string | null>('simple') },
    template: `
      <lc-segmented-control [options]="options" [(value)]="selection" [ariaLabel]="ariaLabel" [size]="size"
        [fullWidth]="fullWidth" [disabled]="disabled" />`,
  }),
};

/** Options with an icon next to the label. */
export const WithIcons: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      options: [{ value: 'table', label: 'Tableau', icon: 'table' }, { value: 'chart', label: 'Courbe', icon: 'chart-line' }],
      selection: signal<string | null>('chart'),
    },
    template: `<lc-segmented-control ariaLabel="Affichage" [options]="options" [(value)]="selection" />`,
  }),
};

/** Controlled value: a choice is only a request, `value` changes once the parent confirms. */
export const Controlled: Story = {
  parameters: fixedExample,
  render: () => ({ template: '<lc-segmented-control-controlled-demo />' }),
};
