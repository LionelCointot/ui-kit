import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormField, form, required } from '@angular/forms/signals';
import { vi } from 'vitest';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcMessageComposerComponent } from './message-composer.component';

// Acceptation de docs/specs/2026-11-messagerie.md (M0), écrite avant le code : rouge attendu, en attente du code (message-composer.component.ts).
// Le comportement réel (Entrée, dépôt, hauteur, axe, CSP) est dans tools/qa/message-composer-browser.mjs.

@Component({
  imports: [LcFormFieldComponent, LcMessageComposerComponent, FormField],
  template: `
    <lc-form-field label="Votre message" hint="Aide du champ" [state]="f.text()">
      <lc-message-composer [formField]="f.text" />
    </lc-form-field>
  `,
})
class SignalFormsHostComponent {
  readonly model = signal({ text: '' });
  readonly f = form(this.model, (path) => { required(path.text, { message: 'Le message est obligatoire.' }); });
}

@Component({
  imports: [LcMessageComposerComponent],
  template: `<lc-message-composer [(value)]="text" [ariaLabel]="label()" />`,
})
class BareHostComponent {
  readonly text = signal('');
  readonly label = signal<string | undefined>(undefined);
}

describe('CA-C13 : lc-message-composer, contrôle de formulaire', () => {
  it('CA-C13 Signal Forms : le champ suit le modèle dans les deux sens', async () => {
    const fixture = TestBed.createComponent(SignalFormsHostComponent);
    await fixture.whenStable();
    const textarea = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('lc-message-composer textarea')!;
    textarea.value = 'bonjour';
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.model().text).toBe('bonjour');
    fixture.componentInstance.model.set({ text: 'depuis le modèle' });
    await fixture.whenStable();
    expect(textarea.value).toBe('depuis le modèle');
  });

  it('CA-C13 dans lc-form-field : libellé, aide, aria-invalid et erreur après la sortie du champ (touched)', async () => {
    const fixture = TestBed.createComponent(SignalFormsHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const textarea = element.querySelector<HTMLTextAreaElement>('lc-message-composer textarea')!;
    const describedBy = () => (textarea.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent?.trim());
    expect(element.querySelector('label')?.textContent).toContain('Votre message');
    expect(describedBy().some((t) => t?.includes('Aide du champ'))).toBe(true);
    expect(textarea.getAttribute('aria-invalid')).not.toBe('true'); // pas d'erreur avant la sortie du champ
    textarea.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.f.text().touched()).toBe(true);
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(describedBy().some((t) => t?.includes('Le message est obligatoire.'))).toBe(true);
  });

  it('CA-C13 hors lc-form-field sans ariaLabel : avertissement en développement ; avec ariaLabel : aucun', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const sans = TestBed.createComponent(BareHostComponent);
      await sans.whenStable();
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockClear();
      const avec = TestBed.createComponent(BareHostComponent);
      avec.componentInstance.label.set('Message');
      await avec.whenStable();
      expect(warn).not.toHaveBeenCalled();
    } finally { warn.mockRestore(); }
  });

  it('CA-C13 focus() place le focus dans le champ', async () => {
    const fixture = TestBed.createComponent(BareHostComponent);
    fixture.componentInstance.label.set('Message');
    await fixture.whenStable();
    fixture.debugElement.query(By.directive(LcMessageComposerComponent)).componentInstance.focus();
    expect(document.activeElement).toBe((fixture.nativeElement as HTMLElement).querySelector('textarea'));
  });
});
