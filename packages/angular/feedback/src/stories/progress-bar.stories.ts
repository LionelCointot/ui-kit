import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcProgressBarComponent } from '@lionelcointot/ui-angular/feedback';

/**
 * Progress bar (`role="progressbar"`): a value from 0 to 100, or `null` for an indeterminate progress.
 * Use it for the advance of a task; for a measured quantity, use `lc-meter`.
 *
 * Import: `import { LcProgressBarComponent } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<LcProgressBarComponent> = {
  title: 'Feedback/Progress bar',
  component: LcProgressBarComponent,
  decorators: [moduleMetadata({ imports: [LcProgressBarComponent] })],
  args: { value: 40, label: "Progression de l'import" },
  argTypes: { value: { control: { type: 'range', min: 0, max: 100, step: 1 } } },
};
export default meta;
type Story = StoryObj<LcProgressBarComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="max-width:24rem"><lc-progress-bar [value]="value" [label]="label" /></div>`,
  }),
};

/** From empty to complete; out-of-range values are clamped to 0–100. */
export const Values: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { values: [0, 25, 60, 100, 140] },
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);max-width:24rem">
      @for (value of values; track value) { <lc-progress-bar [value]="value" [label]="'Progression ' + value + ' %'" /> }</div>`,
  }),
};

/** `null` (the default): animated bar for a task of unknown duration, without `aria-valuenow`. */
export const Indeterminate: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:24rem"><lc-progress-bar [value]="null" label="Analyse en cours" /></div>`,
  }),
};

/** Composition: a labeled upload with its percentage. */
export const WithLabelAndPercentage: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:24rem;display:grid;gap:var(--lc-sys-space-1)">
      <div style="display:flex;justify-content:space-between"><span>photos-vacances.zip</span><span>65 %</span></div>
      <lc-progress-bar [value]="65" label="Envoi de photos-vacances.zip" /></div>`,
  }),
};
