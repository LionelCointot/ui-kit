import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes, fixedExample } from '@lc/storybook';
import { LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';

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
 * Exclusive choice between a few options, shown as a row of segments (`lc-segmented-control`). The active option gets a background and a ring
 * (`outline`) or a raised pill that slides over a sunken track (`fillMode="solid"`), so the state never relies on colour alone; an option without icon shows a check when active. In controlled mode, a click is only a request (`valueRequest`).
 *
 * Import: `import { LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcSegmentedControlComponent<string>> = {
  title: 'Forms/Segmented control',
  component: LcSegmentedControlComponent,
  decorators: [moduleMetadata({ imports: [LcSegmentedControlComponent, ControlledDemoComponent] })],
  args: { ariaLabel: 'Niveau de détail', size: 'medium', fillMode: 'outline', fullWidth: false, disabled: false },
  argTypes: {
    size: commonArgTypes.size,
    fillMode: { control: 'inline-radio', options: ['outline', 'solid'] },
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
      <lc-segmented-control [options]="options" [(value)]="selection" [ariaLabel]="ariaLabel" [size]="size" [fillMode]="fillMode"
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

/** `fillMode="solid"`: sunken track and a raised pill that slides to the chosen segment; each option keeps its icon. */
export const SolidWithIcons: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      options: [{ value: 'messages', label: 'Échanges', icon: 'message-square' }, { value: 'info', label: 'Informations', icon: 'info' }],
      selection: signal<string | null>('messages'),
    },
    template: `<lc-segmented-control ariaLabel="Affichage" fillMode="solid" fullWidth [options]="options" [(value)]="selection" />`,
  }),
};

/** Controlled value: a choice is only a request, `value` changes once the parent confirms. */
export const Controlled: Story = {
  parameters: fixedExample,
  render: () => ({ template: '<lc-segmented-control-controlled-demo />' }),
};
