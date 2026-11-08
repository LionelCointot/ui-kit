import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcStatusKind } from '@lionelcointot/ui-angular';
import { LcAlertComponent } from './alert.component';

@Component({
  imports: [LcAlertComponent],
  template: `<lc-alert [kind]="kind()" title="Attention" [live]="live()" dismissible (dismissed)="dismissed.set(true)">Taux d'endettement élevé.</lc-alert>`,
})
class AlertHostComponent {
  readonly kind = signal<LcStatusKind>('warning');
  readonly live = signal(true);
  readonly dismissed = signal(false);
}

describe('LcAlertComponent', () => {
  it('porte toujours une icône et un texte, role="alert" pour un avertissement dynamique', async () => {
    const fixture = TestBed.createComponent(AlertHostComponent);
    await fixture.whenStable();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('lc-alert')!;
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.querySelector('lc-icon svg')).not.toBeNull();
    expect(alert.textContent).toContain('Attention');
    expect(alert.textContent).toContain("Taux d'endettement élevé.");
    fixture.componentInstance.kind.set('success');
    await fixture.whenStable();
    expect(alert.getAttribute('role')).toBe('status');
    fixture.componentInstance.live.set(false);
    await fixture.whenStable();
    expect(alert.getAttribute('role')).toBeNull();
  });

  it('se ferme avec le bouton étiqueté « Fermer »', async () => {
    const fixture = TestBed.createComponent(AlertHostComponent);
    await fixture.whenStable();
    const alert = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('lc-alert')!;
    const close = alert.querySelector<HTMLButtonElement>('.lc-alert__close')!;
    expect(close.getAttribute('aria-label')).toBe('Fermer');
    close.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.dismissed()).toBe(true);
    expect(alert.hidden).toBe(true);
  });
});
