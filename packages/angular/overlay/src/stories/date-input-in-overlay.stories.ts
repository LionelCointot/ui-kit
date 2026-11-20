import { Component, inject, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
// `forms` n'importe pas `overlay` dans le code publié : cette story, qui n'est pas publiée, combine les deux par chemin relatif.
import { LcDateInputComponent } from '../../../forms/src/date-input/date-input.component';
import { LC_DATE_PICKER } from '../../../forms/src/date-input/date-picker-mode';
import { LcDialogComponent } from '../dialog/dialog.component';
import { LcDialogService } from '../dialog/dialog.service';
import { LcDrawerComponent } from '../drawer/drawer.component';
import { LcDrawerService } from '../drawer/drawer.service';

@Component({
  selector: 'lc-date-in-dialog-content',
  imports: [LcDialogComponent, LcDateInputComponent],
  template: `
    <lc-dialog title="Date du rapport">
      <lc-date-input ariaLabel="Date" [(value)]="date" />
      <p data-testid="dialog-value">Valeur : {{ date() ?? 'aucune' }}</p>
    </lc-dialog>
  `,
})
class DateInDialogContentComponent {
  protected readonly date = signal<string | null>('2026-11-12');
}

@Component({
  selector: 'lc-date-in-drawer-content',
  imports: [LcDrawerComponent, LcDateInputComponent],
  template: `
    <lc-drawer title="Date du rapport">
      <lc-date-input ariaLabel="Date" [(value)]="date" />
    </lc-drawer>
  `,
})
class DateInDrawerContentComponent {
  protected readonly date = signal<string | null>('2026-11-12');
}

@Component({
  selector: 'lc-date-in-overlay-demo',
  imports: [LcButtonComponent],
  template: `
    <button lcButton type="button" (click)="dialog()">Ouvrir le dialogue</button>
    <button lcButton type="button" (click)="drawer()">Ouvrir le tiroir</button>
  `,
})
class DateInOverlayDemoComponent {
  private readonly dialogs = inject(LcDialogService);
  private readonly drawers = inject(LcDrawerService);
  protected dialog(): void {
    this.dialogs.open(DateInDialogContentComponent, { size: 'small' });
  }
  protected drawer(): void {
    this.drawers.open(DateInDrawerContentComponent);
  }
}

const meta: Meta = {
  title: 'Overlays/Date fields in an overlay',
  decorators: [
    moduleMetadata({ imports: [DateInOverlayDemoComponent] }),
    applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }),
  ],
  render: () => ({ template: '<lc-date-in-overlay-demo />' }),
};
export default meta;
type Story = StoryObj;

/** Échap tel que l'envoie un navigateur : `userEvent` laisse `keyCode` à 0, que CDK Dialog ne reconnaît pas (un faux « le dialogue reste ouvert »). */
const escape = () =>
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));

const panel = () => document.querySelector<HTMLElement>('lc-calendar-panel');

/** Ouvre le panneau depuis le bouton calendrier de la superposition `host`, puis vérifie : au-dessus, Tab piégé, Échap ferme le panneau seul. */
async function checkPanelInside(host: string) {
  const container = await waitFor(() => {
    const element = document.querySelector<HTMLElement>(host);
    expect(element).not.toBeNull();
    return element!;
  });
  const button = within(container).getByRole('button', { name: /^Changer la date/ });
  await userEvent.click(button);
  await waitFor(() => expect(panel()).not.toBeNull());
  const bounds = panel()!.getBoundingClientRect();
  // Au-dessus de la superposition : le point central du panneau est bien celui du panneau.
  expect(panel()!.contains(document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2))).toBe(true);
  await waitFor(() => expect(panel()!.contains(document.activeElement)).toBe(true));
  // Les deux pièges de focus ne se battent pas : Tab fait le tour du panneau sans en sortir.
  for (let press = 0; press < 12; press++) {
    await userEvent.tab();
    expect(panel()!.contains(document.activeElement)).toBe(true);
  }
  escape();
  await waitFor(() => expect(panel()).toBeNull());
  expect(container).toBeInTheDocument(); // le dialogue ou le tiroir reste ouvert
  await waitFor(() => expect(button).toHaveFocus());
  escape();
  await waitFor(() => expect(document.querySelector(host)).toBeNull()); // un second Échap ferme la superposition
}

/** Navigateur réel : dans un `lc-dialog`, Échap ferme le panneau seul, le focus revient au bouton calendrier. */
export const DansUnDialogue: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Ouvrir le dialogue' }));
    await checkPanelInside('lc-dialog');
  },
};

/** Navigateur réel : même vérification dans un `lc-drawer`. */
export const DansUnTiroir: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Ouvrir le tiroir' }));
    await checkPanelInside('lc-drawer');
  },
};
