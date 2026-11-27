import { TestBed } from '@angular/core/testing';
import { LcToastOutletComponent } from './toast-outlet.component';
import { LcToastService } from './toast.service';

describe('LcToastOutletComponent : annonces', () => {
  it('ne porte aucun rôle status ni alert : le LiveAnnouncer du service est le seul mécanisme', () => {
    const fixture = TestBed.createComponent(LcToastOutletComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.lc-toast')).toBeNull();
    TestBed.inject(LcToastService).show({ kind: 'error', message: 'Échec' });
    fixture.detectChanges();
    expect(root.querySelector('.lc-toast')).not.toBeNull();
    expect(root.querySelector('[role="status"], [role="alert"]')).toBeNull();
  });
});
