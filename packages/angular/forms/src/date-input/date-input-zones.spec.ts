import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';
import { LC_LOCALE } from '@lionelcointot/ui-angular';
import { LcDateInputComponent } from './date-input.component';
import { LC_DATE_PICKER } from './date-picker-mode';

@Component({ imports: [LcDateInputComponent], template: `<lc-date-input [(value)]="value" [readonly]="readonly()" />` })
class HostComponent {
  readonly value = signal<string | null>(null);
  readonly readonly = signal(false);
}

@Component({ imports: [FormField, LcDateInputComponent], template: `<lc-date-input [formField]="f.day" />` })
class FormHostComponent {
  readonly model = signal<{ day: string | null }>({ day: null });
  readonly f = form(this.model);
}

describe('lc-date-input, champ à zones (mode calendrier)', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }));

  async function setup(locale?: string) {
    if (locale) TestBed.overrideProvider(LC_LOCALE, { useValue: { locale, currency: 'USD' } });
    const fixture = TestBed.createComponent(HostComponent);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.focus();
    const key = async (name: string) => {
      const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      await fixture.whenStable();
      return event;
    };
    const keys = async (text: string) => {
      for (const char of text) await key(char);
    };
    const selected = () => input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
    return { fixture, host: fixture.componentInstance, input, key, keys, selected };
  }

  it('un champ texte numérique, vide : jj/mm/aaaa avec la première zone sélectionnée', async () => {
    const { input, selected } = await setup();
    expect(input.type).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.hasAttribute('min')).toBe(false);
    expect(input.value).toBe('jj/mm/aaaa');
    expect(selected()).toBe('jj');
  });

  it('la frappe remplit les zones, avance seule, et la valeur est la date ISO dès que tout est rempli', async () => {
    const { host, input, keys, selected } = await setup();
    await keys('1211');
    expect(input.value).toBe('12/11/aaaa');
    expect(host.value()).toBeNull();
    expect(selected()).toBe('aaaa');
    await keys('2026');
    expect(input.value).toBe('12/11/2026');
    expect(host.value()).toBe('2026-11-12');
  });

  it('les flèches changent de zone ou de valeur, Retour arrière vide la zone et la valeur', async () => {
    const { fixture, host, input, key, selected } = await setup();
    host.value.set('2026-01-31');
    await fixture.whenStable();
    input.focus();
    await key('ArrowUp');
    expect(input.value).toBe('01/01/2026');
    await key('ArrowRight');
    expect(selected()).toBe('01');
    await key('ArrowDown');
    expect(input.value).toBe('01/12/2026');
    expect(host.value()).toBe('2026-12-01');
    await key('Backspace');
    expect(input.value).toBe('01/mm/2026');
    expect(host.value()).toBeNull();
  });

  it('un jour qui n’existe pas : ignoré ou ramené, sans message', async () => {
    const { host, input, keys, fixture } = await setup();
    await keys('31022026');
    expect(input.value).toBe('28/02/2026');
    expect(host.value()).toBe('2026-02-28');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(fixture.nativeElement.querySelector('.lc-date-input__message')).toBeNull();
  });

  it('en en-US, le mois vient d’abord', async () => {
    const { host, input, keys } = await setup('en-US');
    expect(input.value).toBe('mm/jj/aaaa');
    await keys('11122026');
    expect(host.value()).toBe('2026-11-12');
  });

  it('sortie du champ avec une date incomplète : valeur null, invalide, aucun texte', async () => {
    const { fixture, host, input, key, keys } = await setup();
    host.value.set('2026-11-12');
    await fixture.whenStable();
    input.focus();
    await key('ArrowRight');
    await key('Backspace');
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(host.value()).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('.lc-date-input__message')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toMatch(/incompl/i);
    expect(input.value).toBe('12/mm/2026');
    expect(fixture.nativeElement.querySelector('lc-date-input').classList).toContain('lc-field--invalid');
    input.focus();
    await keys('12112026');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('un champ entièrement vide ne signale rien à la sortie', async () => {
    const { fixture, input } = await setup();
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('collage : formes lues ; texte illisible laisse champ et valeur, message jusqu’à la frappe suivante', async () => {
    const { fixture, host, input, key } = await setup();
    const paste = async (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    await paste('2026-11-12');
    expect(host.value()).toBe('2026-11-12');
    expect(input.value).toBe('12/11/2026');
    await paste('12/11/26');
    expect(host.value()).toBe('2026-11-12');
    expect(input.value).toBe('12/11/2026');
    expect(fixture.nativeElement.querySelector('.lc-date-input__message').textContent).toBe('Date non reconnue. Exemple : 12/11/2026');
    await key('1');
    expect(fixture.nativeElement.querySelector('.lc-date-input__message')).toBeNull();
  });

  it('une valeur posée par le code remet le texte en forme', async () => {
    const { fixture, host, input } = await setup();
    host.value.set('2026-03-05');
    await fixture.whenStable();
    expect(input.value).toBe('05/03/2026');
  });

  it('lecture seule : les touches ne modifient rien', async () => {
    const { fixture, host, input, keys } = await setup();
    host.readonly.set(true);
    await fixture.whenStable();
    await keys('12');
    expect(input.value).toBe('jj/mm/aaaa');
  });

  it('sous [formField], une erreur de saisie rend le champ du formulaire invalide (nature parse)', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'demain';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const state = fixture.componentInstance.f.day();
    expect(state.invalid()).toBe(true);
    expect(state.errors().map((error) => error.kind)).toEqual(['parse']);
    expect(fixture.nativeElement.querySelector('.lc-date-input__message')).toBeNull();
    input.value = '12/11/2026';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(state.invalid()).toBe(false);
    expect(fixture.componentInstance.model().day).toBe('2026-11-12');
  });

  it('sous [formField], une date incomplète à la sortie : champ invalide (parse) sans texte', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.focus();
    for (const key of '12') input.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    const state = fixture.componentInstance.f.day();
    expect(state.invalid()).toBe(true);
    expect(state.errors().map((error) => [error.kind, error.message])).toEqual([['parse', undefined]]);
    expect(fixture.nativeElement.querySelector('.lc-date-input__message')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('un jour en attente qui affiche une valeur possible émet la valeur tout de suite', async () => {
    const { fixture, host, input, key, keys } = await setup();
    host.value.set('2026-02-15');
    await fixture.whenStable();
    input.focus();
    await key('Backspace');
    expect(host.value()).toBeNull();
    await keys('2');
    expect(input.value).toBe('02/02/2026');
    expect(host.value()).toBe('2026-02-02');
    await keys('5');
    expect(host.value()).toBe('2026-02-25');
  });

  it('composition, touche morte et coupe : texte remis en état, aucun message', async () => {
    const { fixture, host, input, key } = await setup();
    host.value.set('2026-11-12');
    await fixture.whenStable();
    input.focus();
    for (const inputType of ['insertCompositionText', 'insertText', 'deleteByCut']) {
      input.value = '12/11/20é6';
      input.dispatchEvent(new InputEvent('input', { inputType, data: 'é' }));
      await fixture.whenStable();
      expect(input.value).toBe('12/11/2026');
    }
    expect((await key('Dead')).defaultPrevented).toBe(false);
    const cut = new KeyboardEvent('keydown', { key: 'x', ctrlKey: true, cancelable: true });
    input.dispatchEvent(cut);
    expect(cut.defaultPrevented).toBe(true);
    expect(fixture.nativeElement.querySelector('.lc-date-input__message')).toBeNull();
    expect(host.value()).toBe('2026-11-12');
  });

  it('clavier virtuel : un chiffre inséré (beforeinput) vaut une frappe', async () => {
    const { fixture, host, input } = await setup();
    for (const data of '12112026') {
      input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data, cancelable: true }));
      await fixture.whenStable();
    }
    expect(host.value()).toBe('2026-11-12');
  });

  it('un collage de jour au-dessus de 31 est refusé avec le message', async () => {
    const { fixture, host, input } = await setup();
    host.value.set('2026-11-12');
    await fixture.whenStable();
    input.value = '45/11/2026';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(host.value()).toBe('2026-11-12');
    expect(input.value).toBe('12/11/2026');
    expect(fixture.nativeElement.querySelector('.lc-date-input__message[role="alert"]')).not.toBeNull();
  });

  it('reset() du formulaire remet le texte en forme, même si la valeur était déjà null', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.focus();
    for (const key of '12') input.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    await fixture.whenStable();
    expect(input.value).toBe('12/mm/aaaa');
    fixture.componentInstance.f.day().reset();
    await fixture.whenStable();
    expect(input.value).toBe('jj/mm/aaaa');
  });

  it('mode natif : ni classe ni message du champ à zones', async () => {
    TestBed.overrideProvider(LC_DATE_PICKER, { useValue: 'native' });
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement.querySelector('lc-date-input') as HTMLElement;
    expect(el.classList.contains('lc-date-input--calendar')).toBe(false);
    expect(el.querySelector('input')!.type).toBe('date');
  });
});
