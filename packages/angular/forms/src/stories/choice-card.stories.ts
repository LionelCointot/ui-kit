import { Component, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcChoiceCardComponent, LcRadioGroupComponent, LcRadioDirective } from '@lionelcointot/ui-angular/forms';

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

/**
 * Selectable card wrapping a native radio (`lc-choice-card`), with a title and an optional description.
 * Place the cards in an `lc-radio-group`; the value stays on the native radios.
 *
 * Import: `import { LcChoiceCardComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcChoiceCardComponent> = {
  title: 'Forms/Choice card',
  component: LcChoiceCardComponent,
  decorators: [moduleMetadata({ imports: [ChoiceCardDemoComponent, LcRadioGroupComponent, LcRadioDirective, LcChoiceCardComponent] })],
  args: { title: 'Moyen terme', description: 'Un objectif entre deux et sept ans.' },
};
export default meta;
type Story = StoryObj<LcChoiceCardComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width:32rem">
        <lc-radio-group legend="Horizon de votre projet">
          <lc-choice-card [title]="title" [description]="description"><input type="radio" lcRadio value="a" checked /></lc-choice-card>
          <lc-choice-card title="Long terme" description="Un objectif à plus de sept ans."><input type="radio" lcRadio value="b" /></lc-choice-card>
        </lc-radio-group>
      </div>`,
  }),
};

/** Stacked cards: arrows move and select within the group, Tab enters and leaves. */
export const Stacked: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<div style="max-width:32rem"><lc-choice-card-demo /></div>` }),
};

/** Horizontal orientation: 3 cards per row at 180 px minimum, otherwise they wrap. */
export const Inline: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-choice-card-demo orientation="horizontal" />` }),
};

/** Disabled cards, one of them checked. */
export const Disabled: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:32rem"><lc-radio-group legend="Horizon (indisponible)">
      <lc-choice-card title="Court terme" description="Un objectif à moins de deux ans."><input type="radio" lcRadio value="a" disabled /></lc-choice-card>
      <lc-choice-card title="Long terme" description="Un objectif à plus de sept ans."><input type="radio" lcRadio value="b" checked disabled /></lc-choice-card>
    </lc-radio-group></div>`,
  }),
};

/** Invalid: error border; the error message stays the field's (`aria-describedby` of the group). */
export const Invalid: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:32rem"><lc-radio-group legend="Horizon de votre projet">
      <lc-choice-card title="Court terme" description="Un objectif à moins de deux ans."><input type="radio" lcRadio value="a" aria-invalid="true" /></lc-choice-card>
      <lc-choice-card title="Long terme" description="Un objectif à plus de sept ans."><input type="radio" lcRadio value="b" aria-invalid="true" /></lc-choice-card>
    </lc-radio-group></div>`,
  }),
};

/** Cards with a title only. */
export const WithoutDescription: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:32rem"><lc-radio-group legend="Choix">
      <lc-choice-card title="Oui"><input type="radio" lcRadio value="yes" /></lc-choice-card>
      <lc-choice-card title="Non"><input type="radio" lcRadio value="no" checked /></lc-choice-card>
    </lc-radio-group></div>`,
  }),
};

/**
 * Phone width. The hover veil only exists under `@media (hover: hover)`: to see the touch effect, enable touch emulation in the
 * browser tools (no veil after a tap, the checked card stays tinted).
 */
export const Touch: Story = {
  parameters: { ...fixedExample, viewport: { defaultViewport: 'mobile1' } },
  render: () => ({ template: `<div style="max-width:22rem"><lc-choice-card-demo /></div>` }),
};
