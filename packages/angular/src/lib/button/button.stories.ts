import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { commonArgTypes, fixedExample } from '@lc/storybook';
import { LcButtonComponent } from './button.component';
import { LcIconComponent } from '../icon/icon.component';

/**
 * Action button applied to a native `<button>` or `<a>` (`button[lcButton]`, `a[lcButton]`).
 * Exposes the common API (`themeColor`, `fillMode`, `size`, `rounded`), a loading state and a toggle state (`pressed`).
 *
 * Import: `import { LcButtonComponent } from '@lionelcointot/ui-angular';`
 */
const meta: Meta<LcButtonComponent> = {
  title: 'Buttons/Button',
  component: LcButtonComponent,
  decorators: [moduleMetadata({ imports: [LcButtonComponent, LcIconComponent] })],
  args: { themeColor: 'primary', fillMode: 'solid', size: 'medium', rounded: 'medium', loading: false, iconOnly: false, fullWidth: false },
  argTypes: { ...commonArgTypes, pressed: { control: 'select', options: [undefined, false, true] } },
};
export default meta;
type Story = StoryObj<LcButtonComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<button lcButton [themeColor]="themeColor" [fillMode]="fillMode" [size]="size" [rounded]="rounded"
      [loading]="loading" [iconOnly]="iconOnly" [fullWidth]="fullWidth" [pressed]="pressed"
      [attr.aria-label]="iconOnly ? 'Ajouter' : null">
      @if (iconOnly) { <lc-icon name="plus" /> } @else { Enregistrer }
    </button>`,
  }),
};

/** Every `themeColor` × `fillMode` combination. */
export const Variants: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-3)">
        @for (fill of ['solid','outline','flat']; track fill) {
          <div style="display:flex;gap:var(--lc-sys-space-2);flex-wrap:wrap">
            @for (color of ['primary','secondary','success','warning','error','highlight','neutral']; track color) {
              <button lcButton [fillMode]="fill" [themeColor]="color">{{ color }}</button>
            }
          </div>
        }
      </div>`,
  }),
};

/** `small`, `medium` and `large` share the control heights of every form field. */
export const Sizes: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-2);align-items:center">
      <button lcButton size="small">Petit</button><button lcButton size="medium">Moyen</button><button lcButton size="large">Grand</button></div>`,
  }),
};

/**
 * Touch target: a button smaller than 44 px (`small` size, icon only) keeps a 44 × 44 px hit area
 * (invisible pseudo-element, unchanged rendering). Tunable with `--lc-button-hit-size`.
 * Hit areas of neighbouring buttons overlap below 8 px of spacing: keep at least 8 px.
 */
export const HitArea: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="display:flex;gap:var(--lc-sys-space-4);align-items:center">
        <button lcButton size="small">Modifier</button>
        <button lcButton size="small" iconOnly fillMode="flat" themeColor="neutral" aria-label="Déplier"><lc-icon name="plus" /></button>
        <button lcButton>Moyen</button>
      </div>`,
  }),
};

/**
 * Toggle state: `[pressed]` sets `aria-pressed` and a distinct style (ring and tinted background). Without `[pressed]`,
 * no `aria-pressed`. The consumer flips the value on click. With `iconOnly`, an accessible name is still required.
 */
export const Pressed: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { notifications: true },
    template: `
      <div style="display:flex;gap:var(--lc-sys-space-4);flex-wrap:wrap;align-items:center">
        <button lcButton fillMode="outline" themeColor="neutral" [pressed]="false">Non enfoncé</button>
        <button lcButton fillMode="outline" themeColor="neutral" [pressed]="true">Enfoncé</button>
        <button lcButton [pressed]="true">Plein enfoncé</button>
        <button lcButton fillMode="flat" themeColor="neutral" [pressed]="true">Plat enfoncé</button>
        <button lcButton iconOnly fillMode="flat" themeColor="neutral" [pressed]="false" aria-label="Notifications"><lc-icon name="bell" /></button>
        <button lcButton iconOnly fillMode="flat" themeColor="neutral" [pressed]="true" aria-label="Notifications"><lc-icon name="bell-off" /></button>
        <button lcButton iconOnly fillMode="outline" themeColor="neutral" [pressed]="notifications" (click)="notifications = !notifications"
          aria-label="Notifications"><lc-icon [name]="notifications ? 'bell' : 'bell-off'" /></button>
        <button lcButton fillMode="outline" themeColor="neutral">Sans état (aucun aria-pressed)</button>
        <button lcButton fillMode="outline" themeColor="neutral" [pressed]="true" disabled>Désactivé enfoncé</button>
      </div>`,
  }),
};

/** Disabled, loading, icon only, icon with text, and a link styled as a button. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-2);flex-wrap:wrap">
      <button lcButton disabled>Désactivé</button>
      <button lcButton [loading]="true">Enregistrement</button>
      <button lcButton iconOnly fillMode="outline" aria-label="Ajouter"><lc-icon name="plus" /></button>
      <button lcButton><lc-icon name="save" /> Enregistrer</button>
      <a lcButton href="#" fillMode="outline">Lien-bouton</a></div>`,
  }),
};
