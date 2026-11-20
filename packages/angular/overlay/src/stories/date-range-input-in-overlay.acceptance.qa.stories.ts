import { Component, inject, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor, within } from 'storybook/test';
import { userEvent as real } from 'vitest/browser';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import type { LcDateInterval } from '../../../forms/src/date-input/date-interval';
import { LC_DATE_PICKER } from '../../../forms/src/date-input/date-picker-mode';
import { LcDateRangeInputComponent } from '../../../forms/src/date-input/date-range-input.component';
import { LcDialogComponent } from '../dialog/dialog.component';
import { LcDialogService } from '../dialog/dialog.service';
import { LcDrawerComponent } from '../drawer/drawer.component';
import { LcDrawerService } from '../drawer/drawer.service';

// CA-18 / spec §6 (période) : dans un dialogue et dans un tiroir du kit, Échap ferme le panneau de période seul.

const START: LcDateInterval = { from: '2026-11-12', to: '2026-11-14' };

@Component({
  selector: 'lc-qa-range-dialog',
  imports: [LcDialogComponent, LcDateRangeInputComponent],
  template: `<lc-dialog title="Période du rapport"><lc-date-range-input ariaLabel="Période" [(value)]="range" /></lc-dialog>`,
})
class DialogContentComponent {
  protected readonly range = signal<LcDateInterval>(START);
}
@Component({
  selector: 'lc-qa-range-drawer',
  imports: [LcDrawerComponent, LcDateRangeInputComponent],
  template: `<lc-drawer title="Période du rapport"><lc-date-range-input ariaLabel="Période" [(value)]="range" /></lc-drawer>`,
})
class DrawerContentComponent {
  protected readonly range = signal<LcDateInterval>(START);
}
@Component({
  selector: 'lc-qa-range-demo',
  imports: [LcButtonComponent],
  template: `<button lcButton type="button" (click)="dialog()">Ouvrir le dialogue</button>
    <button lcButton type="button" (click)="drawer()">Ouvrir le tiroir</button>`,
})
class DemoComponent {
  private readonly dialogs = inject(LcDialogService);
  private readonly drawers = inject(LcDrawerService);
  protected dialog(): void {
    this.dialogs.open(DialogContentComponent, { size: 'medium' });
  }
  protected drawer(): void {
    this.drawers.open(DrawerContentComponent);
  }
}

const meta: Meta = {
  title: 'QA/Overlays/Date range input in an overlay',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [DemoComponent] }), applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
  render: () => ({ template: '<lc-qa-range-demo />' }),
};
export default meta;
type Story = StoryObj;
const panel = () => document.querySelector<HTMLElement>('lc-calendar-panel');

async function escapeClosesThePanelOnly(host: string) {
  const container = await waitFor(() => {
    const element = document.querySelector<HTMLElement>(host);
    expect(element).not.toBeNull();
    return element!;
  });
  const button = within(container).getByRole('button', { name: /^Changer la période/ });
  await real.click(button);
  await waitFor(() => expect(panel()).not.toBeNull());
  // Pendant le choix d'une fin aussi : Échap abandonne le début et ferme le panneau seul.
  await real.click(panel()!.querySelector('td[data-date="2026-11-20"]')!);
  await real.keyboard('{Escape}');
  await waitFor(() => expect(panel()).toBeNull());
  expect(container).toBeInTheDocument();
  await waitFor(() => expect(button).toHaveFocus());
  await real.click(button);
  await waitFor(() => expect(panel()).not.toBeNull());
  await real.keyboard('{Escape}');
  await waitFor(() => expect(panel()).toBeNull());
  expect(container).toBeInTheDocument();
  await waitFor(() => expect(button).toHaveFocus());
  await real.keyboard('{Escape}');
  await waitFor(() => expect(document.querySelector(host)).toBeNull());
}

/** Dans un dialogue : Échap ferme le panneau de période seul, le dialogue reste ouvert. */
export const EchapDansUnDialogue: Story = {
  play: async ({ canvasElement }) => {
    await real.click(within(canvasElement).getByRole('button', { name: 'Ouvrir le dialogue' }));
    await escapeClosesThePanelOnly('lc-dialog');
  },
};
/** Dans un tiroir : même essai. */
export const EchapDansUnTiroir: Story = {
  play: async ({ canvasElement }) => {
    await real.click(within(canvasElement).getByRole('button', { name: 'Ouvrir le tiroir' }));
    await escapeClosesThePanelOnly('lc-drawer');
  },
};
