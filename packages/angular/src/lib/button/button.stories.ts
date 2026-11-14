import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent } from './button.component';
import { LcIconComponent } from '../icon/icon.component';

const meta: Meta<LcButtonComponent> = {
  title: 'Actions/Bouton',
  component: LcButtonComponent,
  decorators: [moduleMetadata({ imports: [LcButtonComponent, LcIconComponent] })],
  argTypes: {
    themeColor: { control: 'select', options: ['primary', 'secondary', 'success', 'warning', 'error', 'highlight', 'neutral'] },
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
            @for (color of ['primary','secondary','success','warning','error','highlight','neutral']; track color) {
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

/**
 * Cible tactile : un bouton de moins de 44 px (taille `small`, icône seule) garde une zone de frappe de 44 px
 * de haut et de large (pseudo-élément invisible, rendu inchangé). Réglable : `--lc-button-hit-size`.
 * Les zones de deux boutons voisins se chevauchent s'ils sont espacés de moins de 8 px : laisser au moins 8 px.
 */
export const ZoneDeFrappe: Story = {
  render: () => ({
    template: `
      <div style="display:flex;gap:16px;align-items:center">
        <button lcButton size="small">Modifier</button>
        <button lcButton size="small" iconOnly fillMode="flat" themeColor="neutral" aria-label="Déplier"><lc-icon name="plus" /></button>
        <button lcButton>Moyen</button>
      </div>`,
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
