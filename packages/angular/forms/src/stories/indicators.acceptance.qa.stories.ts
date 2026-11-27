import { Component, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcSegmentedControlComponent, LcSwitchComponent } from '@lionelcointot/ui-angular/forms';

// Fixtures de la spec 2026-12-mouvement-v2, T8 (CA-21, CA-31, D-20 et indicateurs) : pilotées par `node tools/qa/indicators-browser.mjs`, sans `play`.

const OPTIONS = ['À faire', 'En cours', 'En revue', 'Terminé'].map((label, index) => ({ value: `o${index}`, label }));

/** Quatre segments (`[role=radio]`), le premier choisi ; `fillMode` : `outline` ou `solid` (la pastille existe dans les deux, D-20). Marge de 16 px : à 360 px de large, 328 px disponibles. */
@Component({
  selector: 'lc-motion-segmented',
  imports: [LcSegmentedControlComponent],
  template: `<div style="padding:16px"><lc-segmented-control id="seg" ariaLabel="QA" [options]="options" [(value)]="value" [fillMode]="fillMode()" /></div>`,
})
class MotionSegmentedComponent {
  readonly fillMode = input<'outline' | 'solid'>('outline');
  protected readonly options = OPTIONS;
  protected readonly value = signal<string | null>('o0');
}

/** `#sw1` coché, `#sw2` non coché. */
@Component({
  selector: 'lc-motion-switches',
  imports: [LcSwitchComponent],
  template: `<div style="padding:16px;display:flex;gap:24px">
    <button id="sw1" lcSwitch [(checked)]="first">Un</button>
    <button id="sw2" lcSwitch [(checked)]="second">Deux</button>
  </div>`,
})
class MotionSwitchesComponent {
  protected readonly first = signal(true);
  protected readonly second = signal(false);
}

const meta: Meta = {
  title: 'QA/Motion/Indicators forms',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [MotionSegmentedComponent, MotionSwitchesComponent] })],
  args: { fillMode: 'outline' },
};
export default meta;
type Story = StoryObj;

export const Segmented: Story = { render: (args) => ({ props: args, template: `<lc-motion-segmented [fillMode]="fillMode" />` }) };
export const Switches: Story = { render: () => ({ template: `<lc-motion-switches />` }) };
