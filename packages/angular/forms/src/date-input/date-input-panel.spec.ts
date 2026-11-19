import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_LABELS_EN, LC_LABELS, LC_LOCALE } from '@lionelcointot/ui-angular';
import { LcDateInputComponent } from './date-input.component';
import { LC_DATE_PICKER } from './date-picker-mode';

@Component({
  imports: [LcDateInputComponent],
  template: `
    <lc-date-input ariaLabel="Date" [(value)]="value" [min]="min()" [max]="max()" [required]="required()"
      [disabled]="disabled()" [readonly]="readonly()" />
    <button id="other" type="button">autre</button>
  `,
})
class HostComponent {
  readonly value = signal<string | null>(null);
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly required = signal(false);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
}

const panelOf = () => document.querySelector<HTMLElement>('.cdk-overlay-container lc-calendar-panel');

describe('lc-date-input, bouton calendrier et panneau (mode calendrier)', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] }));
  afterEach(() => document.body.replaceChildren());

  async function setup(value: string | null = null, english = false) {
    if (english) {
      TestBed.overrideProvider(LC_LABELS, { useValue: LC_LABELS_EN });
      TestBed.overrideProvider(LC_LOCALE, { useValue: { locale: 'en-US', currency: 'USD' } });
    }
    const fixture = TestBed.createComponent(HostComponent);
    document.body.append(fixture.nativeElement);
    fixture.componentInstance.value.set(value);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const settle = () => fixture.whenStable();
    const input = () => el.querySelector('input')!;
    const button = () => el.querySelector<HTMLButtonElement>('lc-date-input button');
    const host = fixture.componentInstance;
    const open = async () => {
      button()!.click();
      await settle();
    };
    const cell = (iso: string) => panelOf()!.querySelector<HTMLElement>(`td[data-date="${iso}"]`)!;
    return { fixture, el, host, input, button, open, cell, settle };
  }

  it('le bouton se nomme « Choisir une date » sans valeur, « Changer la date, 12 novembre 2026 » avec', async () => {
    const empty = await setup();
    expect(empty.button()!.getAttribute('aria-label')).toBe('Choisir une date');
    expect(empty.button()!.getAttribute('aria-haspopup')).toBe('dialog');
    expect(empty.button()!.getAttribute('aria-expanded')).toBe('false');
    expect(empty.button()!.querySelector('lc-icon')).not.toBeNull();
    empty.host.value.set('2026-11-12');
    await empty.settle();
    expect(empty.button()!.getAttribute('aria-label')).toBe('Changer la date, 12 novembre 2026');
  });

  it('nom du bouton en anglais', async () => {
    const { button } = await setup('2026-11-12', true);
    expect(button()!.getAttribute('aria-label')).toBe('Change date, November 12, 2026');
  });

  it('désactivé ou en lecture seule : pas de bouton, et pas de panneau', async () => {
    const { host, button, settle, input } = await setup();
    host.disabled.set(true);
    await settle();
    expect(button()).toBeNull();
    host.disabled.set(false);
    host.readonly.set(true);
    await settle();
    expect(button()).toBeNull();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, cancelable: true, bubbles: true }));
    await settle();
    expect(panelOf()).toBeNull();
  });

  it('un clic ouvre le panneau sur la valeur, avec le focus sur le jour choisi ; aria-expanded suit', async () => {
    const { button, open, cell } = await setup('2026-11-12');
    expect(panelOf()).toBeNull();
    await open();
    expect(panelOf()!.getAttribute('role')).toBe('dialog');
    expect(button()!.getAttribute('aria-expanded')).toBe('true');
    expect(cell('2026-11-12').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(cell('2026-11-12'));
  });

  it('Alt + flèche bas dans le champ ouvre le panneau', async () => {
    const { input, settle } = await setup();
    input().focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, cancelable: true, bubbles: true });
    input().dispatchEvent(event);
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect(panelOf()).not.toBeNull();
  });

  it('choisir un jour : valeur, texte, panneau fermé, focus au bouton', async () => {
    const { host, input, button, open, cell, settle } = await setup('2026-11-12');
    await open();
    cell('2026-11-20').click();
    await settle();
    expect(host.value()).toBe('2026-11-20');
    expect(input().value).toBe('20/11/2026');
    expect(panelOf()).toBeNull();
    expect(document.activeElement).toBe(button());
    expect(button()!.getAttribute('aria-expanded')).toBe('false');
    expect(button()!.getAttribute('aria-label')).toBe('Changer la date, 20 novembre 2026');
  });

  it('choisir un jour remet en forme un champ à moitié tapé', async () => {
    const { host, input, open, cell, settle } = await setup();
    input().focus();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: '1', cancelable: true }));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: '2', cancelable: true }));
    input().dispatchEvent(new Event('blur'));
    await settle();
    expect(input().value).toBe('12/mm/aaaa');
    await open();
    const target = panelOf()!.querySelector<HTMLElement>('td[data-date]')!;
    target.click();
    await settle();
    expect(host.value()).toBe(target.dataset['date']);
    expect(input().value).toMatch(/^\d\d\/\d\d\/\d{4}$/);
    expect(input().getAttribute('aria-invalid')).toBeNull();
  });

  it('« Effacer la date » met null, remet le champ vide, ferme, focus au bouton ; absent si obligatoire', async () => {
    const { host, input, button, open, settle } = await setup('2026-11-12');
    await open();
    const clear = [...panelOf()!.querySelectorAll('button')].find((b) => b.textContent!.includes('Effacer la date'))!;
    clear.click();
    await settle();
    expect(host.value()).toBeNull();
    expect(input().value).toBe('jj/mm/aaaa');
    expect(panelOf()).toBeNull();
    expect(document.activeElement).toBe(button());
    host.required.set(true);
    await settle();
    await open();
    expect([...panelOf()!.querySelectorAll('button')].some((b) => b.textContent!.includes('Effacer'))).toBe(false);
  });

  it('Échap ferme sans changer la valeur, focus au bouton', async () => {
    const { host, button, open, cell, settle } = await setup('2026-11-12');
    await open();
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
    cell('2026-11-12').dispatchEvent(event);
    await settle();
    expect(panelOf()).toBeNull();
    expect(host.value()).toBe('2026-11-12');
    expect(document.activeElement).toBe(button());
  });

  it('un clic hors du panneau ferme sans changer la valeur ; le focus revient au bouton, sauf si un autre contrôle l’a pris', async () => {
    const { el, host, button, open, settle } = await setup('2026-11-12');
    await open();
    document.body.click();
    await settle();
    expect(panelOf()).toBeNull();
    expect(host.value()).toBe('2026-11-12');
    expect(document.activeElement).toBe(button());
    await open();
    const other = el.querySelector<HTMLButtonElement>('#other')!;
    other.focus();
    other.click();
    await settle();
    expect(panelOf()).toBeNull();
    expect(document.activeElement).toBe(other);
  });

  it('un second clic sur le bouton referme le panneau', async () => {
    const { button, open, settle } = await setup();
    await open();
    expect(panelOf()).not.toBeNull();
    button()!.click();
    await settle();
    expect(panelOf()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  it('une valeur changée par le code panneau ouvert se reflète dans le panneau', async () => {
    const { host, open, cell, settle } = await setup('2026-11-12');
    await open();
    host.value.set('2027-03-05');
    await settle();
    expect(panelOf()!.querySelector('[aria-live]')!.textContent).toBe('mars 2027');
    expect(cell('2027-03-05').getAttribute('aria-selected')).toBe('true');
  });

  it('min et max sont transmis : un jour hors bornes est désactivé et ne se choisit pas', async () => {
    const { host, el, open, cell, settle } = await setup('2026-11-12');
    host.min.set('2026-11-10');
    host.max.set('2026-11-20');
    await settle();
    await open();
    expect(cell('2026-11-09').getAttribute('aria-disabled')).toBe('true');
    cell('2026-11-25').click();
    await settle();
    expect(panelOf()).not.toBeNull();
    expect(host.value()).toBe('2026-11-12');
    expect(el.querySelector('input')!.value).toBe('12/11/2026');
  });

  it('le panneau se ferme quand le champ passe en lecture seule ou est désactivé, sans voler le focus', async () => {
    const { host, open, settle } = await setup('2026-11-12');
    await open();
    host.readonly.set(true);
    await settle();
    expect(panelOf()).toBeNull();
    host.readonly.set(false);
    await settle();
    await open();
    host.disabled.set(true);
    await settle();
    expect(panelOf()).toBeNull();
  });

  it('le panneau est détruit avec le champ', async () => {
    const { fixture, open } = await setup();
    await open();
    fixture.destroy();
    expect(panelOf()).toBeNull();
  });

  it('min postérieur à max, puis value non ISO : aucune exception, un avertissement chacun, champ vide', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { host, input, open, settle } = await setup();
    host.min.set('2026-12-01');
    host.max.set('2026-11-01');
    await settle();
    await open();
    expect(panelOf()).not.toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('postérieur');
    host.value.set('12/11/2026');
    await settle();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(input().value).toBe('jj/mm/aaaa');
    warn.mockRestore();
  });
});
