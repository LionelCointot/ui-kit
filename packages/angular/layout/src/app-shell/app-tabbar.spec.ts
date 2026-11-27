import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject, map } from 'rxjs';
import { LcNavRegistry, type LcNavEntry } from '@lionelcointot/ui-angular';
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
  afterEach(() => document.body.querySelectorAll(':scope > a').forEach((node) => node.remove()));

  // jsdom n'a pas de matchMedia : la largeur pilote un faux BreakpointObserver qui évalue les requêtes min-width / max-width.
  const width$ = new BehaviorSubject(1280);
  const matches = (query: string, width: number) => {
    const bound = Number(/\((?:min|max)-width:\s*([\d.]+)px\)/.exec(query)?.[1]);
    return query.includes('min-width') ? width >= bound : width <= bound;
  };

  async function setup(entries: LcNavEntry[], width = 390) {
    width$.next(width);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: PageComponent }]),
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

  // Seuils : l'affichage de la barre est une media query CSS (non évaluée par jsdom) ; le TypeScript ne dépend de la largeur que pour le tiroir et le focus rendu.
  it('la barre est masquée par défaut et affichée sous 768 px par media query CSS (767 / 768)', async () => {
    await setup(four);
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('');
    expect(css).toMatch(/\.lc-tabbar[^{]*\{[^}]*display:\s*none/);
    expect(css).toMatch(/@media \(max-width: 767\.98px\)\s*\{\s*\.lc-tabbar[^{]*\{[^}]*display:\s*grid/);
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
    expect(!!root.querySelector('.lc-shell__menu')).toBe(drawer);
    if (!drawer) return; // ≥ 1024 px : navigation latérale, pas de tiroir à fermer
    (root.querySelector('lc-app-tabbar button') as HTMLButtonElement).click();
    await fixture.whenStable();
    root.querySelector('.lc-shell__nav')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    const expected = focusMore ? root.querySelector('lc-app-tabbar button') : root.querySelector('.lc-shell__menu');
    expect(document.activeElement).toBe(expected);
    show.remove();
  });
});
