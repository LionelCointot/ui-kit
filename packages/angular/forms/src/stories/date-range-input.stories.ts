import { Component, booleanAttribute, input, linkedSignal, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
// Le projet Vitest « storybook » ne charge pas les feuilles globales d'angular.json : on les charge ici pour mesurer le vrai rendu.
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { commonArgTypes, fixedExample } from '@lc/storybook';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import type { LcDateInterval } from '../date-input/date-interval';
import { LcDateRangeInputComponent } from '../date-input/date-range-input.component';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';

/** Champ de période posé dans la page ; la valeur est affichée dessous pour la lire dans les stories. */
@Component({
  selector: 'lc-date-range-input-demo',
  imports: [LcFormFieldComponent, LcDateRangeInputComponent],
  template: `
    <div style="max-width:32rem;min-height:36rem">
      @if (labelled()) {
        <lc-form-field label="Séjour" [required]="required()">
          <lc-date-range-input [(value)]="range" [min]="min()" [max]="max()" [required]="required()" />
        </lc-form-field>
      } @else {
        <lc-date-range-input [(value)]="range" [min]="min()" [max]="max()" [required]="required()" [presets]="noPresets() ? [] : undefined" [disabled]="disabled()" />
      }
      <p data-testid="value">Valeur : {{ range().from ?? '…' }} / {{ range().to ?? '…' }}</p>
    </div>
  `,
})
class DateRangeInputDemoComponent {
  readonly initial = input<LcDateInterval>({ from: null, to: null });
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);
  readonly required = input(false, { transform: booleanAttribute });
  readonly labelled = input(false, { transform: booleanAttribute });
  readonly noPresets = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  protected readonly range = linkedSignal(() => this.initial());
}

@Component({
  selector: 'lc-date-range-input-form-demo',
  imports: [FormField, LcFormFieldComponent, LcDateRangeInputComponent],
  template: `
    <div style="max-width:32rem;min-height:36rem">
      <lc-form-field label="Séjour"><lc-date-range-input [formField]="f.stay" /></lc-form-field>
      <p data-testid="value">Valeur : {{ model().stay.from ?? '…' }} / {{ model().stay.to ?? '…' }}</p>
    </div>
  `,
})
class DateRangeInputFormDemoComponent {
  protected readonly model = linkedSignal<{ stay: LcDateInterval }>(() => ({ stay: { from: null, to: null } }));
  protected readonly f = form(this.model);
}

/**
 * Date range field (`lc-date-range-input`) holding `{ from, to }` as ISO dates, with a two-month calendar panel and presets
 * ("Ce mois-ci"…). Either bound may stay empty (open-ended range). Falls back to two system date fields on touch (`LC_DATE_PICKER`).
 *
 * Import: `import { LcDateRangeInputComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcDateRangeInputComponent> = {
  title: 'Forms/Date range input',
  component: LcDateRangeInputComponent,
  decorators: [moduleMetadata({ imports: [DateRangeInputDemoComponent, DateRangeInputFormDemoComponent, LcDateRangeInputComponent, LcFormFieldComponent] })],
  args: {
    min: undefined, max: undefined, disabled: false, readonly: false, required: false, invalid: false, touched: false,
    size: 'medium', fillMode: 'solid', rounded: 'medium', ariaLabel: 'Période',
  },
  argTypes: { size: commonArgTypes.size, fillMode: commonArgTypes.fillMode, rounded: commonArgTypes.rounded, min: { control: 'text' }, max: { control: 'text' }, presets: { control: false }, errors: { control: false } },
};
export default meta;
type Story = StoryObj<LcDateRangeInputComponent>;

/** Every input is bound: change them in the Controls panel (`min` and `max` take an ISO date such as 2026-11-30). */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['min', 'max', 'invalid', 'touched'] } },
  render: (args) => ({
    props: { ...args, range: signal<LcDateInterval>({ from: '2026-11-03', to: '2026-11-12' }) },
    template: `
      <div style="max-width:32rem;min-height:36rem">
        <lc-date-range-input [(value)]="range" [min]="min || undefined" [max]="max || undefined" [disabled]="disabled"
          [readonly]="readonly" [required]="required" [invalid]="invalid" [touched]="touched" [size]="size" [fillMode]="fillMode"
          [rounded]="rounded" [ariaLabel]="ariaLabel" />
        <p style="margin-top:1rem">Valeur : {{ range().from ?? '…' }} / {{ range().to ?? '…' }}</p>
      </div>`,
  }),
};

const CALENDAR = applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] });
const NATIVE = applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'native' }] });
const demo = (attributes = '') => ({ template: `<lc-date-range-input-demo ${attributes} />` });
const body = () => within(document.body);
const openedPanel = () => body().findByRole('dialog');
const closed = () => waitFor(() => expect(document.querySelector('lc-calendar-panel')).toBeNull());
const value = (canvas: ReturnType<typeof within>) => canvas.getByTestId('value');

/** Closed, empty field (no interaction: used for captures). */
export const ClosedEmpty: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo(),
};

/** Real browser at 1280 px: two months and a preset column; picking a start then an end updates value and fields, closes and returns focus to the button. */
export const PickRange: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo(),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 900);
    await waitFor(() => expect(window.innerWidth).toBe(1280));
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Choisir une période' });
    expect(canvas.getByRole('group', { name: 'Période' })).toBeTruthy();
    await userEvent.click(button);
    const panel = await openedPanel();
    await waitFor(() => expect(panel.querySelectorAll('.lc-calendar__month')).toHaveLength(2));
    expect(panel.querySelector('.lc-calendar__layout--column')).not.toBeNull();
    expect(panel.getBoundingClientRect().width).toBeGreaterThan(780);
    await userEvent.click(panel.querySelector('td[data-date$="-10"]')!);
    expect(within(panel).getByRole('status')).toHaveTextContent(/^Début : 10 /);
    await userEvent.click(panel.querySelector('td[data-date$="-18"]')!);
    await closed();
    const [from, to] = canvas.getAllByRole('textbox') as HTMLInputElement[];
    expect(from.value).toMatch(/^10\/\d\d\/\d{4}$/);
    expect(to.value).toMatch(/^18\/\d\d\/\d{4}$/);
    expect(value(canvas)).toHaveTextContent(/Valeur : \d{4}-\d\d-10 \/ \d{4}-\d\d-18/);
    await waitFor(() => expect(canvas.getByRole('button', { name: /^Changer la période, du 10 au 18 / })).toHaveFocus());
  },
};

/** Real browser: at 600 px a single month and presets laid out as a grid. */
export const SingleMonthAt600Pixels: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo(),
  play: async ({ canvasElement }) => {
    await page.viewport(600, 900);
    try {
      await waitFor(() => expect(window.innerWidth).toBe(600));
      await userEvent.click(within(canvasElement).getByRole('button', { name: 'Choisir une période' }));
      const panel = await openedPanel();
      await waitFor(() => expect(panel.querySelectorAll('.lc-calendar__month')).toHaveLength(1));
      expect(panel.querySelector('.lc-calendar__layout--column')).toBeNull();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    } finally {
      await page.viewport(1280, 720);
    }
  },
};

/** Real browser: a preset sets both bounds, closes and returns focus to the button. */
export const Preset: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo(),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 900);
    await waitFor(() => expect(window.innerWidth).toBe(1280));
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Choisir une période' }));
    const panel = await openedPanel();
    await userEvent.click(within(panel).getByRole('button', { name: /^Ce mois-ci/ }));
    await closed();
    expect(value(canvas)).toHaveTextContent(/Valeur : \d{4}-\d\d-01 \/ \d{4}-\d\d-(28|29|30|31)/);
    await waitFor(() => expect(canvas.getByRole('button', { name: /^Changer la période, du 1 au / })).toHaveFocus());
  },
};

/** Real browser: one bound only, with an explanatory line; "Sans date de fin" validates the start alone. */
export const OpenEnded: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo(),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 900);
    await waitFor(() => expect(window.innerWidth).toBe(1280));
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Choisir une période' }));
    const panel = await openedPanel();
    await userEvent.click(panel.querySelector('td[data-date$="-05"]')!);
    await userEvent.click(within(panel).getByRole('button', { name: 'Sans date de fin' }));
    await closed();
    expect(value(canvas)).toHaveTextContent(/Valeur : \d{4}-\d\d-05 \/ …/);
    expect(canvas.getByText(/^Sans date de fin : tout depuis le 5 /)).toBeTruthy();
    expect(canvas.getByRole('button', { name: /^Changer la période, à partir du 5 / })).toBeTruthy();
  },
};

/** A range already chosen: both fields filled and the button named after the range. */
export const RangeSelected: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo('[initial]="{ from: \'2026-11-03\', to: \'2026-11-12\' }"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [from, to] = canvas.getAllByRole('textbox') as HTMLInputElement[];
    expect([from.value, to.value]).toEqual(['03/11/2026', '12/11/2026']);
    expect(canvas.getByRole('button', { name: 'Changer la période, du 3 au 12 novembre 2026' })).toBeTruthy();
  },
};

/** Only a start date: the "Sans date de fin" explanation line. */
export const SingleBound: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo('[initial]="{ from: \'2026-11-01\', to: null }"'),
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByText('Sans date de fin : tout depuis le 1 novembre 2026.')).toBeTruthy();
  },
};

/** Real browser: an end typed before the start is null, the end frame is invalid and the message sits under the group. */
export const EndBeforeStart: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo('[initial]="{ from: \'2026-11-10\', to: null }"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const to = canvas.getAllByRole('textbox')[1] as HTMLInputElement;
    await userEvent.click(to);
    await userEvent.keyboard('05112026');
    expect(canvas.getByText('La date de fin est avant la date de début.')).toBeTruthy();
    expect(value(canvas)).toHaveTextContent('Valeur : 2026-11-10 / …');
    expect(to.closest('lc-date-input')).toHaveClass('lc-field--invalid');
  },
};

/** Bounds (15 to 30 November 2026): out-of-range days and presets are disabled. */
export const WithBounds: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo('min="2026-11-15" max="2026-11-30" [initial]="{ from: \'2026-11-17\', to: \'2026-11-19\' }"'),
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 900);
    await waitFor(() => expect(window.innerWidth).toBe(1280));
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Changer la période/ }));
    const panel = await openedPanel();
    expect(within(panel).getByRole('button', { name: /^Le mois dernier/ })).toBeDisabled();
    expect(panel.querySelector('td[data-date="2026-11-10"]')).toHaveAttribute('aria-disabled', 'true');
  },
};

/** A required field has no "Effacer la période" action in the panel. */
export const Required: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo('required labelled'),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Choisir une période' }));
    const panel = await openedPanel();
    expect(within(panel).queryByRole('button', { name: 'Effacer la période' })).toBeNull();
  },
};

/** Without presets: the panel only shows the calendar. */
export const NoPresets: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo('noPresets'),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Choisir une période' }));
    const panel = await openedPanel();
    expect(panel.querySelector('.lc-calendar__presets')).toBeNull();
  },
};

/** Disabled field: no button, disabled inputs. */
export const Disabled: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => demo('disabled [initial]="{ from: \'2026-11-03\', to: \'2026-11-12\' }"'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByRole('button')).toBeNull();
    for (const input of canvas.getAllByRole('textbox')) expect(input).toBeDisabled();
  },
};

/** Inside `lc-form-field` with `[formField]`: an end before the start is a form error the field displays. */
export const InAField: Story = {
  parameters: fixedExample,
  decorators: [CALENDAR],
  render: () => ({ template: '<lc-date-range-input-form-demo />' }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [from, to] = canvas.getAllByRole('textbox') as HTMLInputElement[];
    await userEvent.click(from);
    await userEvent.keyboard('10112026');
    await userEvent.click(to);
    await userEvent.keyboard('05112026');
    await userEvent.tab();
    await userEvent.tab();
    await waitFor(() => expect(canvas.getByText('La date de fin est avant la date de début.')).toBeTruthy());
    expect(value(canvas)).toHaveTextContent('Valeur : 2026-11-10 / …');
  },
};

/** Native (touch) mode: two bounded date fields, presets in a row, no button. */
export const NativeMode: Story = {
  parameters: fixedExample,
  decorators: [NATIVE],
  render: () => demo('[initial]="{ from: \'2026-11-03\', to: \'2026-11-12\' }"'),
  play: async ({ canvasElement }) => {
    const [from, to] = [...canvasElement.querySelectorAll<HTMLInputElement>('input[type=date]')];
    expect(from).toHaveAttribute('max', '2026-11-12');
    expect(to).toHaveAttribute('min', '2026-11-03');
    expect(within(canvasElement).queryByRole('button', { name: /période/i })).toBeNull();
    const row = within(canvasElement).getByRole('group', { name: 'Raccourcis' });
    await userEvent.click(within(row).getByRole('button', { name: /^Ce mois-ci/ }));
    await waitFor(() => expect(value(within(canvasElement))).toHaveTextContent(/-01 \/ \d{4}-\d\d-(28|29|30|31)/));
  },
};
