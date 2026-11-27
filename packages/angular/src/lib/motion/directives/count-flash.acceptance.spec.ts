import { Component, NO_ERRORS_SCHEMA, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as kit from '@lionelcointot/ui-angular';

// Acceptation de docs/specs/2026-12-mouvement-v2.md, T5 : CA-14 (rendu serveur simulé, compteur piloté par une horloge fictive, ARIA, annulation) et CA-3 (valeur finale sous mouvement réduit).
// Le mouvement réel (rAF du navigateur, durées, flash) est prouvé par `node tools/qa/count-flash-browser.mjs`. Les directives sont lues par espace de noms : un export absent fait échouer ce fichier, pas la compilation de toute la suite.
// Textes attendus : calculés par Intl (fr-FR, EUR), comme LcFormatService (number = 2 décimales).
const exported = kit as unknown as Record<string, never>;
const intl = (value: number, options: Intl.NumberFormatOptions) => new Intl.NumberFormat('fr-FR', options).format(value);
const TWO = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const NUMBER = (v: number) => intl(v, TWO);
const num = (text: string) => parseFloat(text.replace(/[^\d,.-]/g, '').replace(',', '.'));

/** `NO_ERRORS_SCHEMA` + `overrideComponent` : la directive est ajoutée à l'exécution, la suite compile même sans elle. */
@Component({
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <span id="plain" data-sample [lcCountUp]="value()"></span>
    <span id="money" [lcCountUp]="1850" lcCountUpFormat="money"></span>
    <span id="int" [lcCountUp]="1850" lcCountUpFormat="integer"></span>
    <span id="pct" [lcCountUp]="12" lcCountUpFormat="percent"></span>
    <span id="fn" [lcCountUp]="3" [lcCountUpFormat]="fmt"></span>
  `,
})
class CountHostComponent {
  readonly value = signal(1200);
  readonly fmt = (v: unknown) => `<${v}>`;
}

/** `created` : appelé entre la création et le premier rendu (le planificateur d'Angular 22 sans zone appelle rAF dès la création, hors directive). */
function render(created?: () => void) {
  expect(exported['LcCountUpDirective'], 'LcCountUpDirective n\'est pas exportée par @lionelcointot/ui-angular').toBeDefined();
  TestBed.overrideComponent(CountHostComponent, { add: { imports: [exported['LcCountUpDirective']] } });
  const fixture = TestBed.createComponent(CountHostComponent);
  created?.();
  fixture.detectChanges();
  const text = (id: string) => (fixture.nativeElement.querySelector(`#${id}`) as HTMLElement).textContent;
  return { fixture, text };
}

describe('API publique (§5.1)', () => {
  it('@lionelcointot/ui-angular exporte LcCountUpDirective et LcFlashDirective', () => {
    expect(exported['LcCountUpDirective']).toBeDefined();
    expect(exported['LcFlashDirective']).toBeDefined();
  });
});

describe('CA-14 : rendu initial côté serveur', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('le texte final de chaque format est dans le premier rendu, sans rAF ni mesure', () => {
    const { text } = render(() => vi.mocked(requestAnimationFrame).mockClear());
    expect(text('plain')).toBe(NUMBER(1200));
    expect(text('money')).toBe(intl(1850, { style: 'currency', currency: 'EUR' }));
    expect(text('int')).toBe(intl(1850, { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    expect(text('pct')).toBe(new Intl.NumberFormat('fr-FR', { style: 'percent', ...TWO }).format(0.12));
    expect(text('fn')).toBe('<3>');
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});

describe('CA-14, CA-3 : compteur côté navigateur (horloge fictive)', () => {
  const reduced = (on: boolean) => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: on })));
  beforeEach(() => vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] }));
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  /** Texte de `#plain` toutes les 16 ms pendant `ms`. */
  const sampled = (fixture: ReturnType<typeof render>['fixture'], ms: number) => {
    const out: string[] = [];
    for (let t = 0; t < ms; t += 16) {
      vi.advanceTimersByTime(16);
      out.push((fixture.nativeElement.querySelector('#plain') as HTMLElement).textContent);
    }
    return out;
  };

  it('première apparition : compte de 0 à la valeur, monotone, fin exacte', async () => {
    reduced(false);
    const { fixture } = render();
    await fixture.whenStable();
    const texts = sampled(fixture, 1500);
    const values = texts.map(num);
    expect(values[0]).toBeLessThan(600);
    expect(values.every((v, i) => i === 0 || v >= values[i - 1])).toBe(true);
    expect(new Set(texts).size).toBeGreaterThan(5);
    expect(texts.at(-1)).toBe(NUMBER(1200));
  });

  it('changement : de l\'ancienne à la nouvelle valeur, sans repasser par 0', async () => {
    reduced(false);
    const { fixture } = render();
    await fixture.whenStable();
    sampled(fixture, 1500);
    fixture.componentInstance.value.set(1850);
    fixture.detectChanges();
    const texts = sampled(fixture, 1500);
    const values = texts.map(num);
    expect(values.every((v, i) => v >= 1200 && (i === 0 || v >= values[i - 1]))).toBe(true);
    expect(new Set(texts).size).toBeGreaterThan(5);
    expect(texts.at(-1)).toBe(NUMBER(1850));
  });

  it('n\'ajoute aucun attribut ARIA ni région aria-live', async () => {
    reduced(false);
    const { fixture } = render();
    await fixture.whenStable();
    sampled(fixture, 1500);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('[aria-live], [role], [aria-atomic], [aria-busy]').length).toBe(0);
  });

  it('destruction en plein compte : cancelAnimationFrame appelé avec un rAF en attente, plus aucune écriture', async () => {
    reduced(false);
    const ids = new Set<number>();
    const requested = window.requestAnimationFrame.bind(window);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = requested((t) => { ids.delete(id); cb(t); }); ids.add(id); return id; });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const { fixture } = render();
    await fixture.whenStable();
    sampled(fixture, 300);
    const pending = [...ids];
    expect(pending.length).toBeGreaterThan(0);
    const el = fixture.nativeElement.querySelector('#plain') as HTMLElement;
    fixture.destroy();
    expect(cancel.mock.calls.some(([id]) => pending.includes(id))).toBe(true);
    const frozen = el.textContent;
    vi.advanceTimersByTime(1500);
    expect(el.textContent).toBe(frozen);
  });

  it('CA-3 mouvement réduit : valeur finale dès le premier rendu et au changement, aucune valeur intermédiaire', async () => {
    reduced(true);
    const { fixture } = render();
    await fixture.whenStable();
    const first = sampled(fixture, 1500);
    expect(new Set(first)).toEqual(new Set([NUMBER(1200)]));
    fixture.componentInstance.value.set(1850);
    fixture.detectChanges();
    await fixture.whenStable();
    const second = sampled(fixture, 1500);
    expect(new Set(second)).toEqual(new Set([NUMBER(1850)]));
  });
});
