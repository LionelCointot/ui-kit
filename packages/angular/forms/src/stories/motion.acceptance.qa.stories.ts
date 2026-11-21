import { Component, input, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent, LcRevealDirective } from '@lionelcointot/ui-angular';
import { LcMenuComponent, LcMenuItemComponent, LcMenuTriggerDirective } from '@lionelcointot/ui-angular/navigation';
import { LcComboboxComponent } from '../combobox/combobox.component';
import { LcDateInputComponent } from '../date-input/date-input.component';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';
import { LcDateRangeInputComponent } from '../date-input/date-range-input.component';
import type { LcDateInterval } from '../date-input/date-interval';

// Fixtures de la spec 2026-11-mouvement (CA-6 à CA-9, CA-13) : pilotées par `node tools/qa/storybook-browser.mjs motion`, sans `play`.

const CITIES = ['Amsterdam', 'Berlin', 'Bruxelles', 'Paris', 'Rome'];

@Component({
  selector: 'lc-motion-panel',
  imports: [LcMenuComponent, LcMenuItemComponent, LcMenuTriggerDirective, LcComboboxComponent, LcDateInputComponent, LcDateRangeInputComponent],
  template: `<div [style]="place() === 'bottom' ? 'position:fixed;inset-inline:8px;inset-block-end:8px' : place() === 'middle' ? 'position:fixed;inset-inline:8px;inset-block-start:420px' : 'padding:8px'">
    @switch (control()) {
      @case ('menu') {
        <button id="trigger" type="button" [lcMenuTriggerFor]="menu">Actions</button>
        <lc-menu #menu ariaLabel="Actions"><button lcMenuItem>Renommer</button><button lcMenuItem>Dupliquer</button></lc-menu>
      }
      @case ('combobox') {
        <lc-combobox ariaLabel="Ville" [options]="cities" [displayWith]="name" [trackBy]="name" [(value)]="city" />
      }
      @case ('date') {
        <lc-date-input ariaLabel="Date" [(value)]="date" />
      }
      @case ('range') {
        <lc-date-range-input ariaLabel="Période" [(value)]="range" />
      }
    }
  </div>`,
})
class MotionPanelComponent {
  readonly control = input<'menu' | 'combobox' | 'date' | 'range'>('menu');
  readonly place = input<'top' | 'middle' | 'bottom'>('top');
  protected readonly cities = CITIES;
  protected readonly name = (city: string) => city;
  protected readonly city = signal<string | null>(null);
  protected readonly date = signal<string | null>('2026-11-12');
  protected readonly range = signal<LcDateInterval>({ from: '2026-11-12', to: '2026-11-20' });
}

@Component({
  selector: 'lc-motion-buttons',
  imports: [LcButtonComponent, LcIconComponent],
  template: `<div style="display:flex;gap:16px;padding:16px;flex-wrap:wrap">
    <button id="solid" lcButton>Pleine</button>
    <button id="outline" lcButton fillMode="outline">Contour</button>
    <button id="flat" lcButton fillMode="flat">Texte</button>
    <button id="icon" lcButton iconOnly aria-label="Ajouter"><lc-icon name="plus" /></button>
    <button id="disabled" lcButton disabled>Désactivé</button>
  </div>`,
})
class MotionButtonsComponent {}

@Component({
  selector: 'lc-motion-reveal',
  imports: [LcRevealDirective],
  template: `<button id="toggle" type="button" (click)="shown.set(!shown())">Basculer</button>
    @if (shown()) {
      <ul>
        @for (index of indexes; track index) {
          <li lcReveal [lcRevealIndex]="index" [attr.data-index]="index">Ligne {{ index }}</li>
        }
      </ul>
    }`,
})
class MotionRevealComponent {
  protected readonly shown = signal(false);
  // 0, 3, 7, 12 : spec CA-9 ; -1 et 1.5 : index invalides (retombent à 0).
  protected readonly indexes = [0, 3, 7, 12, -1, 1.5];
}

const meta: Meta = {
  title: 'QA/Motion/Acceptance',
  tags: ['!autodocs'],
  decorators: [
    moduleMetadata({ imports: [MotionPanelComponent, MotionButtonsComponent, MotionRevealComponent] }),
    applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }),
  ],
  args: { control: 'menu', place: 'top' },
};
export default meta;
type Story = StoryObj;

export const Panel: Story = { render: (args) => ({ props: args, template: `<lc-motion-panel [control]="control" [place]="place" />` }) };
export const Buttons: Story = { render: () => ({ template: `<lc-motion-buttons />` }) };
export const Reveal: Story = { render: () => ({ template: `<lc-motion-reveal />` }) };
