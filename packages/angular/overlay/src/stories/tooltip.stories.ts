import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcTooltipDirective } from '../tooltip/tooltip.directive';

const meta: Meta = {
  title: 'Superpositions/Info-bulle',
  decorators: [moduleMetadata({ imports: [LcTooltipDirective, LcButtonComponent, LcIconComponent] })],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

const ICON_BUTTON = (position: string, label: string, icon = 'bell') =>
  `<button lcButton iconOnly fillMode="flat" themeColor="neutral" aria-label="${label}" [lcTooltip]="'${label}'" lcTooltipPosition="${position}"><lc-icon name="${icon}" /></button>`;

/** Survoler ou focaliser un bouton : l'info-bulle apparaît après 500 ms, à 4 px de l'élément, dans les quatre directions. */
export const Positions: Story = {
  render: () => ({
    template: `
      <div style="display:flex;gap:96px;justify-content:center;padding:96px 16px">
        ${ICON_BUTTON('above', 'Au-dessus')}${ICON_BUTTON('below', 'En dessous')}${ICON_BUTTON('start', 'Avant', 'inbox')}${ICON_BUTTON('end', 'Après', 'send')}
      </div>`,
  }),
};

/** Aux bords de la fenêtre : la position demandée bascule vers la première qui tient (opposé, puis côtés). */
export const PresDesBords: Story = {
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
