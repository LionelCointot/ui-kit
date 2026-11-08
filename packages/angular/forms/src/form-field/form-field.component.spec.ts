import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';
import { LcInputDirective } from '../input/input.directive';
import { LcMoneyInputComponent } from '../numeric/money-input.component';
import { LcSegmentedControlComponent } from '../segmented-control/segmented-control.component';
import { LcFieldStateLike } from './form-field-control';
import { LcFormFieldComponent } from './form-field.component';

@Component({
  imports: [LcFormFieldComponent, LcInputDirective],
  template: `
    <lc-form-field label="Nom" hint="Tel qu'il figure sur la pièce d'identité" required [errors]="serverErrors()" [state]="state()">
      <input lcInput id="name" aria-describedby="external" />
    </lc-form-field>
  `,
})
class NativeHostComponent {
  readonly serverErrors = signal<readonly string[]>([]);
  readonly state = signal<LcFieldStateLike | undefined>(undefined);
}

@Component({
  imports: [LcFormFieldComponent, LcMoneyInputComponent, LcSegmentedControlComponent, FormField],
  template: `
    <lc-form-field label="Montant" [state]="f.amount()">
      <lc-money-input [formField]="f.amount" />
    </lc-form-field>
    <lc-form-field label="Type de taux">
      <lc-segmented-control [formField]="f.rate" [options]="rateOptions" />
    </lc-form-field>
  `,
})
class SignalFormsHostComponent {
  readonly model = signal({ amount: null as number | null, rate: 'fixed' as string | null });
  readonly f = form(this.model, (path) => {
    required(path.amount, { message: 'Le montant est obligatoire.' });
  });
  readonly rateOptions = [
    { value: 'fixed', label: 'Fixe' },
    { value: 'variable', label: 'Variable' },
  ];
}

function state(touched: boolean, invalid: boolean, messages: string[], isRequired = false): LcFieldStateLike {
  return {
    touched: () => touched,
    invalid: () => invalid,
    errors: () => messages.map((message) => ({ message })),
    required: () => isRequired,
  };
}

describe('LcFormFieldComponent', () => {
  it('relie le libellé, l\'aide et l\'état requis au contrôle natif', async () => {
    const fixture = TestBed.createComponent(NativeHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const label = element.querySelector('label')!;
    const input = element.querySelector('input')!;
    const hint = element.querySelector('.lc-form-field__hint')!;
    expect(label.getAttribute('for')).toBe('name');
    expect(label.textContent).toContain('Nom');
    expect(input.getAttribute('aria-describedby')).toBe(`external ${hint.id}`);
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('affiche les erreurs serveur et marque le contrôle invalide', async () => {
    const fixture = TestBed.createComponent(NativeHostComponent);
    fixture.componentInstance.serverErrors.set(['Montant refusé par le serveur.']);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input')!;
    const errors = element.querySelector('.lc-form-field__errors')!;
    expect(errors.textContent).toContain('Montant refusé par le serveur.');
    expect(errors.querySelector('lc-icon')).not.toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(errors.id);
  });

  it('n\'affiche les erreurs client qu\'une fois le champ touché et invalide', async () => {
    const fixture = TestBed.createComponent(NativeHostComponent);
    fixture.componentInstance.state.set(state(false, true, ['Obligatoire.']));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.lc-form-field__errors')).toBeNull();
    fixture.componentInstance.state.set(state(true, true, ['Obligatoire.']));
    await fixture.whenStable();
    expect(element.querySelector('.lc-form-field__errors')?.textContent).toContain('Obligatoire.');
    expect(element.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('fonctionne avec Signal Forms : erreurs après sortie du champ, valeur numérique dans le modèle', async () => {
    const fixture = TestBed.createComponent(SignalFormsHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('lc-money-input input')!;
    const label = element.querySelector('label')!;
    expect(label.getAttribute('for')).toBe(input.id);
    expect(element.querySelector('.lc-form-field__errors')).toBeNull();

    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(element.querySelector('.lc-form-field__errors')?.textContent).toContain('Le montant est obligatoire.');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    input.dispatchEvent(new Event('focus'));
    input.value = '250 000';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.model().amount).toBe(250000);
    expect(input.value).toBe('250 000');
    expect(element.querySelector('.lc-form-field__errors')).toBeNull();
  });

  it('relie le libellé d\'un contrôle non étiquetable par aria-labelledby', async () => {
    const fixture = TestBed.createComponent(SignalFormsHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const fields = element.querySelectorAll('lc-form-field');
    const label = fields[1].querySelector('label')!;
    const group = fields[1].querySelector('lc-segmented-control')!;
    expect(label.getAttribute('for')).toBeNull();
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
  });
});
