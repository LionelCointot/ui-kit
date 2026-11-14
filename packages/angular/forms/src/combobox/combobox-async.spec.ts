import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcComboboxComponent } from './combobox.component';

interface City {
  readonly code: string;
  readonly name: string;
}

interface PendingSearch {
  readonly text: string;
  readonly signal: AbortSignal;
  resolve(items: readonly City[]): void;
  reject(error: unknown): void;
}

/** Source contrôlée : chaque appel reste en attente jusqu'à `resolve` ou `reject`. */
class FakeSearch {
  readonly calls: PendingSearch[] = [];
  readonly search = (text: string, signal: AbortSignal): Promise<readonly City[]> =>
    new Promise((resolve, reject) => {
      this.calls.push({ text, signal, resolve, reject });
    });
}

@Component({
  imports: [LcComboboxComponent],
  template: `
    <lc-combobox ariaLabel="Commune" [search]="source.search" [displayWith]="display" [trackBy]="key" [debounceMs]="debounce()"
      [(value)]="value" (selectionChange)="changes.push($event)" (searchFailed)="failures.push($event)" />
  `,
})
class AsyncHostComponent {
  private readonly current = signal(new FakeSearch());
  get source(): FakeSearch {
    return this.current();
  }
  replaceSource(next: FakeSearch): void {
    this.current.set(next);
  }
  readonly debounce = signal(0);
  readonly value = signal<City | null>(null);
  readonly changes: (City | null)[] = [];
  readonly failures: unknown[] = [];
  readonly display = (c: City) => c.name;
  readonly key = (c: City) => c.code;
}

const LYON: City = { code: '69123', name: 'Lyon' };
const LIMOGES: City = { code: '87085', name: 'Limoges' };
const LILLE: City = { code: '59350', name: 'Lille' };

describe('LcComboboxComponent (mode asynchrone)', () => {
  let fixture: ComponentFixture<AsyncHostComponent>;
  let host: AsyncHostComponent;
  let input: HTMLInputElement;

  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
  const message = () => document.querySelector('.lc-combobox-panel__message')?.textContent?.trim();

  async function type(text: string): Promise<void> {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  function typeSync(text: string): void {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** Laisse la continuation de la recherche s'exécuter, puis le rendu. */
  async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(AsyncHostComponent);
    host = fixture.componentInstance;
    await fixture.whenStable();
    input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
  });

  afterEach(() => {
    vi.useRealTimers();
    fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((container) => (container.innerHTML = ''));
  });

  describe('ouverture, résultats et recherche', () => {
    it('n\'ouvre pas au focus et attend le nombre minimal de caractères (2 par défaut)', async () => {
      input.focus();
      await fixture.whenStable();
      expect(input.getAttribute('aria-expanded')).toBe('false');
      await type('l');
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(message()).toBe('Saisissez au moins 2 caractères');
      expect(host.source.calls).toHaveLength(0);
    });

    it('affiche les résultats reçus, première proposition active, et sélectionne avec Entrée', async () => {
      input.focus();
      await type('ly');
      expect(host.source.calls.map((call) => call.text)).toEqual(['ly']);
      expect(input.parentElement?.querySelector('lc-spinner')).not.toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(message()).toBe('Recherche en cours');
      host.source.calls[0].resolve([LYON, LIMOGES]);
      await flush();
      expect(options().map((option) => option.textContent?.trim())).toEqual(['Lyon', 'Limoges']);
      expect(input.getAttribute('aria-activedescendant')).toBe(options()[0].id);
      expect(input.parentElement?.querySelector('lc-spinner')).toBeNull();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await fixture.whenStable();
      expect(host.value()).toEqual(LYON);
      expect(input.value).toBe('Lyon');
      expect(host.changes).toEqual([LYON]);
    });

    it('deux frappes rapides : la première recherche est annulée, seule la dernière réponse est affichée', async () => {
      input.focus();
      await type('li');
      await type('lil');
      const [first, second] = host.source.calls;
      expect(first.signal.aborted).toBe(true);
      expect(second.signal.aborted).toBe(false);
      second.resolve([LILLE]);
      await flush();
      first.resolve([LYON, LIMOGES]); // réponse tardive : ignorée
      await flush();
      expect(options().map((option) => option.textContent?.trim())).toEqual(['Lille']);
    });

    it('anti-rebond : une seule recherche pour des frappes rapprochées', async () => {
      host.debounce.set(200);
      await fixture.whenStable();
      input.focus();
      vi.useFakeTimers();
      typeSync('ly');
      await vi.advanceTimersByTimeAsync(100);
      typeSync('lyo');
      expect(host.source.calls).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(200);
      expect(host.source.calls.map((call) => call.text)).toEqual(['lyo']);
    });
  });

  describe('erreurs et états', () => {
    it('état d\'erreur : message, option « Réessayer » au clavier, nouvel appel', async () => {
      input.focus();
      await type('ly');
      host.source.calls[0].reject(new Error('réseau'));
      await flush();
      expect(host.failures).toHaveLength(1);
      expect(message()).toBe('Recherche indisponible pour le moment');
      expect(options().map((option) => option.textContent?.trim())).toEqual(['Réessayer']);
      expect(input.getAttribute('aria-activedescendant')).toBe(options()[0].id);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await fixture.whenStable();
      expect(host.source.calls).toHaveLength(2);
      host.source.calls[1].resolve([LYON]);
      await flush();
      expect(options().map((option) => option.textContent?.trim())).toEqual(['Lyon']);
    });

    it('HTTP 429 : message dédié', async () => {
      input.focus();
      await type('ly');
      host.source.calls[0].reject({ kind: 'rate-limited', status: 429 });
      await flush();
      expect(message()).toBe('Trop de recherches, réessayez dans un instant');
    });

    it('état vide : « Aucun résultat »', async () => {
      input.focus();
      await type('zz');
      host.source.calls[0].resolve([]);
      await flush();
      expect(message()).toBe('Aucun résultat');
    });
  });

  describe('annonce pour les lecteurs d’écran', () => {
    it('annonce le nombre de résultats 500 ms après la recherche, une seule fois', async () => {
      input.focus();
      await fixture.whenStable();
      vi.useFakeTimers();
      typeSync('ly');
      host.source.calls[0].resolve([LYON, LIMOGES]);
      await vi.advanceTimersByTimeAsync(0);
      const live = (fixture.nativeElement as HTMLElement).querySelector('[aria-live="polite"]')!;
      fixture.detectChanges();
      expect(live.textContent).toBe('');
      await vi.advanceTimersByTimeAsync(500);
      fixture.detectChanges();
      expect(live.textContent).toBe('2 résultats disponibles');
    });
  });

  describe('valeur et saisie', () => {
    it('une valeur posée par le code ne déclenche aucune recherche', async () => {
      host.value.set(LYON);
      await fixture.whenStable();
      expect(input.value).toBe('Lyon');
      expect(host.source.calls).toHaveLength(0);
      expect(host.changes).toEqual([]);
    });

    it('saisir un texte différent de la valeur la remet à null', async () => {
      host.value.set(LYON);
      await fixture.whenStable();
      input.focus();
      await type('Lyo');
      expect(host.value()).toBeNull();
      expect(host.changes).toEqual([null]);
      expect(host.source.calls.map((call) => call.text)).toEqual(['Lyo']);
    });

    it('une saisie qui égale une seule proposition reçue est sélectionnée à la sortie', async () => {
      input.focus();
      await type('lyon');
      host.source.calls[0].resolve([LYON, LIMOGES]);
      await flush();
      input.blur();
      await fixture.whenStable();
      expect(host.value()).toEqual(LYON);
    });
  });

  describe('panneau et fonction de recherche', () => {
    it('fermer le panneau annule la recherche en cours', async () => {
      input.focus();
      await type('ly');
      input.blur();
      await fixture.whenStable();
      expect(host.source.calls[0].signal.aborted).toBe(true);
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('une nouvelle fonction search invalide les résultats et relance la recherche si le panneau est ouvert', async () => {
      input.focus();
      await type('ly');
      host.source.calls[0].resolve([LYON]);
      await flush();
      expect(options()).toHaveLength(1);
      const next = new FakeSearch();
      host.replaceSource(next);
      await flush();
      expect(next.calls.map((call) => call.text)).toEqual(['ly']);
    });
  });
  });
