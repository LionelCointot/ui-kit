import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample, sizeOptions } from '@lc/storybook';
import { LcMeterComponent } from '@lionelcointot/ui-angular/feedback';

const COLORS = ['primary', 'success', 'warning', 'error', 'neutral'] as const;

/**
 * Gauge (`role="meter"`): a measured value inside a known range, with an accessible label and optional spoken text.
 * Unlike a progress bar, it shows a quantity, not the advance of a task.
 *
 * Import: `import { LcMeterComponent } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<LcMeterComponent> = {
  title: 'Feedback/Meter',
  component: LcMeterComponent,
  decorators: [moduleMetadata({ imports: [LcMeterComponent] })],
  argTypes: {
    themeColor: { control: 'select', options: [...COLORS] },
    size: { control: 'inline-radio', options: [...sizeOptions] },
  },
  args: { value: 72, min: 0, max: 100, label: 'Taux de remplissage', valueText: undefined, themeColor: 'primary', size: 'small', showValue: true },
};
export default meta;
type Story = StoryObj<LcMeterComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="max-width:20rem"><lc-meter [value]="value" [min]="min" [max]="max" [label]="label" [valueText]="valueText"
      [themeColor]="themeColor" [size]="size" [showValue]="showValue" /></div>`,
  }),
};

/** The five theme colors. */
export const Colors: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { colors: COLORS },
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);max-width:24rem">
      @for (color of colors; track color) { <lc-meter [value]="64" [label]="'Taux de remplissage (' + color + ')'" [themeColor]="color" [showValue]="true" /> }</div>`,
  }),
};

/** `small`, `medium` and `large`. */
export const Sizes: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);max-width:24rem">
      <lc-meter [value]="40" label="Petite jauge" size="small" [showValue]="true" />
      <lc-meter [value]="40" label="Jauge moyenne" size="medium" [showValue]="true" />
      <lc-meter [value]="40" label="Grande jauge" size="large" [showValue]="true" /></div>`,
  }),
};

/** Missing value: empty track, a visible dash, and "Non mesuré" read by screen readers. */
export const NotMeasured: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:20rem"><lc-meter [value]="null" label="Taux de remplissage" [showValue]="true" /></div>`,
  }),
};

/** Out-of-range value: the fill is clamped, the spoken value stays the one provided. */
export const OutOfRange: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:20rem"><lc-meter [value]="130" label="Quota utilisé" valueText="130 % du quota" [showValue]="true" /></div>`,
  }),
};

/** Custom `min` / `max` and a `valueText` read instead of the raw number. */
export const CustomRangeAndSpokenText: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:20rem"><lc-meter [value]="18" [min]="10" [max]="30" label="Température" valueText="18 degrés" themeColor="warning" [showValue]="true" /></div>`,
  }),
};

/** In a table cell, without the value shown next to it (the value lives in another column). */
export const WithoutVisibleValue: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:20rem"><lc-meter [value]="85" [showValue]="false" themeColor="error" label="Quota utilisé" /></div>`,
  }),
};
