import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';
import { BehaviorSubject } from 'rxjs';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import type { LcDateInterval } from './date-interval';
import { LcDateRangeInputComponent } from './date-range-input.component';
import { LC_DATE_PICKER } from './date-picker-mode';

@Component({
  imports: [LcDateRangeInputComponent],
  template: `<lc-date-range-input [(value)]="value" [min]="min()" [max]="max()" [presets]="presets()" [disabled]="disabled()" [readonly]="readonly()" [required]="required()" ariaLabel="Séjour" />`,
})
class HostComponent {
  readonly value = signal<LcDateInterval>({ from: null, to: null });
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly presets = signal<undefined | []>(undefined);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
}

@Component({ imports: [FormField, LcDateRangeInputComponent, LcFormFieldComponent], template: `<lc-form-field label="Période"><lc-date-range-input [formField]="f.range" /></lc-form-field>` })
class FormHostComponent {
  readonly model = signal<{ range: LcDateInterval }>({ range: { from: null, to: null } });
  readonly f = form(this.model);
}

@Component({ imports: [FormField, LcDateRangeInputComponent], template: `<lc-date-range-input [formField]="f.range" />` })
class BareFormHostComponent {
  readonly model = signal<{ range: LcDateInterval }>({ range: { from: null, to: null } });
  readonly f = form(this.model);
}

/** Largeur de fenêtre simulée : le champ lit deux requêtes (640 et 840 px). */
function fakeViewport(width: number) {
  const subject = new BehaviorSubject({ matches: true, breakpoints: {} as Record<string, boolean> });
  const set = (w: number) => subject.next({ matches: true, breakpoints: { '(min-width: 640px)': w >= 640, '(min-width: 840px)': w >= 840 } });
  set(width);
  return { provide: BreakpointObserver, useValue: { observe: () => subject, isMatched: () => false }, set };
}

async function mount(mode: 'calendar' | 'native', width = 1280, inputs: Partial<Record<string, unknown>> = {}) {
  const viewport = fakeViewport(width);
  TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: mode }, { provide: BreakpointObserver, useValue: viewport.useValue }] });
  const fixture = TestBed.createComponent(HostComponent);
  document.body.append(fixture.nativeElement);
  for (const [name, value] of Object.entries(inputs)) (fixture.componentInstance as unknown as Record<string, { set(v: unknown): void }>)[name].set(value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const inputs2 = () => [...el.querySelectorAll<HTMLInputElement>('input')];
  const typeInto = async (input: HTMLInputElement, digits: string) => {
    input.focus();
    for (const char of digits) input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };
  const button = () => el.querySelector<HTMLButtonElement>('.lc-date-range-input__button');
  const panel = () => document.querySelector<HTMLElement>('lc-calendar-panel');
  const open = async () => {
    button()!.click();
    await fixture.whenStable();
    await fixture.whenStable();
  };
  return { fixture, host: fixture.componentInstance, el, inputs: inputs2, typeInto, button, panel, open, viewport };
}

describe('lc-date-range-input, mode calendrier', () => {
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  it('groupe nommé, libellés « Du » et « Au », deux champs à zones, un seul bouton', async () => {
    const { el, inputs, button } = await mount('calendar');
    expect(el.querySelector('[role=group]')!.getAttribute('aria-label')).toBe('Séjour');
    expect([...el.querySelectorAll('label')].map((l) => l.textContent)).toEqual(['Du', 'Au']);
    expect(inputs().map((i) => i.value)).toEqual(['jj/mm/aaaa', 'jj/mm/aaaa']);
    expect(el.querySelectorAll('button')).toHaveLength(1);
    expect(button()!.getAttribute('aria-label')).toBe('Choisir une période');
    expect(button()!.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('nom du groupe par défaut : « Période »', async () => {
    const fixture = TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }).createComponent(LcDateRangeInputComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role=group]').getAttribute('aria-label')).toBe('Période');
  });

  it('la frappe des deux bornes donne la période ; le nom du bouton la dit', async () => {
    const { host, inputs, typeInto, button, fixture } = await mount('calendar');
    await typeInto(inputs()[0], '03112026');
    expect(host.value()).toEqual({ from: '2026-11-03', to: null });
    await typeInto(inputs()[1], '12112026');
    expect(host.value()).toEqual({ from: '2026-11-03', to: '2026-11-12' });
    await fixture.whenStable();
    expect(button()!.getAttribute('aria-label')).toBe('Changer la période, du 3 au 12 novembre 2026');
  });

  it('une seule borne : valide, sans état invalide, avec sa ligne et le bon nom de bouton, dans les deux sens', async () => {
    const { host, el, button, fixture } = await mount('calendar');
    host.value.set({ from: '2026-11-01', to: null });
    await fixture.whenStable();
    expect(el.querySelector('.lc-date-range-input__note')!.textContent).toBe('Sans date de fin : tout depuis le 1 novembre 2026.');
    expect(button()!.getAttribute('aria-label')).toBe('Changer la période, à partir du 1 novembre 2026');
    expect(el.querySelector('[role=group]')!.getAttribute('aria-describedby')).toContain(el.querySelector('.lc-date-range-input__note')!.id);
    expect(el.querySelectorAll('.lc-field--invalid')).toHaveLength(0);
    host.value.set({ from: null, to: '2026-11-30' });
    await fixture.whenStable();
    expect(el.querySelector('.lc-date-range-input__note')!.textContent).toBe("Sans date de début : tout jusqu'au 30 novembre 2026.");
    expect(button()!.getAttribute('aria-label')).toBe("Changer la période, jusqu'au 30 novembre 2026");
    host.value.set({ from: null, to: null });
    await fixture.whenStable();
    expect(el.querySelector('.lc-date-range-input__note')).toBeNull();
  });

  it('une fin tapée avant le début vaut null, le cadre de ce champ est invalide, le message est sous le groupe', async () => {
    const { host, el, inputs, typeInto, fixture } = await mount('calendar', 1280, { value: { from: '2026-11-10', to: null } });
    await typeInto(inputs()[1], '05112026');
    expect(host.value()).toEqual({ from: '2026-11-10', to: null });
    await fixture.whenStable();
    const frames = [...el.querySelectorAll('lc-date-input')].map((f) => f.classList.contains('lc-field--invalid'));
    expect(frames).toEqual([false, true]);
    expect(el.querySelector('.lc-date-range-input__error')!.textContent).toBe('La date de fin est avant la date de début.');
    // une fin valable efface le message
    host.value.set({ from: '2026-11-10', to: '2026-11-12' });
    await fixture.whenStable();
    expect(el.querySelector('.lc-date-range-input__error')).toBeNull();
  });

  it('un début tapé après la fin vaut null ; la valeur émise a toujours from <= to', async () => {
    const { host, inputs, typeInto } = await mount('calendar', 1280, { value: { from: null, to: '2026-11-10' } });
    await typeInto(inputs()[0], '15112026');
    expect(host.value()).toEqual({ from: null, to: '2026-11-10' });
  });

  it('une borne incomplète à la sortie : null, cadre invalide de ce champ, aucun message', async () => {
    const { host, el, inputs, typeInto, fixture } = await mount('calendar', 1280, { value: { from: '2026-11-10', to: '2026-11-12' } });
    await typeInto(inputs()[1], '');
    inputs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    inputs()[1].blur();
    await fixture.whenStable();
    expect(host.value().to).toBeNull();
    expect([...el.querySelectorAll('lc-date-input')].map((f) => f.classList.contains('lc-field--invalid'))).toEqual([false, true]);
    expect(el.querySelector('.lc-date-range-input__error')).toBeNull();
  });

  it('ouvrir : panneau en période, deux mois à 1280 px, raccourcis en colonne ; choisir début puis fin met tout à jour et rend le focus au bouton', async () => {
    const { host, el, inputs, panel, open, button, fixture } = await mount('calendar');
    await open();
    expect(panel()!.classList.contains('lc-calendar--range')).toBe(true);
    expect(panel()!.querySelectorAll('.lc-calendar__month')).toHaveLength(2);
    expect(panel()!.querySelector('.lc-calendar__layout--column')).not.toBeNull();
    expect(panel()!.querySelectorAll('.lc-calendar__preset')).toHaveLength(4);
    const cells = panel()!.querySelectorAll<HTMLElement>('td[data-date]');
    const first = cells[2];
    first.click();
    await fixture.whenStable();
    cells[9].click();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(host.value()).toEqual({ from: first.dataset['date'], to: cells[9].dataset['date'] });
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(button());
    expect(inputs().map((i) => i.value)).not.toContain('jj/mm/aaaa');
    expect(el.contains(document.activeElement)).toBe(true);
  });

  it('un seul mois et raccourcis en grille sous 640 px ; deux mois et grille entre 640 et 840 px', async () => {
    const small = await mount('calendar', 600);
    await small.open();
    expect(small.panel()!.querySelectorAll('.lc-calendar__month')).toHaveLength(1);
    expect(small.panel()!.querySelector('.lc-calendar__layout--column')).toBeNull();
    small.viewport.set(700);
    await small.fixture.whenStable();
    expect(small.panel()!.querySelectorAll('.lc-calendar__month')).toHaveLength(2);
    expect(small.panel()!.querySelector('.lc-calendar__layout--column')).toBeNull();
  });

  it('un raccourci pose la période, ferme et rend le focus au bouton', async () => {
    const { host, panel, open, button, fixture } = await mount('calendar');
    await open();
    panel()!.querySelector<HTMLElement>('.lc-calendar__preset')!.click();
    await fixture.whenStable();
    expect(host.value().from).not.toBeNull();
    expect(host.value().to).not.toBeNull();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  it('« Sans date de fin » donne { from, to: null } ; « Effacer la période » vide les deux bornes', async () => {
    const { host, panel, open, fixture } = await mount('calendar');
    await open();
    panel()!.querySelector<HTMLElement>('td[data-date]')!.click();
    await fixture.whenStable();
    panel()!.querySelector<HTMLElement>('.lc-calendar__no-end')!.click();
    await fixture.whenStable();
    expect(host.value().from).not.toBeNull();
    expect(host.value().to).toBeNull();
    await open();
    [...panel()!.querySelectorAll('button')].find((b) => b.textContent!.includes('Effacer la période'))!.click();
    await fixture.whenStable();
    expect(host.value()).toEqual({ from: null, to: null });
  });

  it('Échap ferme sans rien changer et rend le focus au bouton', async () => {
    const { host, panel, open, button, fixture } = await mount('calendar', 1280, { value: { from: '2026-11-10', to: '2026-11-12' } });
    await open();
    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(host.value()).toEqual({ from: '2026-11-10', to: '2026-11-12' });
    expect(document.activeElement).toBe(button());
  });

  it('presets = [] masque les raccourcis ; required cache « Effacer la période »', async () => {
    const { panel, open } = await mount('calendar', 1280, { presets: [], required: true });
    await open();
    expect(panel()!.querySelector('.lc-calendar__presets')).toBeNull();
    expect(panel()!.textContent).not.toContain('Effacer');
  });

  it('désactivé ou en lecture seule : ni bouton ni panneau, champs inertes', async () => {
    const off = await mount('calendar', 1280, { disabled: true });
    expect(off.button()).toBeNull();
    expect(off.inputs().every((i) => i.disabled)).toBe(true);
    document.body.replaceChildren();
    TestBed.resetTestingModule();
    const ro = await mount('calendar', 1280, { readonly: true });
    expect(ro.button()).toBeNull();
    expect(ro.inputs().every((i) => i.readOnly)).toBe(true);
  });

  it('focus() va au champ de début ; inputId le désigne', async () => {
    const { fixture, inputs, el } = await mount('calendar');
    const range = fixture.debugElement.children[0].componentInstance as LcDateRangeInputComponent;
    range.focus();
    expect(document.activeElement).toBe(inputs()[0]);
    expect(el.querySelector('label')!.getAttribute('for')).toBe(inputs()[0].id);
  });
});

describe('lc-date-range-input, mode natif', () => {
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  it('deux input[type=date] bornés l’un par l’autre, sans bouton ni panneau', async () => {
    const { el, inputs, host, fixture } = await mount('native', 1280, { min: '2026-01-01', max: '2026-12-31' });
    expect(inputs().map((i) => i.type)).toEqual(['date', 'date']);
    expect(el.querySelector('.lc-date-range-input__button')).toBeNull();
    expect(inputs().map((i) => [i.getAttribute('min'), i.getAttribute('max')])).toEqual([['2026-01-01', '2026-12-31'], ['2026-01-01', '2026-12-31']]);
    host.value.set({ from: '2026-03-02', to: '2026-03-09' });
    await fixture.whenStable();
    expect(inputs().map((i) => [i.getAttribute('min'), i.getAttribute('max')])).toEqual([['2026-01-01', '2026-03-09'], ['2026-03-02', '2026-12-31']]);
  });

  it('sans bornes : aucun attribut min ni max', async () => {
    const { inputs } = await mount('native');
    expect(inputs().every((i) => !i.hasAttribute('min') && !i.hasAttribute('max'))).toBe(true);
  });

  it('une fin avant le début est refusée : valeur null, état invalide, message sous le groupe', async () => {
    const { inputs, host, el, fixture } = await mount('native', 1280, { value: { from: '2026-11-10', to: null } });
    inputs()[1].value = '2026-11-05';
    inputs()[1].dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(host.value()).toEqual({ from: '2026-11-10', to: null });
    expect(el.querySelector('.lc-date-range-input__error')!.textContent).toContain('avant la date de début');
    inputs()[1].value = '2026-11-12';
    inputs()[1].dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(host.value()).toEqual({ from: '2026-11-10', to: '2026-11-12' });
    expect(el.querySelector('.lc-date-range-input__error')).toBeNull();
  });

  it('raccourcis en rangée nommée « Raccourcis » ; un clic remplit la période ; désactivés si le champ l’est', async () => {
    const { el, host, fixture } = await mount('native');
    const row = el.querySelector('.lc-date-range-input__shortcuts')!;
    expect(row.getAttribute('aria-label')).toBe('Raccourcis');
    expect(row.querySelectorAll('button')).toHaveLength(4);
    row.querySelector('button')!.click();
    await fixture.whenStable();
    expect(host.value().from).not.toBeNull();
    host.disabled.set(true);
    await fixture.whenStable();
    expect([...row.querySelectorAll('button')].every((b) => b.disabled)).toBe(true);
  });

  it('presets = [] : pas de rangée ; une borne : la ligne explicative', async () => {
    const { el, host, fixture } = await mount('native', 1280, { presets: [] });
    expect(el.querySelector('.lc-date-range-input__shortcuts')).toBeNull();
    host.value.set({ from: '2026-11-01', to: null });
    await fixture.whenStable();
    expect(el.querySelector('.lc-date-range-input__note')!.textContent).toContain('Sans date de fin');
  });
});

describe('lc-date-range-input sous Signal Forms', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }));
  afterEach(() => document.body.replaceChildren());

  it('[formField] : la période va et vient ; une fin avant le début est une erreur parse avec son message, affichée par lc-form-field', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = [...el.querySelectorAll<HTMLInputElement>('input')];
    const type = async (input: HTMLInputElement, digits: string) => {
      input.focus();
      for (const char of digits) input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    };
    await type(inputs[0], '10112026');
    expect(fixture.componentInstance.model().range).toEqual({ from: '2026-11-10', to: null });
    expect(fixture.componentInstance.f.range().invalid()).toBe(false);
    await type(inputs[1], '05112026');
    const state = fixture.componentInstance.f.range();
    expect(state.invalid()).toBe(true);
    expect(state.errors()).toEqual([expect.objectContaining({ kind: 'parse', message: 'La date de fin est avant la date de début.' })]);
    fixture.componentInstance.model.set({ range: { from: '2026-11-01', to: '2026-11-03' } });
    await fixture.whenStable();
    expect(fixture.componentInstance.f.range().invalid()).toBe(false);
    expect(inputs[0].value).toBe('01/11/2026');
  });

  it('sans lc-form-field, le message n’est pas affiché deux fois : le cadre invalide vient du formulaire', async () => {
    const fixture = TestBed.createComponent(BareFormHostComponent);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    fixture.componentInstance.model.set({ range: { from: '2026-11-01', to: null } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.lc-date-range-input__note')).not.toBeNull();
    expect(fixture.componentInstance.f.range().invalid()).toBe(false);
  });
});
