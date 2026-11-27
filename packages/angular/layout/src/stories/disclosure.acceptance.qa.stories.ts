import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcDisclosureComponent } from '@lionelcointot/ui-angular/layout';

/**
 * Support de la fiche T10a (spec 2026-12-mouvement-v2, d48) : ouverture 300 ms, repli 100 ms, chevron 300 ms, contenu qui glisse de -5 px.
 * À piloter par une suite navigateur : clic sur `#qa-disclosure button[aria-expanded]`, lecture de `getAnimations()` / `getComputedStyle` sur
 * `.lc-disclosure__region`, `.lc-disclosure__region-body` et `.lc-disclosure__chevron`.
 */
const meta: Meta = {
  title: 'QA/Layout/Disclosure motion',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [LcDisclosureComponent] })],
  render: () => ({
    template: `<lc-disclosure id="qa-disclosure" bordered><span lcDisclosureSummary>Détail</span><p>Contenu de la ligne.</p></lc-disclosure>`,
  }),
};
export default meta;
export const Disclosure: StoryObj = {};
