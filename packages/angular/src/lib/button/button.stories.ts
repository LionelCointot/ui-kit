import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent } from './button.component';
import { LcIconComponent } from '../icon/icon.component';

const meta: Meta<LcButtonComponent> = {
  title: 'Actions/Bouton',
  component: LcButtonComponent,
  decorators: [moduleMetadata({ imports: [LcButtonComponent, LcIconComponent] })],
  argTypes: {
    themeColor: { control: 'select', options: ['primary', 'secondary', 'success', 'warning', 'error', 'neutral'] },
    fillMode: { control: 'inline-radio', options: ['solid', 'outline', 'flat'] },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    rounded: { control: 'select', options: ['none', 'small', 'medium', 'large', 'full'] },
  },
  args: { themeColor: 'primary', fillMode: 'solid', size: 'medium', rounded: 'medium', loading: false, iconOnly: false, fullWidth: false },
  render: (args) => ({
    props: args,
    template: `<button lcButton [themeColor]="themeColor" [fillMode]="fillMode" [size]="size" [rounded]="rounded" [loading]="loading" [fullWidth]="fullWidth">Calculer</button>`,
  }),
};
export default meta;
type Story = StoryObj<LcButtonComponent>;

export const Defaut: Story = {};

export const Variantes: Story = {
  render: () => ({
    template: `
      <div style="display:grid;gap:12px">
        @for (fill of ['solid','outline','flat']; track fill) {
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            @for (color of ['primary','secondary','success','warning','error','neutral']; track color) {
              <button lcButton [fillMode]="fill" [themeColor]="color">{{ color }}</button>
            }
          </div>
        }
      </div>`,
  }),
};

export const Tailles: Story = {
  render: () => ({
    template: `<div style="display:flex;gap:8px;align-items:center">
      <button lcButton size="small">Petit</button><button lcButton size="medium">Moyen</button><button lcButton size="large">Grand</button></div>`,
  }),
};

export const Etats: Story = {
  render: () => ({
    template: `<div style="display:flex;gap:8px;flex-wrap:wrap">
      <button lcButton disabled>Désactivé</button>
      <button lcButton [loading]="true">Enregistrement</button>
      <button lcButton iconOnly fillMode="outline" aria-label="Ajouter un prêt"><lc-icon name="plus" /></button>
      <button lcButton><lc-icon name="save" /> Enregistrer</button>
      <a lcButton href="#" fillMode="outline">Lien-bouton</a></div>`,
  }),
};
