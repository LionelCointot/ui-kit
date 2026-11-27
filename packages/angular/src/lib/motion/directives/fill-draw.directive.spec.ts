import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LcDrawDirective } from './draw.directive';
import { LcFillDirective } from './fill.directive';

@Component({
  imports: [LcFillDirective, LcDrawDirective],
  template: `
    <div id="fill" [lcFill]="value()"></div>
    <div id="fy" [lcFill]="0.5" lcFillAxis="y"></div>
    <svg><circle id="draw" [lcDraw]="value()" r="4" /></svg>
    <div id="bad" [lcDraw]="1"></div>
  `,
})
class HostComponent {
  readonly value = signal(0.7);
}

describe('lcFill et lcDraw : classes, bornes, avertissement', () => {
  afterEach(() => vi.restoreAllMocks());

  const render = () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    return { fixture, el, warn };
  };

  it('pose les classes et l\'axe y', () => {
    const { el } = render();
    expect(el('fill').classList.contains('lc-fill')).toBe(true);
    expect(el('fill').classList.contains('lc-fill--y')).toBe(false);
    expect(el('fy').classList.contains('lc-fill--y')).toBe(true);
    expect(el('draw').classList.contains('lc-draw')).toBe(true);
  });

  it('borne la valeur entre 0 et 1', () => {
    const { fixture, el } = render();
    for (const [input, expected] of [[2, '1'], [-1, '0'], [NaN, '0']] as const) {
      fixture.componentInstance.value.set(input);
      fixture.detectChanges();
      expect(el('fill').style.getPropertyValue('--lc-progress')).toBe(expected);
      expect(el('draw').style.getPropertyValue('--lc-progress')).toBe(expected);
    }
  });

  it('lcDraw hors SVG : avertit en développement, une seule fois pour l\'élément fautif', () => {
    const { warn } = render();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[lcDraw]');
  });
});
