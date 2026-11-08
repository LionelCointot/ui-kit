import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { LcNavItemComponent } from './nav-item.component';
import { LcNavListComponent } from './nav-list.component';

@Component({ template: '' })
class BlankComponent {}

@Component({
  imports: [LcNavListComponent, LcNavItemComponent, RouterLink],
  template: `
    <lc-nav-list>
      <a lcNavItem routerLink="/credit" icon="landmark">Crédit</a>
      <a lcNavItem routerLink="/parametres" icon="settings" badge="2">Paramètres</a>
    </lc-nav-list>
  `,
})
class NavHostComponent {}

describe('LcNavItemComponent', () => {
  it('place aria-current="page" sur le lien actif', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'credit', component: BlankComponent }, { path: 'parametres', component: BlankComponent }])],
    });
    const fixture = TestBed.createComponent(NavHostComponent);
    await TestBed.inject(Router).navigateByUrl('/credit');
    await fixture.whenStable();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(links[0].classList).toContain('lc-nav-item--active');
    expect(links[1].getAttribute('aria-current')).toBeNull();
    await TestBed.inject(Router).navigateByUrl('/parametres');
    await fixture.whenStable();
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(links[1].querySelector('.lc-nav-item__badge')!.textContent).toBe('2');
  });
});
