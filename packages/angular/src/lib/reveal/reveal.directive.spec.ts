import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcRevealDirective } from './reveal.directive';

@Component({ imports: [LcRevealDirective], template: `<div lcReveal [lcRevealIndex]="index()"></div>` })
class HostComponent {
  readonly index = signal(0);
}

describe('LcRevealDirective', () => {
  function indexFor(value: number): string {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.index.set(value);
    fixture.detectChanges();
    return (fixture.nativeElement.firstElementChild as HTMLElement).style.getPropertyValue('--lc-reveal-index');
  }

  afterEach(() => vi.restoreAllMocks());

  it('pose --lc-reveal-index et la plafonne à 7', () => {
    expect([0, 3, 7, 12].map(indexFor)).toEqual(['0', '3', '7', '7']);
  });

  it.each([-1, 1.5, Number.NaN])('index invalide %s : 0 et avertissement en développement', (value) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(indexFor(value)).toBe('0');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
