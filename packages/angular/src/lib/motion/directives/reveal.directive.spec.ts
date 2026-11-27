import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LcRevealDirective, type LcRevealVariant } from './reveal.directive';
import { LcStaggerDirective } from './stagger.directive';

@Component({
  imports: [LcRevealDirective, LcStaggerDirective],
  template: `
    <p id="plain" lcReveal>plain</p>
    <p id="variant" [lcReveal]="variant()">variant</p>
    <p id="off" [lcReveal]="null">off</p>
    <p id="indexed" lcReveal [lcRevealIndex]="index()">indexed</p>
    <div lcStagger>
      @for (item of items(); track item) {
        <i lcReveal [attr.data-i]="item"></i>
      }
    </div>
  `,
})
class HostComponent {
  readonly variant = signal<LcRevealVariant | ''>('drop');
  readonly index = signal<number | undefined>(undefined);
  readonly items = signal([0, 1, 2]);
}

/** jsdom n'a pas `getAnimations` : `running` simule une animation CSS en cours sur les éléments. */
function setup(running: boolean) {
  if (running) Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [{}] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const rank = (selector: string) => el(selector).style.getPropertyValue('--lc-reveal-rank');
  const end = (target: HTMLElement, animationName: string) => {
    target.dispatchEvent(Object.assign(new Event('animationend', { bubbles: true }), { animationName }));
    fixture.detectChanges();
  };
  return { fixture, el, rank, end };
}

describe('LcRevealDirective', () => {
  afterEach(() => {
    delete (Element.prototype as { getAnimations?: unknown }).getAnimations;
    vi.restoreAllMocks();
  });

  it('pose lc-reveal tant qu\'une animation tourne ; lcReveal vide = rise, sans classe de variante', () => {
    const { el } = setup(true);
    expect(el('#plain').className).toBe('lc-reveal');
  });

  it.each(['drop', 'fade', 'scale', 'pop', 'left', 'right', 'tilt'] as const)('la variante %s ajoute lc-reveal--%s', (variant) => {
    const { fixture, el } = setup(true);
    fixture.componentInstance.variant.set(variant);
    fixture.detectChanges();
    expect(el('#variant').className).toBe(`lc-reveal lc-reveal--${variant}`);
  });

  it('retire la classe à l\'animationend de lc-reveal-in de l\'élément lui-même, pas pour une autre animation ni un descendant', () => {
    const { el, end } = setup(true);
    end(el('#plain'), 'autre');
    expect(el('#plain').classList.contains('lc-reveal')).toBe(true);
    const child = el('#plain').appendChild(document.createElement('span'));
    end(child, 'lc-reveal-in');
    expect(el('#plain').classList.contains('lc-reveal')).toBe(true);
    end(el('#plain'), 'lc-reveal-in');
    expect(el('#plain').className).toBe('');
  });

  it('au premier rendu, sans animation en cours (rendu serveur, animation déjà finie ou coupée), la classe est retirée à la microtâche', async () => {
    const { fixture, el } = setup(false);
    expect(el('#plain').className).toBe('lc-reveal');
    await Promise.resolve();
    fixture.detectChanges();
    expect(el('#plain').className).toBe('');
  });

  it('null désactive l\'entrée : ni classe ni rang', () => {
    const { el, rank } = setup(true);
    expect(el('#off').className).toBe('');
    expect(rank('#off')).toBe('');
  });

  it('lcRevealIndex impose le rang, y compris au-delà du plafond (plafonné en CSS) ; changer l\'index le met à jour', () => {
    const { fixture, rank } = setup(true);
    fixture.componentInstance.index.set(11);
    fixture.detectChanges();
    expect(rank('#indexed')).toBe('11');
    fixture.componentInstance.index.set(2);
    fixture.detectChanges();
    expect(rank('#indexed')).toBe('2');
  });

  it('prend son rang d\'arrivée auprès du lcStagger le plus proche ; hors lcStagger, rang 0', () => {
    const { rank } = setup(true);
    expect(rank('#plain')).toBe('0');
    expect([0, 1, 2].map((i) => rank(`[data-i="${i}"]`))).toEqual(['0', '1', '2']);
  });

  it('un lot de plus tard repart de 0 (la remise à zéro se fait à la microtâche)', async () => {
    const { fixture, rank } = setup(true);
    await Promise.resolve();
    fixture.componentInstance.items.set([0, 1, 2, 3]);
    fixture.detectChanges();
    expect(rank('[data-i="3"]')).toBe('0');
  });

  describe('rendu serveur simulé', () => {
    it('rend l\'élément sans mesure ni animation JavaScript ni lecture de style', () => {
      const animate = vi.fn();
      Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
      const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect');
      const computed = vi.spyOn(window, 'getComputedStyle');
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#plain').textContent).toBe('plain');
      expect(animate).not.toHaveBeenCalled();
      expect(rect).not.toHaveBeenCalled();
      expect(computed).not.toHaveBeenCalled();
      delete (Element.prototype as { animate?: unknown }).animate;
    });
  });
});
