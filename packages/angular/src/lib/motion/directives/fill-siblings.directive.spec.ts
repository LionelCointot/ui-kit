import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { LcFillDirective } from './fill.directive';
import { LcRevealDirective } from './reveal.directive';
import { LcStaggerDirective } from './stagger.directive';

@Component({
  imports: [LcFillDirective, LcRevealDirective, LcStaggerDirective],
  template: `
    <div id="mixed" lcStagger>
      <i lcReveal></i><b class="g" [lcFill]="0.5"></b><i lcReveal></i><b class="g" [lcFill]="0.5"></b><b class="g" [lcFill]="0.5" [lcFillIndex]="7"></b>
    </div>
    <div id="containers"><ng-container><b class="g" [lcFill]="0.5"></b><b class="g" [lcFill]="0.5"></b></ng-container><ng-container><b class="g" [lcFill]="0.5"></b></ng-container></div>
    <div id="alone"><b class="g" [lcFill]="0.5"></b></div>
  `,
})
class HostComponent {}

describe('lcFill : décalage automatique entre jauges sœurs', () => {
  afterEach(() => Reflect.deleteProperty(Element.prototype, 'getAnimations'));

  const css = (el: Element, name: string) => (el as HTMLElement).style.getPropertyValue(name);

  it('numérote les jauges d\'un même parent sans consommer de rang de carte, et laisse lcFillIndex prévaloir', () => {
    Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [{}] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect([...root.querySelectorAll('#mixed .g')].map((el) => css(el, '--lc-fill-rank'))).toEqual(['0', '1', '7']);
    expect([...root.querySelectorAll('#mixed i')].map((el) => css(el, '--lc-reveal-rank'))).toEqual(['0', '1']);
    expect(css(root.querySelector('#alone .g')!, '--lc-fill-rank')).toBe('0');
  });

  it('dans un ng-container, une cascade par conteneur (le parent du gabarit est le commentaire du conteneur)', () => {
    Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [{}] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('#containers .g')].map((el) => css(el, '--lc-fill-rank'))).toEqual(['0', '1', '0']);
  });
});
