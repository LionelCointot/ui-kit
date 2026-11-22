import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';
import { LcSwipePanelDirective, LcSwipePanelsComponent } from '@lionelcointot/ui-angular/navigation';

const VIEWS = [{ value: 0, label: 'Messages' }, { value: 1, label: 'Details' }, { value: 2, label: 'History' }];
const PANEL_STYLE = 'min-block-size:8rem;border:1px solid var(--lc-sys-color-border);border-radius:var(--lc-sys-radius-md);padding:var(--lc-sys-space-4);margin-inline:var(--lc-sys-space-1)';

/** A segmented control above the strip: the control picks the panel, a swipe moves the control. `activeIndex` is the single state. */
@Component({
  selector: 'lc-swipe-panels-segmented-demo',
  imports: [LcSegmentedControlComponent, LcSwipePanelsComponent, LcSwipePanelDirective],
  template: `
    <div style="inline-size:360px;max-inline-size:100%;display:grid;gap:var(--lc-sys-space-3)">
      <lc-segmented-control ariaLabel="View" fullWidth [options]="views" [value]="index()" (valueChange)="index.set($event ?? 0)" />
      <lc-swipe-panels [(activeIndex)]="index">
        <section lcSwipePanel><div style="${PANEL_STYLE}">Messages panel</div></section>
        <section lcSwipePanel><div style="${PANEL_STYLE}">Details panel</div></section>
        <section lcSwipePanel><div style="${PANEL_STYLE}">History panel</div></section>
      </lc-swipe-panels>
    </div>
  `,
})
class SegmentedDemoComponent {
  protected readonly views = VIEWS;
  protected readonly index = signal(0);
}

/**
 * Horizontal strip of full-width panels with native scroll snapping (`lc-swipe-panels`, children marked `lcSwipePanel`). A swipe changes
 * `activeIndex` (the only case where `activeIndexChange` is emitted); setting `activeIndex` scrolls the strip. Hidden panels are `inert`.
 * `layout="columns"` puts the same panels side by side without recreating them. `progress()` follows the finger (0 to n - 1).
 *
 * Import: `import { LcSwipePanelsComponent, LcSwipePanelDirective } from '@lionelcointot/ui-angular/navigation';`
 */
const meta: Meta<LcSwipePanelsComponent> = {
  title: 'Navigation/Swipe panels',
  component: LcSwipePanelsComponent,
  decorators: [moduleMetadata({ imports: [LcSwipePanelsComponent, LcSwipePanelDirective, SegmentedDemoComponent] })],
  argTypes: { layout: { control: 'inline-radio', options: ['strip', 'columns'] }, activeIndex: { control: { type: 'number', min: 0, max: 2 } }, activeIndexChange: { action: 'activeIndexChange' }, progress: { control: false } },
  args: { layout: 'strip', chain: false, activeIndex: 0 },
};
export default meta;
type Story = StoryObj<LcSwipePanelsComponent>;

/** Every input is bound: `activeIndex` scrolls the strip, `layout` switches to columns, `chain` lets the gesture pass to the scroller above. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="inline-size:360px;max-inline-size:100%">
        <lc-swipe-panels [layout]="layout" [chain]="chain" [activeIndex]="activeIndex" (activeIndexChange)="activeIndexChange($event)">
          <section lcSwipePanel aria-label="First"><div style="${PANEL_STYLE}">Panel 1</div></section>
          <section lcSwipePanel aria-label="Second"><div style="${PANEL_STYLE}">Panel 2</div></section>
          <section lcSwipePanel aria-label="Third"><div style="${PANEL_STYLE}">Panel 3</div></section>
        </lc-swipe-panels>
      </div>`,
  }),
};

/** A segmented control bound to the same index as the strip. */
export const WithSegmentedControl: Story = {
  parameters: fixedExample,
  render: () => ({ template: '<lc-swipe-panels-segmented-demo />' }),
};
