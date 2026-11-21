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

  it('libellé déplié : passe à la ligne au lieu d\'être tronqué (texte entier sans survol)', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NavHostComponent);
    await fixture.whenStable();
    const label = getComputedStyle((fixture.nativeElement as HTMLElement).querySelector('.lc-nav-item__label')!);
    expect(label.textOverflow).not.toBe('ellipsis');
    expect(label.whiteSpace).not.toBe('nowrap');
    expect(label.overflowWrap).toBe('anywhere');
  });
});

describe('LcNavItemComponent : indicateur de la liste', () => {
  @Component({
    imports: [LcNavItemComponent, RouterLink],
    template: `<a lcNavItem routerLink="/credit">Crédit</a>`,
  })
  class StandaloneItemComponent {}

  const routes = [{ path: 'credit', component: BlankComponent }, { path: 'parametres', component: BlankComponent }];

  it('dans une liste : l\'élément actif est enregistré, porte lc-nav-item--indicated et l\'indicateur est visible puis prêt', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(NavHostComponent);
    const root = fixture.nativeElement as HTMLElement;
    const indicator = root.querySelector('.lc-nav-list__indicator')!;
    await fixture.whenStable();
    expect(root.querySelector('lc-nav-list')!.classList).toContain('lc-nav-list--ready');
    expect(indicator.classList).toContain('lc-nav-list__indicator--hidden');
    root.querySelectorAll('a').forEach((link) => expect(link.classList).toContain('lc-nav-item--indicated'));
    const link = root.querySelector('a')!;
    link.getBoundingClientRect = () => ({ top: 0, left: 0, right: 10, bottom: 40, width: 10, height: 40 }) as DOMRect;
    await TestBed.inject(Router).navigateByUrl('/credit');
    await fixture.whenStable();
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--hidden');
    expect((indicator as HTMLElement).style.height).toBe('40px');
    await TestBed.inject(Router).navigateByUrl('/parametres');
    await fixture.whenStable();
    expect(indicator.classList).toContain('lc-nav-list__indicator--hidden');
  });

  it('hors liste : pas de lc-nav-item--indicated, le fond actif reste sur l\'élément', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(StandaloneItemComponent);
    await TestBed.inject(Router).navigateByUrl('/credit');
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    expect(link.classList).toContain('lc-nav-item--active');
    expect(link.classList).not.toContain('lc-nav-item--indicated');
    expect(getComputedStyle(link).backgroundColor).not.toBe('');
  });
});
