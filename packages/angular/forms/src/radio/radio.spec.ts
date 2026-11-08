import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcRadioGroupComponent } from './radio-group.component';
import { LcRadioDirective } from './radio.directive';

@Component({
  imports: [LcRadioGroupComponent, LcRadioDirective],
  template: `
    <lc-radio-group legend="Type de prêt" orientation="horizontal">
      <label><input type="radio" lcRadio value="a" /> Amortissable</label>
      <label><input type="radio" lcRadio value="b" /> In fine</label>
    </lc-radio-group>
  `,
})
class RadioHostComponent {}

describe('LcRadioGroupComponent', () => {
  it('rend un fieldset avec légende et un name commun aux radios', async () => {
    const fixture = TestBed.createComponent(RadioHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('fieldset legend')!.textContent).toBe('Type de prêt');
    const radios = Array.from(element.querySelectorAll<HTMLInputElement>('input[type=radio]'));
    expect(radios[0].name).toBeTruthy();
    expect(radios[0].name).toBe(radios[1].name);
    expect(radios[0].classList).toContain('lc-radio');
    radios[1].click();
    expect(radios[1].checked).toBe(true);
    expect(radios[0].checked).toBe(false);
  });
});
