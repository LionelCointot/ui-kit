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

@Component({
  imports: [LcFormFieldComponent, LcInputDirective],
  template: `
    <lc-form-field label="Photos" hint="Trois au plus" [hintPlacement]="placement()" [errors]="errors()">
      <input lcInput id="photos" />
    </lc-form-field>
  `,
})
class HintPlacementHostComponent {
  readonly placement = signal<'below' | 'above'>('below');
  readonly errors = signal<readonly string[]>([]);
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

  describe('hintPlacement', () => {
    async function setupPlacement(init?: (host: HintPlacementHostComponent) => void) {
      const fixture = TestBed.createComponent(HintPlacementHostComponent);
      init?.(fixture.componentInstance);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      return {
        fixture,
        element,
        input: element.querySelector('input')!,
        hint: () => element.querySelector('.lc-form-field__hint')!,
        row: () => element.querySelector('.lc-form-field__row')!,
        /** Éléments du corps du champ, dans l'ordre du DOM (aide, contrôle, messages). */
        order: () => Array.from(element.querySelector('.lc-form-field__body')!.children).map((child) => child.className.split(' ')[0]),
      };
    }

    it('défaut (non lié) : l\'aide est sous le contrôle', async () => {
      const fixture = TestBed.createComponent(NativeHostComponent);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const hint = element.querySelector('.lc-form-field__hint')!;
      const row = element.querySelector('.lc-form-field__row')!;
      expect(row.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('« below » : contrôle, aide, messages ; « above » : aide, contrôle, messages ; une seule aide dans les deux cas', async () => {
      const { fixture, element, order } = await setupPlacement();
      expect(order()).toEqual(['lc-form-field__row', 'lc-form-field__hint', 'lc-form-field__messages']);
      fixture.componentInstance.placement.set('above');
      await fixture.whenStable();
      expect(order()).toEqual(['lc-form-field__hint', 'lc-form-field__row', 'lc-form-field__messages']);
      expect(element.querySelectorAll('.lc-form-field__hint').length).toBe(1);
    });

    it('« above » : l\'aide reste entre le libellé et le contrôle', async () => {
      const { element, hint, row } = await setupPlacement((h) => { h.placement.set('above'); });
      const label = element.querySelector('label')!;
      expect(label.compareDocumentPosition(hint()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(hint().compareDocumentPosition(row()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('sans aide, rien n\'est rendu quelle que soit la place', async () => {
      @Component({ imports: [LcFormFieldComponent, LcInputDirective], template: '<lc-form-field label="X" hintPlacement="above"><input lcInput /></lc-form-field>' })
      class NoHintHostComponent {}
      const fixture = TestBed.createComponent(NoHintHostComponent);
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector('.lc-form-field__hint')).toBeNull();
    });

    it.each([['below'], ['above']] as const)('« %s » : aria-describedby relie l\'aide puis l\'erreur, et l\'erreur est annoncée', async (placement) => {
      const { fixture, element, input, hint } = await setupPlacement((h) => { h.placement.set(placement); });
      expect(input.getAttribute('aria-describedby')).toBe(hint().id);
      fixture.componentInstance.errors.set(['Montant refusé.']);
      await fixture.whenStable();
      const errors = element.querySelector('.lc-form-field__errors')!;
      expect(input.getAttribute('aria-describedby')).toBe(`${hint().id} ${errors.id}`);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(errors.closest('[aria-live=polite]')).not.toBeNull();
      expect(errors.textContent).toContain('Montant refusé.');
    });
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
