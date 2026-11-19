import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';
import { LC_LOCALE } from '@lionelcointot/ui-angular';
import { LcDateInputComponent } from './date-input.component';
import { LC_DATE_PICKER, type LcDatePickerMode } from './date-picker-mode';

// Tests d'acceptation de la spec 2026-11-selecteur-de-date (T2 : champ à zones, sans bouton ni panneau).
// Écrits depuis la spec : la frappe est simulée par des événements clavier, le collage par l'événement `input`.

@Component({
  imports: [LcDateInputComponent],
  template: `<lc-date-input [(value)]="value" [min]="min()" [max]="max()" [disabled]="disabled()" [readonly]="readonly()" />`,
})
class HostComponent {
  readonly value = signal<string | null>(null);
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
}

@Component({ imports: [FormField, LcDateInputComponent], template: `<lc-date-input [formField]="f.day" />` })
class FormHostComponent {
  readonly model = signal<{ day: string | null }>({ day: null });
  readonly f = form(this.model);
}

const MISSING = 'Date incomplète. Exemple : 12/11/2026';
const UNREADABLE = 'Date non reconnue. Exemple : 12/11/2026';

async function mount<T>(type: new () => T, mode: LcDatePickerMode = 'calendar', locale?: string) {
  TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: mode }] });
  if (locale) TestBed.overrideProvider(LC_LOCALE, { useValue: { locale, currency: 'USD' } });
  const fixture = TestBed.createComponent(type);
  document.body.append(fixture.nativeElement);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input') as HTMLInputElement;
  const settle = () => fixture.whenStable();
  const key = async (name: string, init: KeyboardEventInit = {}) => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }));
    await settle();
  };
  const type_ = async (text: string) => {
    for (const char of text) await key(char);
  };
  const paste = async (text: string) => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  };
  const blur = async () => {
    input.dispatchEvent(new Event('blur'));
    await settle();
  };
  const selected = () => input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
  const message = () =>
    (input.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => (id ? document.getElementById(id)?.textContent?.trim() : undefined))
      .filter((text): text is string => !!text && /Exemple/.test(text));
  const announcement = () => root.querySelector('[aria-live="polite"]')?.textContent?.trim();
  input.focus();
  await settle();
  return { fixture, host: fixture.componentInstance, root, input, key, type: type_, paste, blur, selected, message, announcement, settle };
}

afterEach(() => {
  document.body.innerHTML = '';
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe('CA-1 mode et contrat (partie champ)', () => {
  it('CA-1 : en mode calendrier, un input texte', async () => {
    const { input } = await mount(HostComponent, 'calendar');
    expect(input.type).toBe('text');
  });

  it('CA-1 : en mode natif, un input[type=date] sans bouton', async () => {
    const { input, root } = await mount(HostComponent, 'native');
    expect(input.type).toBe('date');
    expect(root.querySelector('button')).toBeNull();
  });
});

describe('CA-2 mode auto et matchMedia', () => {
  const stub = (impl: unknown) => ((window as { matchMedia?: unknown }).matchMedia = impl);

  it('CA-2 : réponse vraie, mode calendrier, avec la bonne requête', async () => {
    const query = vi.fn((q: string) => ({ matches: true, media: q }));
    stub(query);
    const { input } = await mount(HostComponent, 'auto');
    expect(query).toHaveBeenCalledWith('(pointer: fine) and (hover: hover)');
    expect(input.type).toBe('text');
  });

  it('CA-2 : réponse fausse, mode natif', async () => {
    stub((q: string) => ({ matches: false, media: q }));
    expect((await mount(HostComponent, 'auto')).input.type).toBe('date');
  });

  it('CA-2 : matchMedia absent, mode natif', async () => {
    delete (window as { matchMedia?: unknown }).matchMedia;
    expect((await mount(HostComponent, 'auto')).input.type).toBe('date');
  });

  it('CA-2 : matchMedia qui lève, mode natif', async () => {
    stub(() => {
      throw new Error('boom');
    });
    expect((await mount(HostComponent, 'auto')).input.type).toBe('date');
  });
});

describe('CA-4 frappe', () => {
  it('CA-4 : 1 2 1 1 2 0 2 6 donne 12/11/2026 et 2026-11-12', async () => {
    const { host, input, type } = await mount(HostComponent);
    await type('12112026');
    expect(input.value).toBe('12/11/2026');
    expect(host.value()).toBe('2026-11-12');
  });

  it('CA-4 : 5 dans le jour passe seul au mois ; 3 dans le mois passe seul à l’année', async () => {
    const { type, selected } = await mount(HostComponent);
    expect(selected()).toBe('jj');
    await type('5');
    expect(selected()).toBe('mm');
    await type('3');
    expect(selected()).toBe('aaaa');
  });
});

describe('CA-5 navigation et flèches', () => {
  it('CA-5 : flèche haut sur le jour 31 en janvier donne 1, autres zones inchangées', async () => {
    const { fixture, host, input, key, settle } = await mount(HostComponent);
    host.value.set('2026-01-31');
    await settle();
    input.focus();
    await key('ArrowUp');
    expect(input.value).toBe('01/01/2026');
    expect(fixture.componentInstance.value()).toBe('2026-01-01');
  });

  it('CA-5 : flèche haut sur le mois 12 donne 1, flèche bas sur le mois 1 donne 12', async () => {
    const { host, input, key, settle } = await mount(HostComponent);
    host.value.set('2026-12-05');
    await settle();
    input.focus();
    await key('ArrowRight');
    await key('ArrowUp');
    expect(input.value).toBe('05/01/2026');
    await key('ArrowDown');
    expect(input.value).toBe('05/12/2026');
  });

  it('CA-5 : gauche, droite, /, . et - changent de zone', async () => {
    const { host, input, key, settle, selected } = await mount(HostComponent);
    host.value.set('2026-11-12');
    await settle();
    input.blur();
    input.focus();
    expect(selected()).toBe('12');
    await key('ArrowRight');
    expect(selected()).toBe('11');
    await key('ArrowLeft');
    expect(selected()).toBe('12');
    for (const separator of ['/', '.', '-']) {
      await key('ArrowLeft');
      await key(separator);
      expect(selected()).toBe('11');
    }
    expect(input.value).toBe('12/11/2026');
  });

  it('CA-5 : Retour arrière vide la zone et la valeur devient null', async () => {
    const { host, input, key, settle } = await mount(HostComponent);
    host.value.set('2026-11-12');
    await settle();
    input.focus();
    await key('Backspace');
    expect(input.value).toBe('jj/11/2026');
    expect(host.value()).toBeNull();
  });
});

describe('CA-6 un jour qui n’existe pas ne se saisit pas, sans message', () => {
  it('CA-6 : 31, 02, 2026 donne 28/02/2026, annonce, aucun message, pas d’aria-invalid', async () => {
    const { host, input, type, root, message, announcement } = await mount(HostComponent);
    await type('31022026');
    expect(input.value).toBe('28/02/2026');
    expect(host.value()).toBe('2026-02-28');
    expect(announcement()).toContain('Jour ramené au 28 février.');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(message()).toEqual([]);
    expect(root.textContent).not.toMatch(/Date incomplète|Date non reconnue|n.existe pas/);
  });

  it('CA-6 : 29, 02, 2025 donne 28/02/2025', async () => {
    const { host, input, type } = await mount(HostComponent);
    await type('29022025');
    expect(input.value).toBe('28/02/2025');
    expect(host.value()).toBe('2025-02-28');
  });

  it('CA-6 : 29, 02, 2024 reste le 29', async () => {
    const { host, input, type } = await mount(HostComponent);
    await type('29022024');
    expect(input.value).toBe('29/02/2024');
    expect(host.value()).toBe('2024-02-29');
  });

  it('CA-6 : mois 02 et année 2026 remplis, 2 puis 9 dans le jour laisse 02', async () => {
    const { host, input, type, settle } = await mount(HostComponent);
    host.value.set('2026-02-01');
    await settle();
    input.focus();
    await type('29');
    expect(input.value).toBe('02/02/2026');
    expect(host.value()).toBe('2026-02-02');
    await type('5');
    expect(host.value()).toBe('2026-02-25');
  });

  it('CA-6 : mois 02 rempli, 3 puis 2026 donne 03/02/2026 sans flèche ni Tab', async () => {
    const { host, input, key, type } = await mount(HostComponent);
    await key('ArrowRight');
    await type('02');
    await key('ArrowLeft');
    await key('ArrowLeft');
    await type('32026');
    expect(input.value).toBe('03/02/2026');
    expect(host.value()).toBe('2026-02-03');
  });

  it('CA-6 : 3 puis 1 en avril : le 1 est ignoré, la frappe continue', async () => {
    const { host, input, key, type } = await mount(HostComponent);
    await key('ArrowRight');
    await type('04');
    await key('ArrowLeft');
    await key('ArrowLeft');
    await type('31');
    expect(input.value).toBe('03/04/aaaa');
    await type('02026');
    expect(input.value).toBe('30/04/2026');
    expect(host.value()).toBe('2026-04-30');
  });

  it('CA-6 : « 31/02/2026 » collé donne 28/02/2026', async () => {
    const { host, input, paste } = await mount(HostComponent);
    await paste('31/02/2026');
    expect(input.value).toBe('28/02/2026');
    expect(host.value()).toBe('2026-02-28');
  });

  it('CA-6 : 29/02/2024 puis flèche haut sur l’année donne 28/02/2025', async () => {
    const { host, input, key, settle } = await mount(HostComponent);
    host.value.set('2024-02-29');
    await settle();
    input.focus();
    await key('ArrowRight');
    await key('ArrowRight');
    await key('ArrowUp');
    expect(input.value).toBe('28/02/2025');
    expect(host.value()).toBe('2025-02-28');
  });

  it('CA-6 : 1 puis 3 dans le mois laisse 01', async () => {
    const { input, type } = await mount(HostComponent);
    await type('1213');
    expect(input.value).toMatch(/^12\/01\//);
  });

  it('CA-6 : 0 en premier chiffre de l’année ne s’inscrit pas', async () => {
    const { input, type } = await mount(HostComponent);
    await type('12110');
    expect(input.value).toBe('12/11/aaaa');
  });
});

describe('CA-7 date incomplète à la sortie', () => {
  it('CA-7 : 12/mm/aaaa puis blur : null, aria-invalid, message relié', async () => {
    const { host, input, type, blur, message } = await mount(HostComponent);
    await type('12');
    await blur();
    expect(input.value).toBe('12/mm/aaaa');
    expect(host.value()).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(message()).toEqual([MISSING]);
  });

  it('CA-7 : l’état disparaît quand la date est complète', async () => {
    const { input, type, blur, message } = await mount(HostComponent);
    await type('12');
    await blur();
    input.focus();
    await type('112026');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(message()).toEqual([]);
  });

  it('CA-7 : l’état disparaît quand le champ est vidé', async () => {
    const { input, key, type, blur, message } = await mount(HostComponent);
    await type('12');
    await blur();
    input.focus();
    await key('ArrowLeft');
    await key('Backspace');
    await blur();
    expect(input.value).toBe('jj/mm/aaaa');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(message()).toEqual([]);
  });

  it('CA-7 : sous [formField], le champ du formulaire est invalide avec une erreur de nature parse', async () => {
    const { host, type, blur, input } = await mount(FormHostComponent);
    await type('12');
    await blur();
    const state = host.f.day();
    expect(state.invalid()).toBe(true);
    expect(state.errors().map((e) => e.kind)).toContain('parse');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    input.focus();
    await type('112026');
    expect(host.f.day().invalid()).toBe(false);
    expect(host.model().day).toBe('2026-11-12');
  });
});

describe('CA-8 collage', () => {
  const cases: [string, string][] = [
    ['12/11/2026', '2026-11-12'],
    ['1/2/2026', '2026-02-01'],
    ['01/02/2026', '2026-02-01'],
    ['12.11.2026', '2026-11-12'],
    ['12-11-2026', '2026-11-12'],
    ['2026-11-12', '2026-11-12'],
  ];
  it.each(cases)('CA-8 : « %s » donne %s', async (text, iso) => {
    const { host, paste } = await mount(HostComponent);
    await paste(text);
    expect(host.value()).toBe(iso);
  });

  it.each(['45/11/2026', '12/13/2026'])('CA-8 : « %s » est non reconnu, champ et valeur inchangés', async (text) => {
    const { host, input, paste, message, settle } = await mount(HostComponent);
    host.value.set('2026-03-05');
    await settle();
    await paste(text);
    expect(input.value).toBe('05/03/2026');
    expect(host.value()).toBe('2026-03-05');
    expect(message()).toEqual([UNREADABLE]);
  });

  it('CA-6 : « 31/04/2026 » collé est ramené à 30/04/2026 sans message', async () => {
    const { host, input, paste, message } = await mount(HostComponent);
    await paste('31/04/2026');
    expect(input.value).toBe('30/04/2026');
    expect(host.value()).toBe('2026-04-30');
    expect(message()).toEqual([]);
  });

  it.each(['12/11/26', 'demain'])('CA-8 : « %s » laisse champ et valeur, message jusqu’à la frappe suivante', async (text) => {
    const { host, input, paste, message, key, settle } = await mount(HostComponent);
    host.value.set('2026-03-05');
    await settle();
    input.focus();
    await paste(text);
    expect(input.value).toBe('05/03/2026');
    expect(host.value()).toBe('2026-03-05');
    expect(message()).toEqual([UNREADABLE]);
    await key('ArrowUp');
    expect(message()).toEqual([]);
  });
});

describe('CA-9 locale en-US', () => {
  it('CA-9 : le mois vient d’abord, « 11/12/2026 » collé vaut 2026-11-12', async () => {
    const { host, input, type, paste } = await mount(HostComponent, 'calendar', 'en-US');
    await type('1225');
    expect(input.value).toMatch(/^12\/25\//);
    await paste('11/12/2026');
    expect(host.value()).toBe('2026-11-12');
    expect(input.value).toBe('11/12/2026');
  });
});

describe('CA-10 valeur posée par le code, bornes', () => {
  it('CA-10 : value.set affiche 05/03/2026', async () => {
    const { host, input, settle } = await mount(HostComponent);
    host.value.set('2026-03-05');
    await settle();
    expect(input.value).toBe('05/03/2026');
  });

  it('CA-10 : une date hors min / max tapée est transmise telle quelle', async () => {
    const { host, input, type, settle } = await mount(HostComponent);
    host.min.set('2026-01-01');
    host.max.set('2026-12-31');
    await settle();
    input.focus();
    await type('01012027');
    expect(host.value()).toBe('2027-01-01');
  });
});

describe('CA-11 disabled et readonly (date simple)', () => {
  it('CA-11 : désactivé, ni bouton ni panneau, champ désactivé', async () => {
    const { host, input, root, settle } = await mount(HostComponent);
    host.disabled.set(true);
    await settle();
    expect(input.disabled).toBe(true);
    expect(root.querySelector('button')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('CA-11 : lecture seule, ni bouton ni panneau, zones non modifiables', async () => {
    const { host, input, root, key, settle } = await mount(HostComponent);
    host.value.set('2026-03-05');
    host.readonly.set(true);
    await settle();
    input.focus();
    await key('1');
    await key('ArrowUp');
    await key('Backspace');
    await key('ArrowDown', { altKey: true });
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe('05/03/2026');
    expect(host.value()).toBe('2026-03-05');
    expect(root.querySelector('button')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('touches spéciales : aucun message', () => {
  const noMessage = (m: () => string[]) => expect(m()).toEqual([]);

  it('touche morte, composition et Ctrl + X : aucun message, rien ne change', async () => {
    const { host, input, key, message, settle } = await mount(HostComponent);
    host.value.set('2026-03-05');
    await settle();
    input.blur();
    input.focus();
    await key('Dead');
    await key('Process');
    await key('x', { ctrlKey: true });
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: '^' }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '^' }));
    await settle();
    noMessage(message);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(host.value()).toBe('2026-03-05');
  });

  it('beforeinput insertText (clavier virtuel) : le chiffre s’inscrit, aucun message', async () => {
    const { host, input, message, settle } = await mount(HostComponent);
    for (const data of '12112026') {
      input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true }));
      await settle();
    }
    noMessage(message);
    expect(input.value).toBe('12/11/2026');
    expect(host.value()).toBe('2026-11-12');
  });
});
