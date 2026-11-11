import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcMeterComponent } from '../meter/meter.component';

const COLORS = ['primary', 'success', 'warning', 'error', 'neutral'] as const;

const meta: Meta<LcMeterComponent> = {
  title: 'Retours d\'état/Jauge',
  component: LcMeterComponent,
  decorators: [moduleMetadata({ imports: [LcMeterComponent] })],
  argTypes: {
    themeColor: { control: 'select', options: [...COLORS] },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
  args: { value: 72, min: 0, max: 100, label: 'Taux de remplissage', themeColor: 'primary', size: 'small', showValue: true },
  render: (args) => ({
    props: args,
    template: `<div style="max-width:20rem"><lc-meter [value]="value" [min]="min" [max]="max" [label]="label" [valueText]="valueText"
      [themeColor]="themeColor" [size]="size" [showValue]="showValue" /></div>`,
  }),
};
export default meta;
type Story = StoryObj<LcMeterComponent>;

export const Defaut: Story = {};

export const Couleurs: Story = {
  render: () => ({
    props: { colors: COLORS },
    template: `<div style="display:grid;gap:12px;max-width:24rem">
      @for (color of colors; track color) { <lc-meter [value]="64" [label]="'Taux de remplissage (' + color + ')'" [themeColor]="color" [showValue]="true" /> }</div>`,
  }),
};

export const Tailles: Story = {
  render: () => ({
    template: `<div style="display:grid;gap:12px;max-width:24rem">
      <lc-meter [value]="40" label="Petite jauge" size="small" [showValue]="true" />
      <lc-meter [value]="40" label="Jauge moyenne" size="medium" [showValue]="true" />
      <lc-meter [value]="40" label="Grande jauge" size="large" [showValue]="true" /></div>`,
  }),
};

/** Valeur absente : piste vide, « — » visible, « Non mesuré » lu par les lecteurs d'écran. */
export const NonMesure: Story = {
  args: { value: null },
};

/** Valeur hors bornes : le remplissage est recadré, la valeur lue reste celle fournie. */
export const HorsBornes: Story = {
  args: { value: 130, label: 'Quota utilisé', valueText: '130 % du quota' },
};

export const PlageEtTexteLu: Story = {
  args: { value: 18, min: 10, max: 30, label: 'Température', valueText: '18 degrés', themeColor: 'warning' },
};

/** Dans une cellule de tableau, sans valeur affichée à côté (la valeur est dans une autre colonne). */
export const SansValeurAffichee: Story = {
  args: { value: 85, showValue: false, themeColor: 'error', label: 'Quota utilisé' },
};
