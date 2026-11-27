import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { LcProgressBarComponent } from './progress-bar.component';

@Component({
  imports: [LcProgressBarComponent],
  template: `<div><lc-progress-bar [value]="80" /><lc-progress-bar [value]="50" /><lc-progress-bar [value]="20" /></div>`,
})
class HostComponent {}

describe('lc-progress-bar : décalage d\'entrée automatique', () => {
  afterEach(() => Reflect.deleteProperty(Element.prototype, 'getAnimations'));

  it('décale les barres sœurs sans entrée de rang', () => {
    Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [{}] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const ranks = [...fixture.nativeElement.querySelectorAll('.lc-progress-bar__fill')].map((el) => (el as HTMLElement).style.getPropertyValue('--lc-fill-rank'));
    expect(ranks).toEqual(['0', '1', '2']);
    const inputs = Object.keys((LcProgressBarComponent as unknown as { ɵcmp: { inputs: object } }).ɵcmp.inputs);
    expect(inputs).not.toContain('rank');
  });
});
