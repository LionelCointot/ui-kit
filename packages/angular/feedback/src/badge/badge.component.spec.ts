import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcFillMode, LcThemeColor } from '@lionelcointot/ui-angular';
import { LcBadgeComponent } from './badge.component';

@Component({
  imports: [LcBadgeComponent],
  template: `<lc-badge [themeColor]="color()" [fillMode]="fillMode()">Relief</lc-badge>`,
})
class BadgeHostComponent {
  readonly color = signal<LcThemeColor>('highlight');
  readonly fillMode = signal<LcFillMode>('flat');
}

describe('LcBadgeComponent : rôle highlight (K2)', () => {
  // CA-K2.2
  it.each(['solid', 'flat', 'outline'] as const)('CA-K2.2 : themeColor="highlight" rend le remplissage « %s » avec les classes de variante', async (fillMode) => {
    const fixture = TestBed.createComponent(BadgeHostComponent);
    fixture.componentInstance.fillMode.set(fillMode);
    await fixture.whenStable();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('lc-badge')!;
    expect(badge.classList).toContain('lc-badge');
    expect(badge.classList).toContain('lc-badge--highlight');
    expect(badge.classList).toContain(`lc-badge--${fillMode}`);
    expect(badge.textContent).toBe('Relief');
  });

  it('highlight est distinct des autres rôles (classe propre, pas de repli sur neutral)', async () => {
    const fixture = TestBed.createComponent(BadgeHostComponent);
    await fixture.whenStable();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('lc-badge')!;
    expect(badge.classList).not.toContain('lc-badge--neutral');
    fixture.componentInstance.color.set('success');
    await fixture.whenStable();
    expect(badge.classList).toContain('lc-badge--success');
    expect(badge.classList).not.toContain('lc-badge--highlight');
  });
});
