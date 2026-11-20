import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcTruncateDirective } from '@lionelcointot/ui-angular';

/**
 * Single-line text cut with an ellipsis. On hover the text scrolls to its end, pauses, then goes back;
 * nothing moves when it fits. With `prefers-reduced-motion: reduce` it does not scroll and `title` holds the full text, only when it overflows.
 * Speed: `--lc-truncate-speed` (pixels per second, unitless).
 *
 * Import: `import { LcTruncateDirective } from '@lionelcointot/ui-angular';`
 */
const meta: Meta = {
  title: 'Layout/Truncate',
  decorators: [moduleMetadata({ imports: [LcTruncateDirective] })],
};
export default meta;
type Story = StoryObj;

const names = [
  'Résidence des Tilleuls, bâtiment B, escalier 3',
  'Marie Dupont',
  'Syndicat des copropriétaires de la résidence du Parc Montsouris',
  'Jean Roux',
  'Fuite d’eau dans le local technique du sous-sol, côté parking',
];

/** Long and short names in a narrow column: only the long ones end with an ellipsis and scroll on hover. */
export const NarrowColumn: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { names },
    template: `<ul style="width:14rem;margin:0;padding:0;list-style:none;display:grid;gap:var(--lc-sys-space-2)">
      @for (name of names; track name) { <li><span lcTruncate>{{ name }}</span></li> }</ul>`,
  }),
};

/** Right-to-left text scrolls in its reading direction. */
export const RightToLeft: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div dir="rtl" style="width:10rem"><span lcTruncate>مرحبا بكم في موقع الجمعية العامة لمالكي العقار السكني</span></div>`,
  }),
};
