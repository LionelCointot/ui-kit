import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcPasswordInputComponent } from './password-input.component';

@Component({
  imports: [LcPasswordInputComponent],
  template: `
    <lc-password-input [(value)]="password" ariaLabel="Mot de passe" placeholder="••••••••"
      [autocomplete]="autocomplete()" [disabled]="disabled()" [readonly]="readonly()" (touch)="touched.set(true)" />
  `,
})
class PasswordHostComponent {
  readonly password = signal('secret');
  readonly autocomplete = signal<'current-password' | 'new-password'>('current-password');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly touched = signal(false);
}

@Component({
  imports: [LcFormFieldComponent, LcPasswordInputComponent, FormField],
  template: `
    <lc-form-field label="Mot de passe" hint="12 caractères minimum" [state]="f.password()">
      <lc-password-input [formField]="f.password" autocomplete="new-password" />
    </lc-form-field>
  `,
})
class SignalFormsHostComponent {
  readonly model = signal({ password: '' });
  readonly f = form(this.model, (path) => {
    required(path.password, { message: 'Le mot de passe est obligatoire.' });
  });
}

describe('LcPasswordInputComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(PasswordHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('lc-password-input input')!;
    const toggle = element.querySelector<HTMLButtonElement>('lc-password-input button')!;
    return { fixture, element, input, toggle };
  }

  it('masque le texte par défaut et expose les attributs natifs', async () => {
    const { input } = await setup();
    expect(input.type).toBe('password');
    expect(input.value).toBe('secret');
    expect(input.getAttribute('autocomplete')).toBe('current-password');
    expect(input.getAttribute('placeholder')).toBe('••••••••');
    expect(input.getAttribute('aria-label')).toBe('Mot de passe');
  });

  it('bascule affichage et masquage avec aria-pressed, aria-controls, libellé et icône', async () => {
    const { fixture, input, toggle, element } = await setup();
    expect(toggle.type).toBe('button');
    expect(toggle.getAttribute('aria-label')).toBe('Afficher le mot de passe');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(input.id);
    const hiddenIcon = element.querySelector('lc-password-input lc-icon')!.innerHTML;

    toggle.click();
    await fixture.whenStable();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Masquer le mot de passe');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('lc-password-input lc-icon')!.innerHTML).not.toBe(hiddenIcon);

    toggle.click();
    await fixture.whenStable();
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('garde la valeur et la position du curseur au basculement', async () => {
    const { fixture, input, toggle } = await setup();
    input.focus();
    input.setSelectionRange(2, 4);
    toggle.click();
    await fixture.whenStable();
    expect(input.value).toBe('secret');
    expect(fixture.componentInstance.password()).toBe('secret');
  });

  it('lie la valeur dans les deux sens et signale la sortie du champ', async () => {
    const { fixture, input } = await setup();
    input.value = 'nouveau mot de passe';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.password()).toBe('nouveau mot de passe');

    fixture.componentInstance.password.set('depuis le modèle');
    await fixture.whenStable();
    expect(input.value).toBe('depuis le modèle');

    expect(fixture.componentInstance.touched()).toBe(false);
    input.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.touched()).toBe(true);
  });

  it('accepte autocomplete="new-password"', async () => {
    const { fixture, input } = await setup();
    fixture.componentInstance.autocomplete.set('new-password');
    await fixture.whenStable();
    expect(input.getAttribute('autocomplete')).toBe('new-password');
  });

  it('désactive le champ et le bouton, et pose la lecture seule', async () => {
    const { fixture, input, toggle } = await setup();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(input.disabled).toBe(true);
    expect(toggle.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('lc-password-input')!.classList).toContain('lc-field--disabled');

    fixture.componentInstance.disabled.set(false);
    fixture.componentInstance.readonly.set(true);
    await fixture.whenStable();
    expect(input.readOnly).toBe(true);
    expect(toggle.disabled).toBe(false);
  });

  it('prend ses libellés dans LC_LABELS (anglais fourni)', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }],
    });
    const { toggle, fixture } = await setup();
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
  });

  describe('dans lc-form-field avec Signal Forms', () => {
    it('relie le libellé, l\'aide et l\'état requis au champ interne', async () => {
      const fixture = TestBed.createComponent(SignalFormsHostComponent);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const input = element.querySelector<HTMLInputElement>('lc-password-input input')!;
      const label = element.querySelector('label')!;
      const hint = element.querySelector('.lc-form-field__hint')!;
      expect(label.getAttribute('for')).toBe(input.id);
      expect(input.getAttribute('aria-describedby')).toBe(hint.id);
      expect(input.getAttribute('aria-required')).toBe('true');
      expect(input.getAttribute('aria-invalid')).toBeNull();
      expect(input.getAttribute('autocomplete')).toBe('new-password');
    });

    it('affiche l\'erreur après la sortie du champ et alimente le modèle', async () => {
      const fixture = TestBed.createComponent(SignalFormsHostComponent);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const input = element.querySelector<HTMLInputElement>('lc-password-input input')!;
      expect(element.querySelector('.lc-form-field__errors')).toBeNull();

      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
      const errors = element.querySelector('.lc-form-field__errors')!;
      expect(errors.textContent).toContain('Le mot de passe est obligatoire.');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain(errors.id);

      input.value = 'Tr0ub4dor&3-horse';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(fixture.componentInstance.model().password).toBe('Tr0ub4dor&3-horse');
      expect(element.querySelector('.lc-form-field__errors')).toBeNull();
    });
  });
});
