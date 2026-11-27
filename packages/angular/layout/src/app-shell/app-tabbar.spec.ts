import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, type Routes } from '@angular/router';
import { BehaviorSubject, map } from 'rxjs';
import { LcNavRegistry, type LcNavEntry } from '@lionelcointot/ui-angular';
import { LC_PHONE_QUERY } from '../phone-query';
import { LcAppShellComponent } from './app-shell.component';

@Component({ template: '' })
class PageComponent {}

@Component({
  imports: [LcAppShellComponent],
  template: `
    <lc-app-shell [navMode]="mode()">
      <ul lcShellNav><li>Rubriques</li></ul>
      <p>Contenu</p>
    </lc-app-shell>`,
})
class HostComponent {
  readonly mode = signal<'auto' | 'side' | 'drawer' | 'none'>('auto');
}

const entry = (url: string, label: string, primary = true): LcNavEntry => ({ url, label, icon: 'menu', primary });

describe('LcAppShellComponent : barre d\'onglets (CA-36)', () => {
  const shown: HTMLStyleElement[] = [];
  afterEach(() => {
    document.body.querySelectorAll(':scope > a').forEach((node) => node.remove());
    shown.splice(0).forEach((style) => style.remove());
  });

  // jsdom n'a pas de matchMedia : la largeur pilote un faux BreakpointObserver qui évalue les requêtes min-width / max-width.
  const width$ = new BehaviorSubject(1280);
  const matches = (query: string, width: number) => {
    const bound = Number(/\((?:min|max)-width:\s*([\d.]+)px\)/.exec(query)?.[1]);
    return query.includes('min-width') ? width >= bound : width <= bound;
  };

  async function setup(entries: LcNavEntry[], width = 390, routes: Routes = [{ path: '**', component: PageComponent }]) {
    width$.next(width);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: BreakpointObserver, useValue: { observe: (query: string) => width$.pipe(map((w) => ({ matches: matches(query, w), breakpoints: {} }))) } },
      ],
    });
    const registry = TestBed.inject(LcNavRegistry);
    // Éléments dans le document : le registre les trie par position (des éléments détachés se trieraient sans fin).
    entries.forEach((item) => registry.register(document.body.appendChild(document.createElement('a')), item));
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, router: TestBed.inject(Router), bar: () => root.querySelector<HTMLElement>('lc-app-tabbar nav') };
  }

  const four = [entry('/a', 'A'), entry('/b', 'B'), entry('/c', 'C'), entry('/d', 'D')];

  it('un nav « Navigation principale » avec les rubriques primary puis « Plus »', async () => {
    const { bar } = await setup([...four, entry('/x', 'X', false)]);
    expect(bar()!.getAttribute('aria-label')).toBe('Navigation principale');
    expect([...bar()!.querySelectorAll('.lc-tabbar__label')].map((n) => n.textContent)).toEqual(['A', 'B', 'C', 'D', 'Plus']);
  });

  it('au plus 4 rubriques + « Plus » : une cinquième rubrique primary reste hors de la barre', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { bar } = await setup([...four, entry('/e', 'E')]);
    expect(bar()!.querySelectorAll('.lc-tabbar__tab')).toHaveLength(5);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  const hasRootClass = () => document.documentElement.classList.contains('lc-has-tabbar');

  it('pose la classe lc-has-tabbar sur :root tant que la barre est là (variable lue par le toast), la retire à la destruction', async () => {
    const { fixture } = await setup(four);
    expect(hasRootClass()).toBe(true);
    fixture.destroy();
    expect(hasRootClass()).toBe(false);
  });

  it('sans barre : pas de classe lc-has-tabbar sur :root', async () => {
    await setup([entry('/a', 'A', false)]);
    expect(hasRootClass()).toBe(false);
  });

  it('sans rubrique primary : pas de barre, tiroir actuel', async () => {
    const { bar, root } = await setup([entry('/a', 'A', false)]);
    expect(bar()).toBeNull();
    expect(root.querySelector('.lc-shell__menu')).not.toBeNull();
    expect(root.classList.contains('lc-app-shell--tabbar')).toBe(false);
  });

  it('navMode none ou side : pas de barre', async () => {
    const { fixture, bar } = await setup(four);
    expect(bar()).not.toBeNull();
    for (const mode of ['none', 'side'] as const) {
      fixture.componentInstance.mode.set(mode);
      await fixture.whenStable();
      expect(bar()).toBeNull();
    }
  });

  it('aria-current="page" sur l\'onglet de la page courante, et « Plus » actif hors des onglets', async () => {
    const { fixture, bar, router } = await setup(four);
    await router.navigateByUrl('/b/12');
    await fixture.whenStable();
    const current = [...bar()!.querySelectorAll('[aria-current="page"]')];
    expect(current.map((n) => n.textContent?.trim())).toEqual(['B']);
    expect(bar()!.querySelector('button')!.classList.contains('lc-tabbar__tab--active')).toBe(false);

    await router.navigateByUrl('/parametres');
    await fixture.whenStable();
    expect(bar()!.querySelector('[aria-current]')).toBeNull();
    expect(bar()!.querySelector('button')!.classList.contains('lc-tabbar__tab--active')).toBe(true);
  });

  it('« Plus » ouvre le tiroir existant', async () => {
    const { fixture, root, bar } = await setup(four);
    const more = bar()!.querySelector('button')!;
    expect(more.getAttribute('aria-expanded')).toBe('false');
    more.click();
    await fixture.whenStable();
    expect(root.querySelector('.lc-shell__nav--open')).not.toBeNull();
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(more.getAttribute('aria-controls')).toBe(root.querySelector('.lc-shell__nav')!.id);
    expect(root.querySelector('lc-app-tabbar')!.hasAttribute('inert')).toBe(true);
  });

  // Seuils : l'affichage est une media query CSS (non évaluée par jsdom) ; on lit sa borne dans les feuilles injectées et on l'évalue comme le faux BreakpointObserver.
  const css = () => [...document.querySelectorAll('style')].map((style) => style.textContent).join('');

  it('la barre est masquée par défaut, affichée par une media query dont la borne est celle de LC_PHONE_QUERY', async () => {
    await setup(four);
    expect(css()).toMatch(/\.lc-tabbar[^{]*\{[^}]*display:\s*none/);
    const bounds = [...css().matchAll(/@media \(max-width:\s*([\d.]+)px\)\s*\{\s*\.lc-tabbar[^{]*\{[^}]*display:\s*grid/g)].map((m) => m[1]);
    expect(bounds).toHaveLength(1);
    expect(`(max-width: ${bounds[0]}px)`).toBe(LC_PHONE_QUERY);
  });

  it.each([
    [767, true],
    [768, false],
    [1023, false],
    [1024, false],
  ])('à %i px, la borne de la media query de la barre donne : barre affichée = %s', async (width, shown) => {
    await setup(four, width);
    const bound = /@media \(max-width:\s*([\d.]+)px\)\s*\{\s*\.lc-tabbar/.exec(css())![1];
    expect(matches(`(max-width: ${bound}px)`, width)).toBe(shown);
    expect(matches(LC_PHONE_QUERY, width)).toBe(shown);
  });

  it.each([
    [767, true, true],
    [768, false, true],
    [1023, false, true],
    [1024, false, false],
  ])('à %i px : focus rendu à « Plus » = %s, tiroir = %s', async (width, focusMore, drawer) => {
    const { fixture, root } = await setup(four, width);
    // jsdom applique le `display: none` par défaut de la barre (sa media query n'est pas évaluée) et refuse alors le focus : on la montre.
    const show = document.head.appendChild(document.createElement('style'));
    show.textContent = '.lc-tabbar { display: grid !important; }';
    shown.push(show);
    expect(!!root.querySelector('.lc-shell__menu')).toBe(drawer);
    if (!drawer) return; // ≥ 1024 px : navigation latérale, pas de tiroir à fermer
    (root.querySelector('lc-app-tabbar button') as HTMLButtonElement).click();
    await fixture.whenStable();
    root.querySelector('.lc-shell__nav')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    const expected = focusMore ? root.querySelector('lc-app-tabbar button') : root.querySelector('.lc-shell__menu');
    expect(document.activeElement).toBe(expected);
  });

  describe('avec le bouton retour et la bande du geste (T14)', () => {
    const routes: Routes = [{ path: 'a', title: 'A', children: [{ path: '', component: PageComponent }, { path: 'b', component: PageComponent }] }];

    it('barre, bouton retour et bande cohabitent : la barre est hors de la bande, du titre et de <main>, et un appui sur la bande ne la touche pas', async () => {
      const { fixture, root, router, bar } = await setup([entry('/a', 'A'), ...four.slice(1)], 390, routes);
      await router.navigateByUrl('/a/b');
      await fixture.whenStable();
      const edge = root.querySelector('.lc-shell__edge')!;
      expect(root.querySelector('.lc-shell__back')).not.toBeNull();
      expect(edge).not.toBeNull();
      const tabbar = root.querySelector('lc-app-tabbar')!;
      expect(tabbar.closest('main, header')).toBeNull();
      expect(edge.contains(tabbar)).toBe(false);
      const before = bar()!.outerHTML;
      edge.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await fixture.whenStable();
      expect(bar()!.outerHTML).toBe(before);
      expect(bar()!.querySelector('[aria-current="page"]')!.textContent?.trim()).toBe('A');
    });

    it('à la fermeture du tiroir, le focus va à « Plus » (pas au bouton retour) sur téléphone', async () => {
      const { fixture, root, router } = await setup([entry('/a', 'A'), ...four.slice(1)], 390, routes);
      const show = document.head.appendChild(document.createElement('style'));
      show.textContent = '.lc-tabbar { display: grid !important; }';
      shown.push(show);
      await router.navigateByUrl('/a/b');
      await fixture.whenStable();
      (root.querySelector('lc-app-tabbar button') as HTMLButtonElement).click();
      await fixture.whenStable();
      root.querySelector('.lc-shell__nav')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();
      expect(document.activeElement).toBe(root.querySelector('lc-app-tabbar button'));
    });
  });
});
