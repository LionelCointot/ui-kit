import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { LcFlashDirective } from './flash.directive';

@Component({ imports: [LcFlashDirective], template: `<b [lcFlash]="value()">{{ value() }}</b>` })
class HostComponent {
  readonly value = signal(1);
}

describe('LcFlashDirective', () => {
  it('pose la classe lc-flash, ne flashe ni la première valeur ni une même valeur, flashe à chaque changement en annulant le flash précédent', () => {
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel }));
    HTMLElement.prototype.animate = animate as never;
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('b').classList.contains('lc-flash')).toBe(true);
    expect(animate).not.toHaveBeenCalled();
    fixture.componentInstance.value.set(1);
    fixture.detectChanges();
    expect(animate).not.toHaveBeenCalled();
    fixture.componentInstance.value.set(2);
    fixture.detectChanges();
    expect(animate).toHaveBeenCalledTimes(1);
    fixture.componentInstance.value.set(3);
    fixture.detectChanges();
    expect(animate).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledTimes(1);
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
  });
});
