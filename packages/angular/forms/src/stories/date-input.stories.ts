import { Component, booleanAttribute, input, linkedSignal, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
// Le projet Vitest « storybook » ne charge pas les feuilles globales d'angular.json : on les charge ici pour mesurer le vrai rendu.
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { StoryMotionNoticeComponent, commonArgTypes, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcRevealDirective, LcStaggerDirective } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent, LcDateInputComponent, LC_DATE_PICKER } from '@lionelcointot/ui-angular/forms';
import { LcCalendarPanelComponent } from '../date-input/calendar-panel.component';

@Component({
  selector: 'lc-date-input-demo',
  imports: [LcFormFieldComponent, LcDateInputComponent],
  template: `
    <div style="display:grid;gap:var(--lc-sys-space-6);max-width:20rem">
      <lc-form-field label="Date de début"><lc-date-input [(value)]="start" /></lc-form-field>
      <lc-form-field label="Date de fin (obligatoire)" required><lc-date-input [(value)]="end" /></lc-form-field>
      <lc-form-field label="Lecture seule"><lc-date-input [value]="'2026-11-12'" readonly /></lc-form-field>
      <p>Valeur : {{ start() ?? 'aucune' }}</p>
      <button type="button" (mousedown)="$event.preventDefault()" (click)="end.set('2026-03-05')">Poser le 5 mars 2026</button>
    </div>
  `,
})
class DateInputDemoComponent {
  readonly start = signal<string | null>('2026-11-12');
  readonly end = signal<string | null>(null);
}

/**
 * Date field (`lc-date-input`) holding an ISO date string (`yyyy-mm-dd`). On a fine pointer it shows day/month/year segments and a calendar panel;
 * otherwise it falls back to the system date picker (injection token `LC_DATE_PICKER` forces a mode). Bounds with `min` and `max`.
 *
 * Import: `import { LcDateInputComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcDateInputComponent> = {
  title: 'Forms/Date input',
  component: LcDateInputComponent,
  decorators: [moduleMetadata({ imports: [DateInputDemoComponent, LcDateInputComponent, LcFormFieldComponent, LcButtonComponent, LcCalendarPanelComponent, LcRevealDirective, LcStaggerDirective, StoryMotionNoticeComponent] })],
  args: {
    min: undefined, max: undefined, disabled: false, readonly: false, required: false, invalid: false, touched: false,
    size: 'medium', fillMode: 'solid', rounded: 'medium', ariaLabel: 'Date',
  },
  argTypes: { size: commonArgTypes.size, fillMode: commonArgTypes.fillMode, rounded: commonArgTypes.rounded, min: { control: 'text' }, max: { control: 'text' } },
};
export default meta;
type Story = StoryObj<LcDateInputComponent>;

/** Every input is bound: change them in the Controls panel (`min` and `max` take an ISO date such as 2026-11-30). */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['min', 'max', 'invalid', 'touched'] } },
  render: (args) => ({
    props: { ...args, date: signal<string | null>('2026-11-12') },
    template: `
      <div style="max-width:20rem;min-height:28rem">
        <lc-date-input [(value)]="date" [min]="min || undefined" [max]="max || undefined" [disabled]="disabled" [readonly]="readonly"
          [required]="required" [invalid]="invalid" [touched]="touched" [size]="size" [fillMode]="fillMode" [rounded]="rounded"
          [ariaLabel]="ariaLabel" />
        <p style="margin-top:1rem">Valeur : {{ date() ?? 'aucune' }}</p>
      </div>`,
  }),
};

/** Forced calendar mode: day/month/year segments (digits, up and down arrows, paste). An impossible day cannot be typed. */
export const CalendarMode: Story = {
  parameters: fixedExample,
  render: () => ({ template: '<lc-date-input-demo />' }),
  decorators: [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
};

/** Real browser: the active segment is selected after each keystroke, and after a value set by code while focused. */
export const ActiveSegmentSelected: Story = {
  parameters: fixedExample,
  render: () => ({ template: '<lc-date-input-demo />' }),
  decorators: [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: /Date de fin/ }) as HTMLInputElement;
    const selection = () => input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
    await userEvent.click(input);
    expect(selection()).toBe('jj');
    const expected = ['01', 'mm', '01', 'aaaa', '2', '20', '202', '2026'];
    for (const [index, digit] of [...'12112026'].entries()) {
      await userEvent.keyboard(digit);
      expect(selection(), `après « ${digit} »`).toBe(expected[index]);
    }
    expect(input.value).toBe('12/11/2026');
    await userEvent.click(canvas.getByRole('button', { name: 'Poser le 5 mars 2026' }));
    expect(input).toHaveFocus();
    expect(input.value).toBe('05/03/2026');
    expect(selection()).toBe('2026'); // la zone active (l'année) reste sélectionnée
  },
};

const CALENDAR = applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] });

/** Champ avec son bouton calendrier et le panneau : la valeur ISO est affichée dessous pour la lire dans les stories. */
@Component({
  selector: 'lc-date-input-picker-demo',
  imports: [LcFormFieldComponent, LcDateInputComponent],
  template: `
    <div style="max-width:20rem;min-height:28rem">
      @if (labelled()) {
        <lc-form-field label="Date de début" [required]="required()">
          <lc-date-input [(value)]="date" [min]="min()" [max]="max()" />
        </lc-form-field>
      } @else {
        <lc-date-input ariaLabel="Date" [(value)]="date" [min]="min()" [max]="max()" [required]="required()" />
      }
      <p data-testid="value">Valeur : {{ date() ?? 'aucune' }}</p>
    </div>
  `,
})
class DateInputPickerDemoComponent {
  readonly initial = input<string | null>(null);
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);
  readonly required = input(false, { transform: booleanAttribute });
  readonly labelled = input(false, { transform: booleanAttribute });
  protected readonly date = linkedSignal(() => this.initial());
}

const picker = (attributes = '') => ({ template: `<lc-date-input-picker-demo ${attributes} />` });
const body = () => within(document.body);
const openedPanel = () => body().findByRole('dialog');
const closed = () => waitFor(() => expect(document.querySelector('lc-calendar-panel')).toBeNull());

/** Real browser: the button opens the panel; a chosen day updates value and text, closes it and returns focus to the button. */
export const CalendarEmpty: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Choisir une date' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    const panel = await openedPanel();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(panel.getBoundingClientRect().width).toBe(304); // largeur propre au panneau, pas celle du champ
    await userEvent.click(panel.querySelector('td[data-date$="-15"]')!);
    await closed();
    const input = canvas.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toMatch(/^15\/\d\d\/\d{4}$/);
    expect(canvas.getByTestId('value')).toHaveTextContent(/Valeur : \d{4}-\d\d-15/);
    await waitFor(() => expect(canvas.getByRole('button', { name: /^Changer la date, 15 / })).toHaveFocus());
  },
};

/** Real browser: with a value the button is named "Changer la date, …"; Escape closes without change; Alt + arrow down reopens. */
export const CalendarWithValue: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('initial="2026-11-12"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Changer la date, 12 novembre 2026' });
    await userEvent.click(button);
    const panel = await openedPanel();
    await waitFor(() => expect(within(panel).getByRole('gridcell', { name: 'jeudi 12 novembre 2026' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(canvas.getByTestId('value')).toHaveTextContent('Valeur : 2026-11-12');
    await waitFor(() => expect(button).toHaveFocus());
    await userEvent.click(canvas.getByRole('textbox'));
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await openedPanel();
  },
};

/** Real browser: days outside the bounds (10 to 25 November 2026) are disabled and cannot be picked. */
export const CalendarWithBounds: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('initial="2026-11-12" min="2026-11-10" max="2026-11-25"'),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Changer la date/ }));
    const panel = await openedPanel();
    const outside = panel.querySelector('td[data-date="2026-11-28"]')!;
    expect(outside).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(outside);
    expect(document.querySelector('lc-calendar-panel')).not.toBeNull();
    await userEvent.click(panel.querySelector('td[data-date="2026-11-24"]')!);
    await closed();
    expect(within(canvasElement).getByTestId('value')).toHaveTextContent('Valeur : 2026-11-24');
  },
};

/** Real browser: a required field has no "Effacer la date" action in the panel. */
export const CalendarRequired: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('required'),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Choisir une date' }));
    const panel = await openedPanel();
    expect(within(panel).getByRole('button', { name: "Aujourd'hui" })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Effacer la date' })).toBeNull();
  },
};

/** Real browser: inside `lc-form-field`, Alt + arrow down opens the panel and "Effacer la date" clears the value. */
export const CalendarInAField: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('labelled initial="2026-11-12"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('textbox', { name: /Date de début/ }));
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    const panel = await openedPanel();
    await userEvent.click(within(panel).getByRole('button', { name: 'Effacer la date' }));
    await closed();
    expect(canvas.getByTestId('value')).toHaveTextContent('Valeur : aucune');
    expect((canvas.getByRole('textbox') as HTMLInputElement).value).toBe('jj/mm/aaaa');
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Choisir une date' })).toHaveFocus());
  },
};

/** Real browser: the selected day is also today and holds keyboard focus; the today dot stays inside the disc. */
export const CalendarTodaySelectedFocus: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return picker(`initial="${today}"`);
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Changer la date/ }));
    const panel = await openedPanel();
    const day = await waitFor(() => {
      const cell = panel.querySelector<HTMLElement>('td[aria-selected="true"][aria-current="date"]');
      expect(cell).toHaveFocus();
      return cell!;
    });
    const dot = getComputedStyle(day, '::after');
    const disc = getComputedStyle(day, '::before');
    // Le disque est inscrit avec une marge ; le point est posé plus haut que son bord bas, donc à l'intérieur.
    expect(parseFloat(dot.bottom)).toBeGreaterThan(parseFloat(disc.bottom) + 1);
    expect(parseFloat(dot.bottom) + parseFloat(dot.height)).toBeLessThan(day.getBoundingClientRect().height / 2);
  },
};

/** Real browser, 400 px high window: the panel stays in the window, its body scrolls and "Aujourd'hui" is clickable. */
export const CalendarShortWindow: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [DateInputPickerDemoComponent] }), CALENDAR],
  render: () => picker('initial="2026-11-12"'),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 400);
    try {
      await waitFor(() => expect(window.innerHeight).toBe(400));
      await userEvent.click(within(canvasElement).getByRole('button', { name: /^Changer la date/ }));
      const panel = await openedPanel();
      await waitFor(() => expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(400));
      expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
      const today = within(panel).getByRole('button', { name: "Aujourd'hui" });
      expect(today.getBoundingClientRect().bottom).toBeLessThanOrEqual(400);
      await userEvent.click(today);
      await waitFor(() => expect(document.querySelector('lc-calendar-panel')).toBeNull());
      expect(within(canvasElement).getByTestId('value')).not.toHaveTextContent('2026-11-12');
    } finally {
      await page.viewport(1280, 720);
    }
  },
};

/** Calendar-mode field states: empty, with value, invalid, disabled, read-only (the last two without a button). */
export const CalendarStates: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [LcDateInputComponent] }), CALENDAR],
  render: () => ({
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-4);max-width:20rem">
        <lc-date-input ariaLabel="Vide" />
        <lc-date-input ariaLabel="Avec valeur" value="2026-11-12" />
        <lc-date-input ariaLabel="Invalide" invalid touched />
        <lc-date-input ariaLabel="Désactivé" value="2026-11-12" disabled />
        <lc-date-input ariaLabel="Lecture seule" value="2026-11-12" readonly />
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole('button')).toHaveLength(3); // ni le champ désactivé ni celui en lecture seule n'ont de bouton
    const field = canvas.getByRole('textbox', { name: 'Avec valeur' });
    const button = canvas.getByRole('button', { name: /^Changer la date/ });
    expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(field.getBoundingClientRect().height - 2); // cible = hauteur du champ
    expect(canvas.getByRole('textbox', { name: 'Invalide' })).toHaveAttribute('aria-invalid', 'true');
  },
};

/** Forced native mode: the browser's `input[type=date]`. */
export const NativeMode: Story = {
  parameters: fixedExample,
  render: () => ({ template: '<lc-date-input-demo />' }),
  decorators: [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'native' }] })],
};

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcDateInputComponent, LcFormFieldComponent } from '@lionelcointot/ui-angular/forms';

@Component({
  selector: 'app-example',
  imports: [LcDateInputComponent, LcFormFieldComponent],
  template: \`
    <lc-form-field label="Date de début">
      <lc-date-input [(value)]="date" />
    </lc-form-field>\`,
})
export class ExampleComponent {
  readonly date = signal<string | null>('2026-11-12');
}`;

const AGENDA = ['10 h · Session A — Maren', '14 h · Revue client', '17 h 30 · Point équipe'];

/**
 * Three demos. The calendar of the field grows from it with a small overshoot while it fades in (forced calendar mode), and fades out when it closes.
 * Below, a selected day does not move (no ring animation), while the list of the day, demo content, rises again in cascade. Last, the days slide
 * in the direction of the month change, row after row. Each "Rejouer" starts its demo again.
 */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  decorators: [applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
  render: () => ({
    props: {
      date: signal<string | null>('2026-11-12'),
      agenda: AGENDA,
      field: replayable({ play: (_later, root) => root.querySelector<HTMLElement>('button[aria-expanded]')?.click() }),
      list: replayable(),
      // L'ancienne liste est remplacée d'un coup (comme dans le catalogue) : sans cela chaque ligne rejouerait sa sortie.
      quiet: (root: HTMLElement) => root.querySelectorAll('li').forEach((item) => (item.style.animation = 'none')),
      // Novembre 2026 couvre six semaines ; le mois suivant (cinq) puis le retour jouent les deux sens, 1,4 s d'écart.
      months: replayable({
        play: (later, root) => {
          root.querySelector<HTMLElement>('.lc-calendar__nav--next')?.click();
          later(1400, () => root.querySelector<HTMLElement>('.lc-calendar__nav:not(.lc-calendar__nav--next)')?.click());
        },
      }),
    },
    template: `
      <lc-story-motion-notice />
      <div #fieldRoot style="max-width:20rem;min-height:28rem">
        <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="field.replay(fieldRoot)">Rejouer</button>
        @for (key of field.keys(); track key) {
          <lc-form-field label="Date de début"><lc-date-input [(value)]="date" /></lc-form-field>
        }
      </div>
      <section #listRoot data-demo="d41" style="margin-block-start:var(--lc-sys-space-8)">
        <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="quiet(listRoot); list.replay(listRoot)">Rejouer</button>
        <div style="display:flex;flex-wrap:wrap;gap:var(--lc-sys-space-6);align-items:flex-start">
          <lc-calendar-panel today="2026-11-19" [selection]="{ from: '2026-11-12', to: null }" />
          @for (key of list.keys(); track key) {
            <ul lcStagger style="margin:0;padding:0;list-style:none;display:grid;gap:var(--lc-sys-space-2)">
              @for (item of agenda; track item) {
                <li lcReveal>{{ item }}</li>
              }
            </ul>
          }
        </div>
      </section>
      <section #monthRoot data-demo="d61" style="margin-block-start:var(--lc-sys-space-8)">
        <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="months.replay(monthRoot)">Rejouer</button>
        @for (key of months.keys(); track key) {
          <lc-calendar-panel today="2026-11-19" [selection]="{ from: '2026-11-12', to: null }" />
        }
      </section>`,
  }),
};
