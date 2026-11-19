import { Component, inject, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor, within } from 'storybook/test';
// Vrai clavier (Playwright), pas `userEvent` de `storybook/test` ni un KeyboardEvent fabriqué.
import { userEvent as real } from 'vitest/browser';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
// `forms` n'importe pas `overlay` : cette story, non publiée, combine les deux par chemin relatif.
import { LcDateInputComponent } from '../../../forms/src/date-input/date-input.component';
import { LC_DATE_PICKER } from '../../../forms/src/date-input/date-picker-mode';
import { LcDialogComponent } from '../dialog/dialog.component';
import { LcDialogService } from '../dialog/dialog.service';
import { LcDrawerComponent } from '../drawer/drawer.component';
import { LcDrawerService } from '../drawer/drawer.service';

@Component({
  selector: 'lc-qa-date-in-dialog',
  imports: [LcDialogComponent, LcDateInputComponent],
  template: `<lc-dialog title="Date du rapport"><lc-date-input ariaLabel="Date" [(value)]="date" /></lc-dialog>`,
})
class DialogContentComponent {
  protected readonly date = signal<string | null>('2026-11-12');
}

@Component({
  selector: 'lc-qa-date-in-drawer',
  imports: [LcDrawerComponent, LcDateInputComponent],
  template: `<lc-drawer title="Date du rapport"><lc-date-input ariaLabel="Date" [(value)]="date" /></lc-drawer>`,
})
class DrawerContentComponent {
  protected readonly date = signal<string | null>('2026-11-12');
}

@Component({
  selector: 'lc-qa-overlay-demo',
  imports: [LcButtonComponent],
  template: `<button lcButton type="button" (click)="dialog()">Ouvrir le dialogue</button>
    <button lcButton type="button" (click)="drawer()">Ouvrir le tiroir</button>`,
})
class OverlayDemoComponent {
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
  title: 'Superpositions/Champ de date dans une superposition (acceptation)',
  tags: ['!autodocs'],
  decorators: [
    moduleMetadata({ imports: [OverlayDemoComponent] }),
    applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }),
  ],
  render: () => ({ template: '<lc-qa-overlay-demo />' }),
};
export default meta;
type Story = StoryObj;

const panel = () => document.querySelector<HTMLElement>('lc-calendar-panel');

async function checkEscape(host: string) {
  const container = await waitFor(() => {
    const element = document.querySelector<HTMLElement>(host);
    expect(element).not.toBeNull();
    return element!;
  });
  const button = within(container).getByRole('button', { name: /^Changer la date/ });
  await real.click(button);
  await waitFor(() => expect(panel()).not.toBeNull());
  await waitFor(() => expect(panel()!.contains(document.activeElement)).toBe(true));
  await real.keyboard('{Escape}'); // un vrai appui : keyCode 27 posé par le navigateur
  await waitFor(() => expect(panel()).toBeNull());
  expect(container).toBeInTheDocument(); // le dialogue ou le tiroir reste ouvert
  await waitFor(() => expect(button).toHaveFocus());
  await real.keyboard('{Escape}');
  await waitFor(() => expect(document.querySelector(host)).toBeNull()); // le second Échap ferme la superposition : la preuve n'est pas un faux succès
}

/** CA-22 (navigateur, vrai clavier) : dans un `lc-dialog`, Échap ferme le panneau seul. */
export const DansUnDialogue: Story = {
  play: async ({ canvasElement }) => {
    await real.click(within(canvasElement).getByRole('button', { name: 'Ouvrir le dialogue' }));
    await checkEscape('lc-dialog');
  },
};

/** CA-22 (navigateur, vrai clavier) : dans un `lc-drawer`, Échap ferme le panneau seul. */
export const DansUnTiroir: Story = {
  play: async ({ canvasElement }) => {
    await real.click(within(canvasElement).getByRole('button', { name: 'Ouvrir le tiroir' }));
    await checkEscape('lc-drawer');
  },
};
