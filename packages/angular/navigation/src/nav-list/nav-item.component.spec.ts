import { Component, signal } from '@angular/core';
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
  });
});

describe('LcNavListComponent : placement de l\'indicateur', () => {
  @Component({
    imports: [LcNavListComponent, LcNavItemComponent, RouterLink],
    template: `
      <lc-nav-list [collapsed]="collapsed()">
        @if (showSecond()) {
          <a lcNavItem routerLink="/parametres">Paramètres</a>
        }
        <a lcNavItem routerLink="/credit">Crédit</a>
      </lc-nav-list>
    `,
  })
  class PlacementHostComponent {
    readonly collapsed = signal(false);
    readonly showSecond = signal(true);
  }

  class FakeResizeObserver {
    static instances: FakeResizeObserver[] = [];
    readonly observe = vi.fn();
    readonly disconnect = vi.fn();
    constructor(private readonly callback: () => void) {
      FakeResizeObserver.instances.push(this);
    }
    trigger(): void {
      this.callback();
    }
  }

  const routes = [{ path: 'credit', component: BlankComponent }, { path: 'parametres', component: BlankComponent }];
  const rect = (top: number, height: number) => (() => ({ top, bottom: top + height, left: 0, right: 10, width: 10, height }) as DOMRect);

  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(PlacementHostComponent);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const links = Array.from(root.querySelectorAll('a'));
    links[0].getBoundingClientRect = rect(40, 30);
    links[1].getBoundingClientRect = rect(80, 50);
    root.querySelector('lc-nav-list')!.getBoundingClientRect = rect(10, 300);
    const indicator = root.querySelector<HTMLElement>('.lc-nav-list__indicator')!;
    const go = async (url: string) => {
      await TestBed.inject(Router).navigateByUrl(url);
      await fixture.whenStable();
    };
    return { fixture, root, links, indicator, go };
  }

  it('changement d\'élément actif : pas de --instant (glisse), position = haut élément - haut liste + scrollTop', async () => {
    const { root, indicator, go } = await setup();
    root.querySelector('lc-nav-list')!.scrollTop = 5;
    await go('/parametres');
    expect(indicator.style.transform).toBe('translateY(35px)');
    expect(indicator.style.height).toBe('30px');
    await go('/credit');
    expect(indicator.style.transform).toBe('translateY(75px)');
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--instant');
  });

  it('réapparition après masquage : --instant (fondu seul)', async () => {
    const { indicator, go } = await setup();
    await go('/parametres');
    await go('/');
    expect(indicator.classList).toContain('lc-nav-list__indicator--hidden');
    await go('/credit');
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--hidden');
    expect(indicator.classList).toContain('lc-nav-list__indicator--instant');
  });

  it('bascule de collapsed : remesure sans glissement', async () => {
    const { fixture, indicator, go } = await setup();
    await go('/parametres');
    await go('/credit');
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--instant');
    fixture.componentInstance.collapsed.set(true);
    await fixture.whenStable();
    expect(indicator.classList).toContain('lc-nav-list__indicator--instant');
  });

  it('élément dans un groupe replié (ancêtre inert, taille encore non nulle pendant le repli) : indicateur masqué ; déplié : visible', async () => {
    const { links, indicator, go } = await setup();
    await go('/credit');
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--hidden');
    links[1].parentElement!.setAttribute('inert', '');
    FakeResizeObserver.instances[0].trigger();
    expect(indicator.classList).toContain('lc-nav-list__indicator--hidden');
    links[1].parentElement!.removeAttribute('inert');
    FakeResizeObserver.instances[0].trigger();
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--hidden');
  });

  it('ResizeObserver : observe la liste, remesure sans glissement, se déconnecte à la destruction', async () => {
    const { fixture, indicator, go } = await setup();
    await go('/parametres');
    await go('/credit');
    const observer = FakeResizeObserver.instances[0];
    expect(observer.observe).toHaveBeenCalledWith(fixture.nativeElement.querySelector('lc-nav-list'));
    observer.trigger();
    expect(indicator.classList).toContain('lc-nav-list__indicator--instant');
    fixture.destroy();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('ResizeObserver absent : rendu sans erreur', async () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { indicator, go } = await setup();
    await go('/credit');
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--hidden');
  });

  it('élément actif détruit : désenregistré, indicateur masqué', async () => {
    const { fixture, indicator, go } = await setup();
    await go('/parametres');
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--hidden');
    fixture.componentInstance.showSecond.set(false);
    await fixture.whenStable();
    expect(indicator.classList).toContain('lc-nav-list__indicator--hidden');
  });
});
