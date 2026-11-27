import { TestBed } from '@angular/core/testing';
import { LcToastOutletComponent } from './toast-outlet.component';
import { LcToastService } from './toast.service';

describe('LcToastOutletComponent : région d\'annonce', () => {
  it('est dans le DOM avant le premier toast, et un toast d\'erreur porte role="alert"', () => {
    const fixture = TestBed.createComponent(LcToastOutletComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="status"]')).not.toBeNull();
    expect(root.querySelector('.lc-toast')).toBeNull();
    TestBed.inject(LcToastService).show({ kind: 'error', message: 'Échec' });
    TestBed.inject(LcToastService).show({ kind: 'success', message: 'Ok' });
    fixture.detectChanges();
    expect([...root.querySelectorAll('.lc-toast')].map((el) => el.getAttribute('role'))).toEqual(['alert', null]);
  });
});
