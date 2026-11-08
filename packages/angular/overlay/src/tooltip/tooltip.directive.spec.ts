import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcTooltipDirective } from './tooltip.directive';

@Component({ imports: [LcTooltipDirective], template: '<button id="b" lcTooltip="Dupliquer le scénario">Copier</button>' })
class TooltipHostComponent {}

describe('LcTooltipDirective', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  it('apparaît après 500 ms au focus, relié par aria-describedby, disparaît sur Échap', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(TooltipHostComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#b')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(499);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    const tip = document.querySelector('[role="tooltip"]')!;
    expect(tip.textContent).toContain('Dupliquer le scénario');
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(button.getAttribute('aria-describedby')).toBeNull();
  });
});
