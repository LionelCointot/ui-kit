import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcOption } from '@lionelcointot/ui-angular';
import { LcSegmentedControlComponent } from './segmented-control.component';

type View = 'total' | 'loan' | 'year';

@Component({
  imports: [LcSegmentedControlComponent],
  template: '<lc-segmented-control ariaLabel="Vue" [options]="options" [(value)]="view" />',
})
class SegmentedHostComponent {
  readonly options: readonly LcOption<View>[] = [
    { value: 'total', label: 'Cumul' },
    { value: 'loan', label: 'Par prêt', disabled: true },
    { value: 'year', label: 'Par année', icon: 'calendar' },
  ];
  readonly view = signal<View | null>('total');
}

describe('LcSegmentedControlComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(SegmentedHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const radios = Array.from(element.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    return { fixture, element, radios };
  }

  it('expose un radiogroup nommé et l\'option sélectionnée', async () => {
    const { element, radios } = await setup();
    const group = element.querySelector('lc-segmented-control')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Vue');
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
    expect(radios[1].disabled).toBe(true);
  });

  it('les flèches déplacent focus et sélection en sautant les options désactivées', async () => {
    const { fixture, radios } = await setup();
    radios[0].focus();
    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('year');
    expect(document.activeElement).toBe(radios[2]);
    expect(radios[2].tabIndex).toBe(0);
    radios[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('total');
    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('year');
  });

  it('sélectionne au clic', async () => {
    const { fixture, radios } = await setup();
    radios[2].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('year');
    expect(radios[2].getAttribute('aria-checked')).toBe('true');
  });
});
