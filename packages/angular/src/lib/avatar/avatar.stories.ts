import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes, fixedExample } from '@lc/storybook';
import { LcAvatarComponent } from '@lionelcointot/ui-angular';

// Photo embarquée (SVG en data URI) : aucune dépendance réseau dans Storybook.
const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#2a78d6"/>' +
      '<circle cx="24" cy="19" r="8" fill="#fff"/><path d="M8 48c2-12 10-16 16-16s14 4 16 16z" fill="#fff"/></svg>',
  );

const NAMES = ['Élodie Martin', 'Jean-Pierre Durand', 'Anne de la Tour', 'Karim', 'Zoë Lefèvre', 'Paul Bernard', 'Sophie Roux', 'Hugo Petit'];

/**
 * Round avatar: a photo, or the initials of the name on a colour derived from the name (or from `colorSeed`), or a user icon when there is no usable name.
 * With a `label` it is announced as an image; without, it is decorative and the name must appear next to it.
 *
 * Import: `import { LcAvatarComponent } from '@lionelcointot/ui-angular';`
 */
const meta: Meta<LcAvatarComponent> = {
  title: 'Data/Avatar',
  component: LcAvatarComponent,
  decorators: [moduleMetadata({ imports: [LcAvatarComponent] })],
  args: { name: 'Élodie Martin', src: '', size: 'medium', colorSeed: '', label: '' },
  argTypes: { size: commonArgTypes.size },
};
export default meta;
type Story = StoryObj<LcAvatarComponent>;

/** Every input is bound: change them in the Controls panel. An empty `src`, `colorSeed` or `label` means "not set". */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['src'] } },
  render: (args) => ({
    props: args,
    template: `<lc-avatar [name]="name" [src]="src || undefined" [size]="size" [colorSeed]="colorSeed || undefined" [label]="label || undefined" />`,
  }),
};

/** `small`, `medium` and `large`. */
export const Sizes: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-3);align-items:center">
      <lc-avatar name="Élodie Martin" size="small" /><lc-avatar name="Élodie Martin" size="medium" /><lc-avatar name="Élodie Martin" size="large" /></div>`,
  }),
};

/** Colour palette: each name gets a stable colour. */
export const Palette: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { names: NAMES },
    template: `<div style="display:flex;gap:var(--lc-sys-space-3);flex-wrap:wrap">
      @for (name of names; track name) { <lc-avatar [name]="name" size="large" [label]="name" /> }</div>`,
  }),
};

/** With a photo (`src`). */
export const WithPhoto: Story = {
  parameters: fixedExample,
  render: () => ({ props: { src: PHOTO }, template: `<lc-avatar name="Élodie Martin" [src]="src" label="Élodie Martin" />` }),
};

/** Photo not found: the initials take over. */
export const BrokenPhoto: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-avatar name="Élodie Martin" src="https://invalid.example/missing.png" label="Élodie Martin" />` }),
};

/** No usable name: user icon. */
export const WithoutInitials: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-avatar name="" />` }),
};

/** Same `colorSeed`: same colour whatever the name (e.g. a stable account identifier). */
export const ColorSeed: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-3);align-items:center">
      <lc-avatar name="Élodie Martin" colorSeed="user-42" /><lc-avatar name="Élodie M." colorSeed="user-42" /><lc-avatar name="Élodie Martin" colorSeed="user-43" /></div>`,
  }),
};

/** Labelled (`role="img"`) or decorative (`aria-hidden`, the name is read next to it). */
export const Accessibility: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-3)">
      <lc-avatar name="Élodie Martin" label="Élodie Martin, connectée" />
      <span style="display:inline-flex;gap:var(--lc-sys-space-2);align-items:center"><lc-avatar name="Élodie Martin" /> Élodie Martin</span></div>`,
  }),
};
