import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LcFlipDirective } from './flip.directive';

@Component({
  imports: [LcFlipDirective],
  template: `
    <ul [lcFlip]="items()">
      @for (item of items(); track item) {
        <li [attr.data-k]="item" [class.lc-leave]="leaving() === item">{{ item }}</li>
      }
    </ul>
  `,
})
class HostComponent {
  readonly items = signal<readonly string[]>(['a', 'b', 'c']);
  readonly leaving = signal('');
}

/** Mise en page simulée : chaque enfant a 10 px de haut, empilés dans l'ordre du DOM (la position se lit dans l'état courant du DOM). */
function layout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return { top: 10 * [...(this.parentElement?.children ?? [])].indexOf(this) } as DOMRect;
  });
}

describe('LcFlipDirective', () => {
  const animate = vi.fn<(keyframes: Keyframe[]) => Animation>();
  const cancel = vi.fn();

  beforeEach(() => {
    animate.mockReset().mockImplementation(() => ({ cancel }) as unknown as Animation);
    cancel.mockReset();
    (Element.prototype as { animate?: unknown }).animate = animate;
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => ({ '--lc-list-move-duration': '420ms', '--lc-list-move-easing': 'ease' })[name] ?? '' }));
    layout();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  };
  const moved = () => animate.mock.contexts.map((el) => (el as HTMLElement).dataset['k']);
  const offsets = () => animate.mock.calls.map(([keyframes]) => keyframes[0]['transform']);

  it('le premier rendu n\'anime rien', () => {
    setup();
    expect(animate).not.toHaveBeenCalled();
  });

  it('un tri anime les seuls éléments qui changent de place, de leur ancienne à leur nouvelle place', () => {
    const fixture = setup();
    fixture.componentInstance.items.set(['c', 'b', 'a']);
    fixture.detectChanges();
    expect(moved()).toEqual(['c', 'a']);
    expect(offsets()).toEqual(['translateY(20px)', 'translateY(-20px)']);
  });

  it('un élément ajouté n\'est pas animé par lcFlip, ceux qu\'il pousse le sont', () => {
    const fixture = setup();
    fixture.componentInstance.items.set(['x', 'a', 'b', 'c']);
    fixture.detectChanges();
    expect(moved()).toEqual(['a', 'b', 'c']);
    expect(new Set(offsets())).toEqual(new Set(['translateY(-10px)']));
  });

  it('un deuxième changement annule les glissements en cours avant de relire', () => {
    const fixture = setup();
    fixture.componentInstance.items.set(['c', 'b', 'a']);
    fixture.detectChanges();
    expect(cancel).not.toHaveBeenCalled();
    fixture.componentInstance.items.set(['a', 'b', 'c']);
    fixture.detectChanges();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('un enfant sortant (.lc-leave) n\'est pas suivi ; son retrait fait glisser les suivants', async () => {
    const fixture = setup();
    fixture.componentInstance.leaving.set('b'); // b est encore dans le DOM (sortie en cours) : le @for le garde
    fixture.componentInstance.items.set(['a', 'b', 'c']);
    fixture.detectChanges();
    expect(animate).not.toHaveBeenCalled(); // b sort encore sur place : rien ne bouge
    fixture.nativeElement.querySelector('[data-k="b"]')?.remove();
    await new Promise((resolve) => setTimeout(resolve));
    expect(moved()).toEqual(['c']);
    expect(offsets()).toEqual(['translateY(10px)']);
  });

  it('sous mouvement réduit : aucune animation', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const fixture = setup();
    fixture.componentInstance.items.set(['c', 'b', 'a']);
    fixture.detectChanges();
    expect(animate).not.toHaveBeenCalled();
  });
});
