import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, max, min } from '@angular/forms/signals';
import { BehaviorSubject } from 'rxjs';
import { LC_LABELS_FR } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import type { LcDateInterval } from './date-interval';
import { LC_DATE_PICKER } from './date-picker-mode';
import { describePresets, kitDatePresets } from './date-presets';
import { LcDateRangeInputComponent } from './date-range-input.component';

const MESSAGE = 'La date de fin est avant la date de début.';

@Component({ imports: [LcDateRangeInputComponent], template: `<lc-date-range-input [(value)]="value" />` })
class PlainHost {
  readonly value = signal<LcDateInterval>({ from: null, to: null });
}

@Component({ imports: [LcDateRangeInputComponent], template: `<lc-date-range-input [value]="$any(value())" />` })
class UndefinedHost {
  readonly value = signal<LcDateInterval | undefined>(undefined);
}

@Component({ imports: [LcDateRangeInputComponent, LcFormFieldComponent], template: `<lc-form-field label="Période"><lc-date-range-input [(value)]="value" /></lc-form-field>` })
class InFieldHost {
  readonly value = signal<LcDateInterval>({ from: null, to: null });
}

@Component({
  selector: 'lc-test-form-bounds-host',
  imports: [FormField, LcDateRangeInputComponent, LcFormFieldComponent],
  template: `<lc-form-field label="Période"><lc-date-range-input [formField]="f.range" /></lc-form-field>`,
})
class FormBoundsHost {
  readonly model = signal<{ range: LcDateInterval }>({ range: { from: '2026-11-18', to: null } });
  // Signal Forms type `min` et `max` sur un nombre : une date ISO est posée de force, c'est ce que le champ lit.
  readonly f = form(this.model, (path) => {
    min(path.range as never, '2026-11-15' as never);
    max(path.range as never, '2026-11-25' as never);
  });
}

@Component({ selector: 'lc-test-form-host', imports: [FormField, LcDateRangeInputComponent, LcFormFieldComponent], template: `<lc-form-field label="Période"><lc-date-range-input [formField]="f.range" /></lc-form-field>` })
class FormHost {
  readonly model = signal<{ range: LcDateInterval }>({ range: { from: null, to: null } });
  readonly f = form(this.model);
}

const viewport = () => {
  const subject = new BehaviorSubject({ matches: true, breakpoints: { '(min-width: 640px)': true, '(min-width: 840px)': true } as Record<string, boolean> });
  return { provide: BreakpointObserver, useValue: { observe: () => subject, isMatched: () => false } };
};

async function mount<T>(host: new () => T, mode: 'calendar' | 'native' = 'calendar') {
  TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: mode }, viewport()] });
  const fixture = TestBed.createComponent(host);
  document.body.append(fixture.nativeElement);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const inputs = () => [...el.querySelectorAll<HTMLInputElement>('input')];
  const type = async (input: HTMLInputElement, digits: string) => {
    input.focus();
    for (const char of digits) input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };
  /** Retape une date complète en repartant de la première zone. */
  const retype = async (input: HTMLInputElement, digits: string) => {
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await type(input, digits);
  };
  const paste = (input: HTMLInputElement, text: string) => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
    input.dispatchEvent(event);
  };
  const count = () => (el.textContent!.replace(/\s+/g, ' ').split(MESSAGE).length - 1);
  return { fixture, host: fixture.componentInstance, el, inputs, type, retype, paste, count };
}

describe('lc-date-range-input, corrections', () => {
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  it('fin avant début dans lc-form-field avec [(value)] (sans [formField]) : le message est affiché une fois, la ligne « Sans date de fin » disparaît', async () => {
    const { host, inputs, type, count, el } = await mount(InFieldHost);
    const [from, to] = inputs();
    await type(from, '10112026');
    expect(el.textContent).toContain('Sans date de fin');
    await type(to, '05112026');
    expect(count()).toBe(1);
    expect(host.value()).toEqual({ from: '2026-11-10', to: null });
    expect(to.getAttribute('aria-invalid')).toBe('true');
    expect(el.textContent).not.toContain('Sans date de fin');
    expect(el.querySelector('[role=group]')!.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('hors lc-form-field : le message est affiché une fois par le composant', async () => {
    const { inputs, type, count } = await mount(PlainHost);
    await type(inputs()[0], '10112026');
    await type(inputs()[1], '05112026');
    expect(count()).toBe(1);
  });

  it('sous [formField] et lc-form-field : une seule fois, avant et après « touché »', async () => {
    const { fixture, inputs, type, count, el } = await mount(FormHost);
    await type(inputs()[0], '10112026');
    await type(inputs()[1], '05112026');
    expect(count()).toBe(1);
    inputs()[1].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    await fixture.whenStable();
    expect(count()).toBe(1);
    expect(el.querySelectorAll('.lc-form-field__error').length).toBe(1);
  });

  it('début corrigé après une fin refusée : la fin devenue valable entre dans la valeur et le message disparaît (calendrier)', async () => {
    const { host, inputs, type, retype, count } = await mount(PlainHost);
    await type(inputs()[0], '10112026');
    await type(inputs()[1], '05112026');
    expect(count()).toBe(1);
    await retype(inputs()[0], '01112026');
    expect(inputs()[1].value).toBe('05/11/2026');
    expect(host.value()).toEqual({ from: '2026-11-01', to: '2026-11-05' });
    expect(count()).toBe(0);
    expect(inputs()[1].getAttribute('aria-invalid')).toBeNull();
  });

  it('début collé (une seule écriture) mais encore après la fin refusée : rien ne change, le message reste', async () => {
    const { fixture, host, inputs, type, paste, count } = await mount(PlainHost);
    await type(inputs()[0], '10112026');
    await type(inputs()[1], '05112026');
    paste(inputs()[0], '08/11/2026');
    await fixture.whenStable();
    expect(host.value()).toEqual({ from: '2026-11-08', to: null });
    expect(count()).toBe(1);
  });

  it('même chose en mode natif', async () => {
    const { fixture, host, inputs, count } = await mount(PlainHost, 'native');
    const set = async (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.whenStable();
    };
    await set(inputs()[0], '2026-11-10');
    await set(inputs()[1], '2026-11-05');
    expect(count()).toBe(1);
    expect(host.value()).toEqual({ from: '2026-11-10', to: null });
    await set(inputs()[0], '2026-11-01');
    expect(host.value()).toEqual({ from: '2026-11-01', to: '2026-11-05' });
    expect(count()).toBe(0);
  });

  it('[value] lié à `undefined` : période vide, aucune exception', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture, inputs, host } = await mount(UndefinedHost);
    expect(inputs().map((i) => i.value)).toEqual(['jj/mm/aaaa', 'jj/mm/aaaa']);
    host.value.set({ from: '2026-11-01', to: null });
    await fixture.whenStable();
    expect(inputs()[0].value).toBe('01/11/2026');
    host.value.set(undefined);
    await fixture.whenStable();
    expect(inputs()[0].value).toBe('jj/mm/aaaa');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('[formField] avec [min] et [max] : les jours hors bornes restent non sélectionnables dans le panneau', async () => {
    const { fixture, el } = await mount(FormBoundsHost);
    el.querySelector<HTMLButtonElement>('.lc-date-range-input__button')!.click();
    await fixture.whenStable();
    await fixture.whenStable();
    const cell = (iso: string) => document.querySelector(`lc-calendar-panel td[data-date="${iso}"]`)!;
    expect(cell('2026-11-10').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-11-30').getAttribute('aria-disabled')).toBe('true');
    expect(cell('2026-11-20').getAttribute('aria-disabled')).toBeNull();
  });

  it('l’API publique de la classe : ni `rejects` ni `entered`', () => {
    const names = Object.getOwnPropertyNames(LcDateRangeInputComponent.prototype);
    expect(names).not.toContain('rejects');
    expect(names).not.toContain('entered');
  });

  it('raccourcis : rognés, décrits, sans repli figé ; la date du jour est passée par l’appelant', () => {
    const labels = LC_LABELS_FR;
    const items = describePresets(labels, 'fr-FR', kitDatePresets(labels), '2026-11-19', '2026-11-15', '2026-11-30');
    expect(items.map((item) => item.dates)).toEqual(['du 15 au 19 novembre 2026', 'du 15 au 19 novembre 2026', 'du 15 au 30 novembre 2026', labels.dateNoneAllowed]);
    expect(items[3].interval).toBeNull();
    // Le lendemain, les mêmes raccourcis donnent d'autres dates : rien n'est figé.
    expect(describePresets(labels, 'fr-FR', kitDatePresets(labels), '2026-11-20', null, null)[0].interval).toEqual({ from: '2026-11-14', to: '2026-11-20' });
  });

  it('mode natif : les raccourcis lisent la date du jour au rendu', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 19, 12));
    try {
      const { el } = await mount(PlainHost, 'native');
      const dates = () => [...el.querySelectorAll('.lc-date-range-input__shortcuts .lc-calendar__preset-dates')].map((d) => d.textContent);
      expect(dates()[0]).toBe('du 13 au 19 novembre 2026');
    } finally {
      vi.useRealTimers();
    }
  });
});

