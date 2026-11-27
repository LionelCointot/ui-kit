import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LcDrawDirective } from './draw.directive';
import { LcFillDirective } from './fill.directive';

/**
 * Acceptation de CA-12 et CA-13 (spec 2026-12-mouvement-v2, T4), partie « rendu initial simulé côté serveur » : seule prouvable sous jsdom.
 * Le mouvement en navigateur est prouvé par `tools/qa/fill-draw-browser.mjs`.
 */
@Component({
  imports: [LcFillDirective, LcDrawDirective],
  template: `
    <div id="fx" [lcFill]="value()"></div>
    <div id="fy" [lcFill]="value()" lcFillAxis="y"></div>
    <svg>
      <path id="dp" [lcDraw]="value()" d="M0 0 H10" />
      <circle id="dc" [lcDraw]="value()" cx="5" cy="5" r="4" />
      <line id="dl" [lcDraw]="value()" x1="0" y1="0" x2="5" y2="5" />
      <polyline id="dy" [lcDraw]="value()" points="0,0 5,5 10,0" />
    </svg>
  `,
})
class HostComponent {
  readonly value = signal(0.7);
}

const FILL = ['#fx', '#fy'];
const DRAW = ['#dp', '#dc', '#dl', '#dy'];

async function render(platform: 'server' | 'browser') {
  const animate = vi.fn();
  const rect = vi.fn(() => new DOMRect());
  const computed = vi.spyOn(window, 'getComputedStyle');
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(rect);
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  return { fixture, el, animate, rect, computed };
}

describe('lcFill et lcDraw : rendu initial côté serveur (CA-12, CA-13)', () => {
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
    vi.restoreAllMocks();
  });

  it('CA-12 --lc-progress vaut la valeur finale dès le premier rendu, sans Element.animate, mesure ni getComputedStyle', async () => {
    const { el, animate, rect, computed } = await render('server');
    for (const id of FILL) expect(el(id).style.getPropertyValue('--lc-progress'), id).toBe('0.7');
    expect(animate).not.toHaveBeenCalled();
    expect(rect).not.toHaveBeenCalled();
    expect(computed).not.toHaveBeenCalled();
  });

  it('CA-13 pathLength vaut 1 et --lc-progress la valeur finale sur path, circle, line et polyline, sans animation ni mesure', async () => {
    const { el, animate, rect, computed } = await render('server');
    for (const id of DRAW) {
      expect(el(id).getAttribute('pathLength'), id).toBe('1');
      expect(el(id).style.getPropertyValue('--lc-progress'), id).toBe('0.7');
    }
    expect(animate).not.toHaveBeenCalled();
    expect(rect).not.toHaveBeenCalled();
    expect(computed).not.toHaveBeenCalled();
  });

  it('CA-12 / CA-13 un changement de valeur côté serveur met à jour --lc-progress sans animer', async () => {
    const { fixture, el, animate } = await render('server');
    fixture.componentInstance.value.set(0.2);
    fixture.detectChanges();
    for (const id of [...FILL, ...DRAW]) expect(el(id).style.getPropertyValue('--lc-progress'), id).toBe('0.2');
    expect(animate).not.toHaveBeenCalled();
  });

  it('CA-12 / CA-13 côté navigateur, --lc-progress est aussi posé dès le premier rendu', async () => {
    const { el } = await render('browser');
    for (const id of [...FILL, ...DRAW]) expect(el(id).style.getPropertyValue('--lc-progress'), id).toBe('0.7');
  });
});
