import { Component, Directive, ElementRef, EnvironmentInjector, createComponent, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LcCountUpDirective } from './count-up.directive';

/** Écrit un texte avant la directive de comptage : ce qu'un rendu serveur hydraté laisse dans l'élément. */
let prefill = false;
@Directive({ selector: '[lcPrefill]' })
class PrefillDirective {
  constructor() { if (prefill) inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.textContent = '1 200,00'; }
}

@Component({ selector: 'lc-count-host', template: '', hostDirectives: [PrefillDirective, { directive: LcCountUpDirective, inputs: ['lcCountUp', 'lcCountUpFormat'] }] })
class HostComponent {}

/** Monte le composant sur un élément qui porte déjà `text` (rendu serveur hydraté), puis fixe la valeur. */
function mount(value: number, prefilled = false) {
  prefill = prefilled;
  const hostElement = document.body.appendChild(document.createElement('span'));
  const ref = createComponent(HostComponent, { hostElement, environmentInjector: TestBed.inject(EnvironmentInjector) });
  ref.setInput('lcCountUp', value);
  ref.changeDetectorRef.detectChanges();
  return { ref, element: hostElement };
}

const FINAL = (1200).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
const ZERO = (0).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

describe('LcCountUpDirective', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('formate la valeur selon le format, entier ou fonction', () => {
    const { ref, element } = mount(5);
    ref.setInput('lcCountUpFormat', 'integer');
    ref.changeDetectorRef.detectChanges();
    vi.advanceTimersByTime(2000);
    expect(element.textContent).toBe('5');
    ref.setInput('lcCountUpFormat', (v: unknown) => `<${v}>`);
    ref.changeDetectorRef.detectChanges();
    expect(element.textContent).toBe('<5>');
  });

  it('texte déjà affiché (hydratation) : aucun recompte, la valeur finale reste en place', () => {
    const { element } = mount(1200, true);
    expect(element.textContent).toBe(FINAL);
    vi.advanceTimersByTime(100);
    expect(element.textContent).toBe(FINAL);
  });

  it('élément vide (première apparition) : démarre à 0 puis monte jusqu\'à la valeur finale', () => {
    const { element } = mount(1200);
    expect(element.textContent).toBe(ZERO);
    vi.advanceTimersByTime(2000);
    expect(element.textContent).toBe(FINAL);
  });
});
