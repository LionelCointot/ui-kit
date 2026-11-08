import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcMoneyInputComponent } from './money-input.component';
import { LcNumberInputComponent } from './number-input.component';
import { LcPercentInputComponent } from './percent-input.component';

@Component({
  imports: [LcMoneyInputComponent, LcPercentInputComponent, LcNumberInputComponent],
  template: `
    <lc-money-input [(value)]="amount" ariaLabel="Montant" (touch)="touched.set(true)" />
    <lc-percent-input [(value)]="rate" ariaLabel="Taux" [decimals]="3" />
    <lc-number-input [(value)]="months" ariaLabel="Durée" unit="mois" showStepper [min]="1" [max]="3" />
  `,
})
class NumericHostComponent {
  readonly amount = signal<number | null>(250000);
  readonly rate = signal<number | null>(3.5);
  readonly months = signal<number | null>(2);
  readonly touched = signal(false);
}

describe('LcMoneyInputComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(NumericHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('lc-money-input input')!;
    return { fixture, element, input };
  }

  async function type(fixture: { whenStable(): Promise<unknown> }, input: HTMLInputElement, text: string) {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('affiche « 250 000 » et l\'unité hors focus, avec la sémantique attendue', async () => {
    const { element, input } = await setup();
    expect(input.value).toBe('250 000');
    expect(input.getAttribute('inputmode')).toBe('decimal');
    expect(input.getAttribute('aria-label')).toBe('Montant');
    const unit = element.querySelector('lc-money-input .lc-field__unit')!;
    expect(unit.textContent?.trim()).toBe('€');
    expect(input.getAttribute('aria-describedby')).toBe(unit.id);
  });

  it('affiche la valeur brute au focus et analyse la saisie française', async () => {
    const { fixture, input } = await setup();
    input.dispatchEvent(new Event('focus'));
    await fixture.whenStable();
    expect(input.value).toBe('250000');
    await type(fixture, input, '1.234,5');
    expect(fixture.componentInstance.amount()).toBe(1234.5);
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(input.value).toBe('1 234,50');
    expect(fixture.componentInstance.touched()).toBe(true);
  });

  it('arrondit à la sortie du champ et renvoie null quand le champ est vide', async () => {
    const { fixture, input } = await setup();
    input.dispatchEvent(new Event('focus'));
    await type(fixture, input, '10,005');
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.amount()).toBe(10.01);
    input.dispatchEvent(new Event('focus'));
    await type(fixture, input, '');
    expect(fixture.componentInstance.amount()).toBeNull();
  });

  it('reformate le texte à la sortie même quand la valeur saisie est identique à l’ancienne', async () => {
    const { fixture, element, input } = await setup();
    const rate = element.querySelector<HTMLInputElement>('lc-percent-input input')!;

    rate.dispatchEvent(new Event('focus'));
    await type(fixture, rate, '3.5');          // même valeur que 3,5
    rate.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(rate.value).toBe('3,500');

    input.dispatchEvent(new Event('focus'));
    await type(fixture, input, '250000,0');    // même valeur que 250 000
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(input.value).toBe('250\u202f000');
  });

  it('lit « 1.234 » comme 1 234 quand le champ n’a que deux décimales', async () => {
    const { fixture, input } = await setup();
    input.dispatchEvent(new Event('focus'));
    await type(fixture, input, '1.234');
    expect(fixture.componentInstance.amount()).toBe(1234);
  });

  it('refuse les lettres sans modifier la valeur', async () => {
    const { fixture, input } = await setup();
    input.dispatchEvent(new Event('focus'));
    await type(fixture, input, '1200');
    await type(fixture, input, '1200a');
    expect(input.value).toBe('1200');
    expect(fixture.componentInstance.amount()).toBe(1200);
  });

  it('analyse un collage « 250 000,50 € » et refuse un collage non numérique', async () => {
    const { fixture, input } = await setup();
    input.dispatchEvent(new Event('focus'));
    const paste = (text: string) => {
      const event = new Event('paste', { cancelable: true }) as Event & { clipboardData: { getData(): string } };
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
      input.dispatchEvent(event);
      return event;
    };
    const event = paste('250 000,50 €');
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.amount()).toBe(250000.5);
    paste('bonjour');
    await fixture.whenStable();
    expect(fixture.componentInstance.amount()).toBe(250000.5);
  });

  it('pourcentage : flèches = ± pas de 0,05 et décimales configurables', async () => {
    const { fixture, element } = await setup();
    const input = element.querySelector<HTMLInputElement>('lc-percent-input input')!;
    expect(input.value).toBe('3,500');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.rate()).toBe(3.55);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.rate()).toBe(3.45);
  });

  it('nombre : boutons − et + étiquetés, bornés par min et max', async () => {
    const { fixture, element } = await setup();
    const [decrease, increase] = Array.from(element.querySelectorAll<HTMLButtonElement>('lc-number-input .lc-field__step'));
    expect(decrease.getAttribute('aria-label')).toBe('Diminuer');
    expect(increase.getAttribute('aria-label')).toBe('Augmenter');
    expect(element.querySelector<HTMLInputElement>('lc-number-input input')!.getAttribute('inputmode')).toBe('numeric');
    increase.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.months()).toBe(3);
    expect(increase.disabled).toBe(true);
    decrease.click();
    decrease.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.months()).toBe(1);
    expect(decrease.disabled).toBe(true);
  });
});
