import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { LcComboboxComponent } from './combobox/combobox.component';
import { LcDateInputComponent } from './date-input/date-input.component';
import { LcSliderComponent } from './slider/slider.component';

interface FormsModel {
  department: string | null;
  share: number | null;
}

/** `lc-combobox` et `lc-slider` sont des hôtes de `[formField]` (Signal Forms) : valeur, saisie, désactivation. */
@Component({
  imports: [FormField, LcComboboxComponent, LcSliderComponent],
  template: `
    <lc-combobox ariaLabel="Département" [options]="options" [displayWith]="label" [trackBy]="label" [formField]="f.department" />
    <lc-slider ariaLabel="Part" [formField]="f.share" />
  `,
})
class FormsHostComponent {
  protected readonly options = ['Ain', 'Rhône', 'Savoie'];
  protected readonly label = (item: string): string => item;
  readonly model = signal<FormsModel>({ department: null, share: null });
  readonly locked = signal(false);
  protected readonly f = form(this.model, (path) => {
    disabled(path.department, () => this.locked());
    disabled(path.share, () => this.locked());
  });
}

describe('lc-combobox et lc-slider dans un formulaire Signal Forms ([formField])', () => {
  let fixture: ComponentFixture<FormsHostComponent>;
  let host: FormsHostComponent;

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().querySelector<HTMLInputElement>('input[aria-label="Département"]')!;
  const range = () => root().querySelector<HTMLInputElement>('input[type="range"]')!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(FormsHostComponent);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((container) => (container.innerHTML = ''));
  });

  it('affiche la valeur du modèle', async () => {
    host.model.set({ department: 'Rhône', share: 40 });
    await fixture.whenStable();
    expect(text().value).toBe('Rhône');
    expect(range().value).toBe('40');
  });

  it('lc-combobox : une sélection remonte au modèle', async () => {
    text().focus();
    text().value = 'sav';
    text().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    text().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(host.model().department).toBe('Savoie');
  });

  it('lc-slider : un déplacement remonte au modèle', async () => {
    range().value = '70';
    range().dispatchEvent(new Event('input', { bubbles: true }));
    range().dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(host.model().share).toBe(70);
  });

  it('propage disabled du champ', async () => {
    expect([text().disabled, range().disabled]).toEqual([false, false]);
    host.locked.set(true);
    await fixture.whenStable();
    expect([text().disabled, range().disabled]).toEqual([true, true]);
  });
});

/** CA-3 : `lc-date-input` (mode natif) est un hôte de `[formField]`. */
@Component({
  imports: [FormField, LcDateInputComponent],
  template: `<lc-date-input ariaLabel="Date" [formField]="f.day" />`,
})
class DateFormHostComponent {
  readonly model = signal<{ day: string | null }>({ day: null });
  readonly f = form(this.model, (path) => {
    required(path.day, { message: 'Obligatoire.' });
  });
}

describe('CA-3 lc-date-input dans un formulaire Signal Forms ([formField])', () => {
  it('valeur du modèle vers le champ et retour, invalide et obligatoire', async () => {
    const fixture = TestBed.createComponent(DateFormHostComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('input[type="date"]')!;
    const host = fixture.componentInstance;
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(host.f.day().invalid()).toBe(true);
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    host.model.set({ day: '2026-11-12' });
    await fixture.whenStable();
    expect(input.value).toBe('2026-11-12');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    input.value = '2026-12-01';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(host.model().day).toBe('2026-12-01');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(host.model().day).toBeNull();
    expect(host.f.day().invalid()).toBe(true);
  });
});
