import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample } from '@lc/storybook';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcTooltipDirective } from '@lionelcointot/ui-angular/overlay';

/**
 * Tooltip attached to any element with `[lcTooltip]`: it shows after 500 ms of hover or focus, 4 px from the element,
 * and flips to the first position that fits. The element keeps its own accessible name.
 *
 * Import: `import { LcTooltipDirective } from '@lionelcointot/ui-angular/overlay';`
 */
const meta: Meta<LcTooltipDirective> = {
  title: 'Overlays/Tooltip',
  component: LcTooltipDirective,
  decorators: [moduleMetadata({ imports: [LcTooltipDirective, LcButtonComponent, LcIconComponent, StoryMotionNoticeComponent] })],
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
  // S'ouvre au clic : la vérification des contrôles clique sur le bouton avant de comparer le rendu.
  parameters: { controlsCheck: { openWith: 'button' } },
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

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { LcTooltipDirective } from '@lionelcointot/ui-angular/overlay';

@Component({
  selector: 'app-example',
  imports: [LcTooltipDirective],
  template: \`<button type="button" lcTooltip="Notifications">Cloche</button>\`,
})
export class ExampleComponent {}`;

const BARS = [
  { height: '45%', label: '12 h, lundi' },
  { height: '70%', label: '18 h, mardi' },
  { height: '55%', label: '14 h, mercredi' },
  { height: '90%', label: '22 h, jeudi' },
  { height: '60%', label: '16 h, vendredi' },
];

/**
 * No movement, on purpose: a tooltip appears and disappears without fading or sliding, and a hovered bar changes colour at once.
 * "Rejouer" moves the highlight to the next bar by script, so the jump can be seen.
 */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => {
    const hot = signal(0);
    return {
      props: { bars: BARS, hot, next: () => hot.update((i) => (i + 1) % BARS.length) },
      template: `
        <lc-story-motion-notice />
        <div data-demo="d50" style="padding:var(--lc-sys-space-6) var(--lc-sys-space-4)">
          <button lcButton fillMode="outline" size="small" (click)="next()">Rejouer</button>
          <div aria-hidden="true" style="display:flex;align-items:flex-end;gap:var(--lc-sys-space-3);block-size:10rem;margin-block-start:var(--lc-sys-space-8)">
            @for (bar of bars; track bar.label; let i = $index) {
              <div style="position:relative;flex:1;max-inline-size:3rem" [style.block-size]="bar.height"
                [style.background]="hot() === i ? 'var(--lc-sys-color-on-surface)' : 'var(--lc-sys-color-border-strong)'">
                @if (hot() === i) {
                  <span style="position:absolute;inset-block-end:100%;inset-inline-start:50%;translate:-50% calc(-1 * var(--lc-sys-space-1));white-space:nowrap;padding:var(--lc-sys-space-1) var(--lc-sys-space-2);border-radius:var(--lc-sys-radius-sm);background:var(--lc-sys-color-on-surface);color:var(--lc-sys-color-surface)">{{ bar.label }}</span>
                }
              </div>
            }
          </div>
          <p>Le survol d'une barre et son infobulle apparaissent d'un coup, sans fondu.</p>
        </div>`,
    };
  },
};
