import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcTooltipDirective } from '../tooltip/tooltip.directive';

/**
 * Tooltip attached to any element with `[lcTooltip]`: it shows after 500 ms of hover or focus, 4 px from the element,
 * and flips to the first position that fits. The element keeps its own accessible name.
 *
 * Import: `import { LcTooltipDirective } from '@lionelcointot/ui-angular/overlay';`
 */
const meta: Meta<LcTooltipDirective> = {
  title: 'Overlays/Tooltip',
  component: LcTooltipDirective,
  decorators: [moduleMetadata({ imports: [LcTooltipDirective, LcButtonComponent, LcIconComponent] })],
  parameters: { layout: 'fullscreen' },
  args: { lcTooltip: 'Notifications', lcTooltipPosition: 'above' },
  argTypes: { lcTooltipPosition: { control: 'inline-radio', options: ['above', 'below', 'start', 'end'] } },
};
export default meta;
type Story = StoryObj<LcTooltipDirective>;

const ICON_BUTTON = (position: string, label: string, icon = 'bell') =>
  `<button lcButton iconOnly fillMode="flat" themeColor="neutral" aria-label="${label}" [lcTooltip]="'${label}'" lcTooltipPosition="${position}"><lc-icon name="${icon}" /></button>`;

/** Both inputs are bound: hover or focus the button. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="display:flex;justify-content:center;padding:96px 16px">
      <button lcButton iconOnly fillMode="flat" themeColor="neutral" aria-label="Notifications" [lcTooltip]="lcTooltip" [lcTooltipPosition]="lcTooltipPosition"><lc-icon name="bell" /></button>
    </div>`,
  }),
};

/** Hover or focus a button: the tooltip appears after 500 ms, 4 px from the element, in the four directions. */
export const Positions: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="display:flex;gap:96px;justify-content:center;padding:96px 16px">
        ${ICON_BUTTON('above', 'Au-dessus')}${ICON_BUTTON('below', 'En dessous')}${ICON_BUTTON('start', 'Avant', 'inbox')}${ICON_BUTTON('end', 'Après', 'send')}
      </div>`,
  }),
};

/** Near the window edges: the requested position flips to the first one that fits (opposite, then sides). */
export const NearEdges: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="position:fixed;inset:0;display:grid;grid-template:auto 1fr auto / auto 1fr auto;padding:8px">
        <div style="grid-area:1/1">${ICON_BUTTON('above', 'Demandée au-dessus, en haut à gauche')}</div>
        <div style="grid-area:1/3">${ICON_BUTTON('above', 'Demandée au-dessus, en haut à droite')}</div>
        <div style="grid-area:3/1">${ICON_BUTTON('below', 'Demandée en dessous, en bas à gauche')}</div>
        <div style="grid-area:3/3">${ICON_BUTTON('below', 'Demandée en dessous, en bas à droite')}</div>
        <div style="grid-area:2/1;align-self:center">${ICON_BUTTON('start', 'Demandée avant, au bord gauche')}</div>
        <div style="grid-area:2/3;align-self:center">${ICON_BUTTON('end', 'Demandée après, au bord droit')}</div>
      </div>`,
  }),
};
