import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcStackComponent } from '@lionelcointot/ui-angular/layout';

const BOX = 'padding:var(--lc-sys-space-3) var(--lc-sys-space-4);background:var(--lc-sys-color-surface-sunken);border:1px solid var(--lc-sys-color-border);border-radius:var(--lc-sys-radius-md)';

/**
 * Flexible stack: lays its children out vertically or horizontally with a spacing from the design tokens.
 *
 * Import: `import { LcStackComponent } from '@lionelcointot/ui-angular/layout';`
 */
const meta: Meta<LcStackComponent> = {
  title: 'Layout/Stack',
  component: LcStackComponent,
  decorators: [moduleMetadata({ imports: [LcStackComponent] })],
  args: { direction: 'horizontal', gap: '4', align: 'center', justify: 'start', wrap: false },
  argTypes: {
    direction: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    gap: { control: 'select', options: ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16'] },
    align: { control: 'select', options: [undefined, 'start', 'center', 'end', 'stretch', 'baseline'] },
    justify: { control: 'select', options: [undefined, 'start', 'center', 'end', 'between'] },
  },
};
export default meta;
type Story = StoryObj<LcStackComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, box: BOX },
    template: `
      <lc-stack [direction]="direction" [gap]="gap" [align]="align" [justify]="justify" [wrap]="wrap"
        style="min-height:10rem;border:1px dashed var(--lc-sys-color-border-strong)">
        <div [style]="box">Première étape</div>
        <div [style]="box" style="padding-block:var(--lc-sys-space-6)">Seconde étape, plus haute</div>
        <div [style]="box">Troisième</div>
        <div [style]="box">Quatrième étape</div>
        <div [style]="box">Cinquième</div>
        <div [style]="box">Sixième étape</div>
      </lc-stack>`,
  }),
};

/** A vertical stack of form-like rows, the default direction. */
export const Vertical: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { box: BOX },
    template: `
      <lc-stack gap="3" style="max-width:20rem">
        <div [style]="box">Nom du projet</div>
        <div [style]="box">Description</div>
        <div [style]="box">Équipe</div>
      </lc-stack>`,
  }),
};

/** A horizontal toolbar: items centred on the cross axis, spread with `justify="between"`. */
export const Toolbar: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { box: BOX },
    template: `
      <lc-stack direction="horizontal" align="center" justify="between" gap="4">
        <div [style]="box">Fichiers</div>
        <div [style]="box">Filtrer</div>
        <div [style]="box">Trier par date</div>
      </lc-stack>`,
  }),
};

/** With `wrap`, a horizontal stack flows onto several lines when it runs out of room. */
export const Wrapping: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { box: BOX },
    template: `
      <lc-stack direction="horizontal" wrap gap="2" style="max-width:24rem">
        @for (tag of ['Conception', 'Développement', 'Recette', 'Documentation', 'Déploiement', 'Maintenance']; track tag) {
          <div [style]="box">{{ tag }}</div>
        }
      </lc-stack>`,
  }),
};
