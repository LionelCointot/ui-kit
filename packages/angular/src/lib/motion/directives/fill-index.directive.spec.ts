import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { LcFillDirective } from './fill.directive';

@Component({
  imports: [LcFillDirective],
  template: `<div id="a" [lcFill]="0.5" [lcFillIndex]="3"></div><div id="b" [lcFill]="0.5"></div>`,
})
class HostComponent {}

describe('lcFillIndex : décalage d\'entrée', () => {
  afterEach(() => Reflect.deleteProperty(Element.prototype, 'getAnimations'));

  const rank = (el: HTMLElement) => el.style.getPropertyValue('--lc-fill-rank');

  it('pose le rang à l\'entrée, le retire à la fin de la transition de scale', () => {
    // Une transition tourne : le rang reste jusqu'à sa fin.
    Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [{}] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('#a') as HTMLElement;
    expect(rank(a)).toBe('3');
    expect(rank(fixture.nativeElement.querySelector('#b'))).toBe('1');
    a.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity' }));
    fixture.detectChanges();
    expect(rank(a)).toBe('3');
    a.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'scale' }));
    fixture.detectChanges();
    expect(rank(a)).toBe('');
  });
});
