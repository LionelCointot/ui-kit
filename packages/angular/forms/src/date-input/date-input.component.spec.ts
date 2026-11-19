import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LcFillMode, LcRounded, LcSize } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcDateInputComponent, toIsoDate } from './date-input.component';

/** Caractérisation (T0, CA-3) du mode natif actuel de `lc-date-input` : à garder verte à travers la refonte. */
@Component({
  imports: [LcDateInputComponent],
  template: `
    <lc-date-input [(value)]="value" [min]="min()" [max]="max()" [disabled]="disabled()" [readonly]="readonly()"
      [invalid]="invalid()" [touched]="touched()" [required]="required()" [size]="size()" [fillMode]="fillMode()"
      [rounded]="rounded()" [inputId]="inputId()" [ariaLabel]="ariaLabel()" (touch)="touchCount.set(touchCount() + 1)" />
  `,
})
class DateHostComponent {
  readonly value = signal<string | null>('2026-11-12');
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly invalid = signal(false);
  readonly touched = signal(false);
  readonly required = signal(false);
  readonly size = signal<LcSize | undefined>(undefined);
  readonly fillMode = signal<LcFillMode | undefined>(undefined);
  readonly rounded = signal<LcRounded | undefined>(undefined);
  readonly inputId = signal('d1');
  readonly ariaLabel = signal<string | undefined>('Date');
  readonly touchCount = signal(0);
}

@Component({
  imports: [LcFormFieldComponent, LcDateInputComponent],
  template: `
    <lc-form-field label="Naissance" hint="Aide" required [errors]="['Erreur']">
      <lc-date-input [(value)]="value" />
    </lc-form-field>
  `,
})
class FieldHostComponent {
  readonly value = signal<string | null>(null);
}

describe('CA-3 lc-date-input, mode natif (caractérisation)', () => {
  async function setup() {
    const fixture = TestBed.createComponent(DateHostComponent);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const el = host.querySelector<HTMLElement>('lc-date-input')!;
    const input = el.querySelector<HTMLInputElement>('input')!;
    const set = async (fn: (h: DateHostComponent) => void) => {
      fn(fixture.componentInstance);
      await fixture.whenStable();
    };
    const type = async (text: string, event = 'input') => {
      input.value = text;
      input.dispatchEvent(new Event(event));
      await fixture.whenStable();
    };
    return { fixture, host: fixture.componentInstance, el, input, set, type };
  }

  it('CA-3 : le champ est un input[type=date]', async () => {
    const { el, input } = await setup();
    expect(el.querySelectorAll('input')).toHaveLength(1);
    expect(input.type).toBe('date');
    expect(input.classList.contains('lc-field__input')).toBe(true);
    expect(el.classList.contains('lc-date-input')).toBe(true);
  });

  it('CA-3 : la valeur ISO est affichée, et suit le modèle', async () => {
    const { input, set } = await setup();
    expect(input.value).toBe('2026-11-12');
    await set((h) => h.value.set('2027-01-05'));
    expect(input.value).toBe('2027-01-05');
    await set((h) => h.value.set(null));
    expect(input.value).toBe('');
  });

  it('CA-3 : les événements input et change mettent à jour [(value)]', async () => {
    const { host, type } = await setup();
    await type('2026-12-25', 'input');
    expect(host.value()).toBe('2026-12-25');
    await type('2026-12-26', 'change');
    expect(host.value()).toBe('2026-12-26');
  });

  it('CA-3 : un champ vidé donne null', async () => {
    const { host, type } = await setup();
    await type('');
    expect(host.value()).toBeNull();
  });

  // jsdom assainit un texte non ISO en '' : pour simuler un navigateur sans sélecteur natif, on force la lecture du texte.
  function typeRaw(input: HTMLInputElement, text: string) {
    Object.defineProperty(input, 'value', { configurable: true, get: () => text });
    input.dispatchEvent(new Event('input'));
    delete (input as { value?: unknown }).value;
  }

  it('CA-3 : un texte non reconnu laisse la valeur inchangée (repli sans sélecteur natif)', async () => {
    const { host, input } = await setup();
    typeRaw(input, 'n\'importe quoi');
    typeRaw(input, '31/02/2026');
    expect(host.value()).toBe('2026-11-12');
  });

  it('CA-3 : le repli JJ/MM/AAAA est converti en ISO', async () => {
    const { host, input } = await setup();
    typeRaw(input, '1/2/2026');
    expect(host.value()).toBe('2026-02-01');
  });

  it('CA-3 : min et max sont des attributs, absents sans valeur', async () => {
    const { input, set } = await setup();
    expect(input.hasAttribute('min')).toBe(false);
    expect(input.hasAttribute('max')).toBe(false);
    await set((h) => {
      h.min.set('2026-01-01');
      h.max.set('2026-12-31');
    });
    expect(input.getAttribute('min')).toBe('2026-01-01');
    expect(input.getAttribute('max')).toBe('2026-12-31');
    await set((h) => {
      h.min.set(undefined);
      h.max.set(undefined);
    });
    expect(input.hasAttribute('min')).toBe(false);
    expect(input.hasAttribute('max')).toBe(false);
  });

  it('CA-3 : disabled et readonly, avec leurs classes de cadre', async () => {
    const { el, input, set } = await setup();
    expect([input.disabled, input.readOnly]).toEqual([false, false]);
    expect(el.classList.contains('lc-field--disabled')).toBe(false);
    expect(el.classList.contains('lc-field--readonly')).toBe(false);
    await set((h) => h.disabled.set(true));
    expect(input.disabled).toBe(true);
    expect(el.classList.contains('lc-field--disabled')).toBe(true);
    await set((h) => {
      h.disabled.set(false);
      h.readonly.set(true);
    });
    expect(input.readOnly).toBe(true);
    expect(el.classList.contains('lc-field--readonly')).toBe(true);
  });

  it('CA-3 : classes de cadre selon taille, remplissage et arrondi', async () => {
    const { el, set } = await setup();
    expect(el.classList.contains('lc-field')).toBe(true);
    expect(el.className).toMatch(/lc-field--\w+/);
    await set((h) => {
      h.size.set('large');
      h.fillMode.set('flat');
      h.rounded.set('full');
    });
    for (const c of ['lc-field--large', 'lc-field--flat', 'lc-field--rounded-full']) {
      expect(el.classList.contains(c)).toBe(true);
    }
    expect(el.classList.contains('lc-date-input')).toBe(true);
  });

  it('CA-3 : aria-invalid seulement si invalide et touché, ou après la sortie du champ', async () => {
    const { el, input, set, fixture } = await setup();
    await set((h) => h.invalid.set(true));
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(el.classList.contains('lc-field--invalid')).toBe(false);
    await set((h) => h.touched.set(true));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(el.classList.contains('lc-field--invalid')).toBe(true);
    await set((h) => {
      h.touched.set(false);
    });
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    await set((h) => h.invalid.set(false));
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('CA-3 : aria-required et aria-label', async () => {
    const { input, set } = await setup();
    expect(input.hasAttribute('aria-required')).toBe(false);
    expect(input.getAttribute('aria-label')).toBe('Date');
    await set((h) => {
      h.required.set(true);
      h.ariaLabel.set(undefined);
    });
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.hasAttribute('aria-label')).toBe(false);
  });

  it('CA-3 : inputId pose l\'id du champ, et controlId le reprend', async () => {
    const { input, set, fixture } = await setup();
    expect(input.id).toBe('d1');
    await set((h) => h.inputId.set('autre'));
    expect(input.id).toBe('autre');
    const cmp = fixture.debugElement.children[0].componentInstance as LcDateInputComponent;
    expect(cmp.controlId()).toBe('autre');
    expect(cmp.labelable).toBe(true);
  });

  it('CA-3 : touch est émis à la sortie du champ', async () => {
    const { host, input, fixture } = await setup();
    expect(host.touchCount()).toBe(0);
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(host.touchCount()).toBe(1);
  });

  it('CA-3 : focus() donne le focus au champ', async () => {
    const { fixture, input } = await setup();
    document.body.appendChild(fixture.nativeElement);
    const cmp = fixture.debugElement.children[0].componentInstance as LcDateInputComponent;
    cmp.focus();
    expect(document.activeElement).toBe(input);
    fixture.nativeElement.remove();
  });

  it('CA-3 : dans lc-form-field, le libellé est relié au champ et le champ décrit par l\'aide et l\'erreur', async () => {
    const fixture = TestBed.createComponent(FieldHostComponent);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('lc-date-input input')!;
    const label = root.querySelector<HTMLLabelElement>('label')!;
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.id).not.toBe('');
    expect(input.getAttribute('aria-required')).toBe('true');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(root.querySelector(`#${id}`)).not.toBeNull();
  });
});

describe('CA-3 toIsoDate', () => {
  it.each<[string, string | null | undefined]>([
    ['', null],
    ['2026-11-12', '2026-11-12'],
    ['12/11/2026', '2026-11-12'],
    ['1/2/2026', '2026-02-01'],
    ['12.11.2026', '2026-11-12'],
    ['12-11-2026', '2026-11-12'],
    ['31/02/2026', undefined],
    ['12/11/26', undefined],
    ['n\'importe quoi', undefined],
  ])('CA-3 : toIsoDate(%j) = %j', (text, expected) => {
    expect(toIsoDate(text)).toBe(expected);
  });
});
