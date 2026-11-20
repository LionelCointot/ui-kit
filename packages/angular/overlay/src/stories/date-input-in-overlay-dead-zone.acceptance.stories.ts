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
import { LcDateInputComponent } from '../../../forms/src/date-input/date-input.component';
import { LC_DATE_PICKER } from '../../../forms/src/date-input/date-picker-mode';
import { LcDialogComponent } from '../dialog/dialog.component';
import { LcDialogService } from '../dialog/dialog.service';
import { LcDrawerComponent } from '../drawer/drawer.component';
import { LcDrawerService } from '../drawer/drawer.service';

@Component({
  selector: 'lc-qa-dz-dialog',
  imports: [LcDialogComponent, LcDateInputComponent],
  template: `<lc-dialog title="Date du rapport"><lc-date-input ariaLabel="Date" [(value)]="date" /></lc-dialog>`,
})
class DialogContentComponent {
  protected readonly date = signal<string | null>('2026-11-12');
}
@Component({
  selector: 'lc-qa-dz-drawer',
  imports: [LcDrawerComponent, LcDateInputComponent],
  template: `<lc-drawer title="Date du rapport"><lc-date-input ariaLabel="Date" [(value)]="date" /></lc-drawer>`,
})
class DrawerContentComponent {
  protected readonly date = signal<string | null>('2026-11-12');
}
@Component({
  selector: 'lc-qa-dz-demo',
  imports: [LcButtonComponent],
  template: `<button lcButton type="button" (click)="dialog()">Ouvrir le dialogue</button>
    <button lcButton type="button" (click)="drawer()">Ouvrir le tiroir</button>`,
})
class DemoComponent {
  private readonly dialogs = inject(LcDialogService);
  private readonly drawers = inject(LcDrawerService);
  protected dialog(): void {
    this.dialogs.open(DialogContentComponent, { size: 'small' });
  }
  protected drawer(): void {
    this.drawers.open(DrawerContentComponent);
  }
}

const meta: Meta = {
  title: 'Superpositions/Champ de date, zone morte (acceptation)',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [DemoComponent] }), applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
  render: () => ({ template: '<lc-qa-dz-demo />' }),
};
export default meta;
type Story = StoryObj;
const panel = () => document.querySelector<HTMLElement>('lc-calendar-panel');

async function deadZoneInside(host: string) {
  const container = await waitFor(() => {
    const element = document.querySelector<HTMLElement>(host);
    expect(element).not.toBeNull();
    return element!;
  });
  const button = within(container).getByRole('button', { name: /^Changer la date/ });
  await real.click(button);
  await waitFor(() => expect(panel()).not.toBeNull());
  const d = panel()!;
  const box = d.getBoundingClientRect();
  const head = d.querySelector('thead th:nth-child(3)')!.getBoundingClientRect();
  const spots: Record<string, [number, number]> = {
    marge: [3, 3],
    entetes: [head.left + head.width / 2 - box.left, head.top + head.height / 2 - box.top],
    pied: [box.width / 2, box.height - 14],
  };
  let first = true;
  for (const [name, [x, y]] of Object.entries(spots)) {
    if (!first) {
      await real.click(button);
      await waitFor(() => expect(panel()).not.toBeNull());
    }
    first = false;
    await real.click(panel()!, { position: { x, y } });
    expect(panel()!.contains(document.activeElement), `focus dans le panneau après ${name}`).toBe(true);
    await real.keyboard('{Escape}');
    await waitFor(() => expect(panel(), `Échap après ${name}`).toBeNull());
    expect(container, `le conteneur reste ouvert après ${name}`).toBeInTheDocument();
    await waitFor(() => expect(button).toHaveFocus());
  }
  await real.keyboard('{Escape}');
  await waitFor(() => expect(document.querySelector(host)).toBeNull());
}

/** Point 2 : clic dans une zone morte du panneau, dans un dialogue : Échap ferme le panneau seul. */
export const ZoneMorteDansUnDialogue: Story = {
  play: async ({ canvasElement }) => {
    await real.click(within(canvasElement).getByRole('button', { name: 'Ouvrir le dialogue' }));
    await deadZoneInside('lc-dialog');
  },
};
/** Point 2 : même essai dans un tiroir. */
export const ZoneMorteDansUnTiroir: Story = {
  play: async ({ canvasElement }) => {
    await real.click(within(canvasElement).getByRole('button', { name: 'Ouvrir le tiroir' }));
    await deadZoneInside('lc-drawer');
  },
};
