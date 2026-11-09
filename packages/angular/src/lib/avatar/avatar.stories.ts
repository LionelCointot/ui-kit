import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcAvatarComponent } from './avatar.component';

// Photo embarquée (SVG en data URI) : aucune dépendance réseau dans Storybook.
const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#2a78d6"/>' +
      '<circle cx="24" cy="19" r="8" fill="#fff"/><path d="M8 48c2-12 10-16 16-16s14 4 16 16z" fill="#fff"/></svg>',
  );

const NAMES = ['Élodie Martin', 'Jean-Pierre Durand', 'Anne de la Tour', 'Karim', 'Zoë Lefèvre', 'Paul Bernard', 'Sophie Roux', 'Hugo Petit'];

const meta: Meta<LcAvatarComponent> = {
  title: 'Données/Avatar',
  component: LcAvatarComponent,
  decorators: [moduleMetadata({ imports: [LcAvatarComponent] })],
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
  args: { name: 'Élodie Martin', size: 'medium' },
  render: (args) => ({
    props: args,
    template: `<lc-avatar [name]="name" [src]="src" [size]="size" [colorSeed]="colorSeed" [label]="label" />`,
  }),
};
export default meta;
type Story = StoryObj<LcAvatarComponent>;

export const Defaut: Story = {};

export const Tailles: Story = {
  render: () => ({
    template: `<div style="display:flex;gap:12px;align-items:center">
      <lc-avatar name="Élodie Martin" size="small" /><lc-avatar name="Élodie Martin" size="medium" /><lc-avatar name="Élodie Martin" size="large" /></div>`,
  }),
};

export const Palette: Story = {
  render: () => ({
    props: { names: NAMES },
    template: `<div style="display:flex;gap:12px;flex-wrap:wrap">
      @for (name of names; track name) { <lc-avatar [name]="name" size="large" [label]="name" /> }</div>`,
  }),
};

export const AvecPhoto: Story = {
  args: { src: PHOTO, label: 'Élodie Martin' },
};

/** Photo introuvable : les initiales prennent le relais. */
export const PhotoEnEchec: Story = {
  args: { src: 'https://invalid.example/missing.png', label: 'Élodie Martin' },
};

/** Sans nom exploitable : icône utilisateur. */
export const SansInitiales: Story = {
  args: { name: '' },
};

/** Même `colorSeed` : même couleur, quel que soit le nom (ex. identifiant stable du compte). */
export const GraineDeCouleur: Story = {
  render: () => ({
    template: `<div style="display:flex;gap:12px;align-items:center">
      <lc-avatar name="Élodie Martin" colorSeed="user-42" /><lc-avatar name="Élodie M." colorSeed="user-42" /><lc-avatar name="Élodie Martin" colorSeed="user-43" /></div>`,
  }),
};

/** Étiqueté (`role="img"`) ou décoratif (`aria-hidden`, le nom est lu à côté). */
export const Accessibilite: Story = {
  render: () => ({
    template: `<div style="display:grid;gap:12px">
      <lc-avatar name="Élodie Martin" label="Élodie Martin, connectée" />
      <span style="display:inline-flex;gap:8px;align-items:center"><lc-avatar name="Élodie Martin" /> Élodie Martin</span></div>`,
  }),
};
