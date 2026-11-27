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

/** Zone visible de l'indicateur : sa boîte (`top`, `height`) rognée en bas par `clip-path` (bord fixe de la boîte : bas de la liste). */
const visibleZone = (indicator: HTMLElement) => ({
  top: parseFloat(indicator.style.top),
  height: parseFloat(indicator.style.height) - parseFloat(/inset\(\S+ \S+ (\S+) /.exec(indicator.style.clipPath)![1]),
});

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
    expect(visibleZone(indicator as HTMLElement).height).toBe(40);
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
    expect(visibleZone(indicator).top).toBe(35);
    expect(visibleZone(indicator).height).toBe(30);
    await go('/credit');
    expect(visibleZone(indicator).top).toBe(75);
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

describe('LcNavItemComponent : entrée active', () => {
  @Component({
    imports: [LcNavListComponent, LcNavItemComponent, RouterLink],
    template: `
      <lc-nav-list>
        <a lcNavItem routerLink="/credit" [active]="first()">Crédit</a>
        <a lcNavItem routerLink="/parametres" [active]="second()">Paramètres</a>
      </lc-nav-list>
    `,
  })
  class ChosenHostComponent {
    readonly first = signal<boolean | undefined>(undefined);
    readonly second = signal<boolean | undefined>(undefined);
  }

  @Component({
    imports: [LcNavItemComponent, RouterLink],
    template: `<a lcNavItem routerLink="/credit" [active]="on()">Crédit</a>`,
  })
  class StandaloneChosenComponent {
    readonly on = signal<boolean | undefined>(true);
  }

  const routes = [{ path: 'credit', component: BlankComponent }, { path: 'parametres', component: BlankComponent }];

  async function setup() {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(ChosenHostComponent);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const links = Array.from(root.querySelectorAll('a'));
    const indicator = root.querySelector<HTMLElement>('.lc-nav-list__indicator')!;
    links[0].getBoundingClientRect = () => ({ top: 0, left: 0, right: 10, bottom: 40, width: 10, height: 40 }) as DOMRect;
    links[1].getBoundingClientRect = () => ({ top: 50, left: 0, right: 10, bottom: 80, width: 10, height: 30 }) as DOMRect;
    const settle = async () => {
      await fixture.whenStable();
    };
    return { fixture, root, links, indicator, settle };
  }

  it('non définie : l\'URL décide (comportement inchangé)', async () => {
    const { links, indicator, settle } = await setup();
    await TestBed.inject(Router).navigateByUrl('/credit');
    await settle();
    expect(links[0].classList).toContain('lc-nav-item--active');
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--hidden');
  });

  it('définie : seule source, l\'URL est ignorée (vrai, faux, bascule), aria-current unique', async () => {
    const { fixture, links, indicator, settle } = await setup();
    await TestBed.inject(Router).navigateByUrl('/credit');
    fixture.componentInstance.first.set(false);
    fixture.componentInstance.second.set(true);
    await settle();
    expect(links[0].classList).not.toContain('lc-nav-item--active');
    expect(links[0].hasAttribute('aria-current')).toBe(false);
    expect(links[1].classList).toContain('lc-nav-item--active');
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(visibleZone(indicator).height).toBe(30);
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--hidden');
    expect(fixture.nativeElement.querySelectorAll('[aria-current]').length).toBe(1);
    fixture.componentInstance.second.set(false);
    fixture.componentInstance.first.set(true);
    await settle();
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(links[1].hasAttribute('aria-current')).toBe(false);
    expect(visibleZone(indicator).height).toBe(40);
    fixture.componentInstance.first.set(false);
    await settle();
    expect(indicator.classList).toContain('lc-nav-list__indicator--hidden');
    expect(fixture.nativeElement.querySelectorAll('[aria-current]').length).toBe(0);
  });

  it('définie : l\'URL ne pose ni classe ni aria-current sur une entrée à false', async () => {
    const { fixture, links, settle } = await setup();
    fixture.componentInstance.first.set(false);
    await settle();
    await TestBed.inject(Router).navigateByUrl('/credit');
    await settle();
    expect(links[0].classList).not.toContain('lc-nav-item--active');
    expect(links[0].hasAttribute('aria-current')).toBe(false);
  });

  it('hors liste : classe et aria-current suivent active, sans URL active', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(StandaloneChosenComponent);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    expect(link.classList).toContain('lc-nav-item--active');
    expect(link.getAttribute('aria-current')).toBe('page');
    fixture.componentInstance.on.set(false);
    await fixture.whenStable();
    expect(link.classList).not.toContain('lc-nav-item--active');
    expect(link.hasAttribute('aria-current')).toBe(false);
  });

  it('ariaCurrentWhenActive : « page » par défaut, valeur choisie quand actif, absent quand inactif', async () => {
    @Component({
      imports: [LcNavItemComponent, RouterLink],
      template: `<a lcNavItem routerLink="/credit" [active]="on()" [ariaCurrentWhenActive]="kind()">Crédit</a>`,
    })
    class AriaHostComponent {
      readonly on = signal<boolean | undefined>(true);
      readonly kind = signal<'page' | 'location' | 'true'>('true');
    }
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(AriaHostComponent);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    expect(link.getAttribute('aria-current')).toBe('true');
    fixture.componentInstance.kind.set('location');
    await fixture.whenStable();
    expect(link.getAttribute('aria-current')).toBe('location');
    fixture.componentInstance.on.set(false);
    await fixture.whenStable();
    expect(link.hasAttribute('aria-current')).toBe(false);
    // Mode URL : la valeur choisie s'applique aussi.
    fixture.componentInstance.on.set(undefined);
    await TestBed.inject(Router).navigateByUrl('/credit');
    await fixture.whenStable();
    expect(link.getAttribute('aria-current')).toBe('location');
  });

  it('destruction de l\'entrée active : l\'indicateur est masqué', async () => {
    @Component({
      imports: [LcNavListComponent, LcNavItemComponent, RouterLink],
      template: `
        <lc-nav-list>
          @if (shown()) {
            <a lcNavItem routerLink="/credit" [active]="true">Crédit</a>
          }
        </lc-nav-list>
      `,
    })
    class DestroyHostComponent {
      readonly shown = signal(true);
    }
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(DestroyHostComponent);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const indicator = root.querySelector<HTMLElement>('.lc-nav-list__indicator')!;
    root.querySelector('a')!.getBoundingClientRect = () => ({ top: 0, left: 0, right: 10, bottom: 40, width: 10, height: 40 }) as DOMRect;
    fixture.componentInstance.shown.set(false);
    await fixture.whenStable();
    expect(indicator.classList).toContain('lc-nav-list__indicator--hidden');
  });

  it('une entrée passe à false pendant qu\'une autre passe à true : l\'indicateur va sur la nouvelle', async () => {
    const { fixture, links, indicator, settle } = await setup();
    fixture.componentInstance.first.set(true);
    await settle();
    expect(visibleZone(indicator).height).toBe(40);
    fixture.componentInstance.first.set(false);
    fixture.componentInstance.second.set(true);
    await settle();
    expect(indicator.classList).not.toContain('lc-nav-list__indicator--hidden');
    expect(visibleZone(indicator).height).toBe(30);
    expect(links[1].getAttribute('aria-current')).toBe('page');
  });

  it('un changement d\'entrée active ne ré-exécute pas l\'enregistrement des entrées inactives', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(ChosenHostComponent);
    const list = fixture.debugElement.query((d) => d.name === 'lc-nav-list').componentInstance as LcNavListComponent;
    const register = vi.spyOn(list, 'register');
    fixture.componentInstance.first.set(false);
    fixture.componentInstance.second.set(false);
    await fixture.whenStable();
    register.mockClear();
    fixture.componentInstance.first.set(true);
    await fixture.whenStable();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register.mock.calls[0][1]).toBe(true);
  });

  describe('URL égale au lien (RouterLinkActive ne touche plus à l\'attribut)', () => {
    @Component({
      imports: [LcNavItemComponent, RouterLink],
      template: `<a lcNavItem routerLink="/credit" [active]="on()" [ariaCurrentWhenActive]="kind()">Crédit</a>`,
    })
    class UrlHostComponent {
      readonly on = signal<boolean | undefined>(undefined);
      readonly kind = signal<'page' | 'location' | 'true'>('true');
    }

    async function onUrl(on: boolean | undefined) {
      TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
      const fixture = TestBed.createComponent(UrlHostComponent);
      fixture.componentInstance.on.set(on);
      await TestBed.inject(Router).navigateByUrl('/credit');
      await fixture.whenStable();
      return { fixture, link: (fixture.nativeElement as HTMLElement).querySelector('a')! };
    }

    it('active vrai : aria-current = ariaCurrentWhenActive', async () => {
      const { link } = await onUrl(true);
      expect(link.getAttribute('aria-current')).toBe('true');
      expect(link.classList).toContain('lc-nav-item--active');
    });

    it('active faux : ni classe active ni aria-current', async () => {
      const { link } = await onUrl(false);
      expect(link.classList).not.toContain('lc-nav-item--active');
      expect(link.hasAttribute('aria-current')).toBe(false);
    });

    it('mode URL : aria-current = ariaCurrentWhenActive ; routerLinkActiveOptions null : jamais actif', async () => {
      const { fixture, link } = await onUrl(undefined);
      expect(link.getAttribute('aria-current')).toBe('true');
      fixture.componentInstance.kind.set('location');
      await fixture.whenStable();
      expect(link.getAttribute('aria-current')).toBe('location');
    });
  });

  it('routerLinkActiveOptions : sous-page actif par défaut, pas avec exact, jamais avec null', async () => {
    @Component({
      imports: [LcNavItemComponent, RouterLink],
      template: `<a lcNavItem routerLink="/credit" [routerLinkActiveOptions]="options()">Crédit</a>`,
    })
    class OptionsHostComponent {
      readonly options = signal<{ exact: boolean } | null>({ exact: false });
    }
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'credit', children: [{ path: '42', component: BlankComponent }] }])] });
    const fixture = TestBed.createComponent(OptionsHostComponent);
    await TestBed.inject(Router).navigateByUrl('/credit/42');
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    expect(link.getAttribute('aria-current')).toBe('page');
    fixture.componentInstance.options.set({ exact: true });
    await TestBed.inject(Router).navigateByUrl('/credit');
    await TestBed.inject(Router).navigateByUrl('/credit/42');
    await fixture.whenStable();
    expect(link.hasAttribute('aria-current')).toBe(false);
    fixture.componentInstance.options.set(null);
    await TestBed.inject(Router).navigateByUrl('/credit');
    await fixture.whenStable();
    expect(link.hasAttribute('aria-current')).toBe(false);
  });

  it('routerLink modifié sans navigation vers l\'URL courante : l\'entrée devient active', async () => {
    @Component({
      imports: [LcNavItemComponent, RouterLink],
      template: `<a lcNavItem [routerLink]="target()">Crédit</a>`,
    })
    class DynamicLinkHostComponent {
      readonly target = signal('/parametres');
    }
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(DynamicLinkHostComponent);
    await TestBed.inject(Router).navigateByUrl('/credit');
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    expect(link.hasAttribute('aria-current')).toBe(false);
    fixture.componentInstance.target.set('/credit');
    await fixture.whenStable();
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('queryParams modifié sans navigation vers l\'URL courante : l\'entrée devient active', async () => {
    @Component({
      imports: [LcNavItemComponent, RouterLink],
      template: `<a lcNavItem routerLink="/credit" [queryParams]="params()" [routerLinkActiveOptions]="{ exact: true }">Crédit</a>`,
    })
    class QueryLinkHostComponent {
      readonly params = signal<Record<string, string>>({ from: 'a' });
    }
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(QueryLinkHostComponent);
    await TestBed.inject(Router).navigateByUrl('/credit?from=b');
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    expect(link.hasAttribute('aria-current')).toBe(false);
    fixture.componentInstance.params.set({ from: 'b' });
    await fixture.whenStable();
    expect(link.getAttribute('aria-current')).toBe('page');
  });
});
