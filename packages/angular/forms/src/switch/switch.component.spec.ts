import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcSwitchComponent } from './switch.component';

@Component({
  imports: [LcSwitchComponent],
  template: '<button lcSwitch [(checked)]="insurance">Assurance</button>',
})
class SwitchHostComponent {
  readonly insurance = signal(false);
}

describe('LcSwitchComponent', () => {
  it('bascule au clic avec role="switch" et aria-checked', async () => {
    const fixture = TestBed.createComponent(SwitchHostComponent);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-checked')).toBe('false');
    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.insurance()).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');
  });
});
