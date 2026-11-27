import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { LcAppShellComponent } from './app-shell.component';

type NavMode = 'auto' | 'side' | 'drawer' | 'none';

@Component({
  imports: [LcAppShellComponent],
  template: `
    <lc-app-shell [navMode]="mode()" [(navOpen)]="open" [(navCollapsed)]="collapsed" navLabel="Navigation principale">
      <strong lcShellHeader class="header-payload">En-tête</strong>
      <ul lcShellNav class="nav-payload"><li>Page A</li><li>Page B</li></ul>
      <p class="main-payload">Contenu principal</p>
    </lc-app-shell>
  `,
})
class ShellHostComponent {
  readonly mode = signal<NavMode>('auto');
  readonly open = signal(false);
  readonly collapsed = signal(false);
}

describe('LcAppShellComponent : navMode (D7 : coque sans navigation)', () => {
  // jsdom n'a pas de matchMedia : on pilote la largeur par un faux BreakpointObserver.
  let wide$: BehaviorSubject<BreakpointState>;
  const setWide = (matches: boolean) => wide$.next({ matches, breakpoints: {} });

  async function setup(mode: NavMode = 'auto', wide = true) {
    wide$ = new BehaviorSubject<BreakpointState>({ matches: wide, breakpoints: {} });
    TestBed.configureTestingModule({ providers: [{ provide: BreakpointObserver, useValue: { observe: () => wide$ } }] });
    const fixture = TestBed.createComponent(ShellHostComponent);
    fixture.componentInstance.mode.set(mode);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
    return { fixture, host: fixture.componentInstance, root, q };
  }

  describe('navMode="none"', () => {
    it('CA-D7 : ni <nav>, ni bouton de menu, ni voile, ni tiroir', async () => {
      const { q, root } = await setup('none');
      expect(q('nav')).toBeNull();
      expect(q('.lc-shell__header button')).toBeNull();
      expect(root.querySelector('button')).toBeNull();
      expect(q('.lc-shell__backdrop')).toBeNull();
      expect(q('.lc-shell__nav')).toBeNull();
      expect(root.querySelector('[aria-controls]')).toBeNull();
    });

    it('CA-D7 : même avec navOpen à true (et sur écran étroit), ni <nav>, ni voile, ni bouton', async () => {
      const { fixture, host, q } = await setup('none', false);
      host.open.set(true);
      await fixture.whenStable();
      expect(q('nav')).toBeNull();
      expect(q('.lc-shell__backdrop')).toBeNull();
      expect(q('button')).toBeNull();
      setWide(true);
      await fixture.whenStable();
      expect(q('nav')).toBeNull();
      expect(q('.lc-shell__backdrop')).toBeNull();
    });

    it('CA-D7 : le contenu projeté de [lcShellNav] n\'est pas dans le DOM', async () => {
      const { root } = await setup('none');
      expect(root.querySelector('.nav-payload')).toBeNull();
      expect(root.textContent).not.toContain('Page A');
    });

    it('CA-D7 : l\'en-tête et le contenu principal sont projetés ; <main id="lc-main"> est dans le corps, sans <nav> à côté', async () => {
      const { q } = await setup('none');
      expect(q('header.lc-shell__header .lc-shell__header-content .header-payload')!.textContent).toBe('En-tête');
      const main = q('main#lc-main')!;
      expect(main.querySelector('.main-payload')!.textContent).toBe('Contenu principal');
      expect(main.parentElement!.classList).toContain('lc-shell__body');
      expect(main.parentElement!.children).toHaveLength(1);
      expect(main.getAttribute('tabindex')).toBe('-1');
    });

    it('CA-D7 : le lien d\'évitement est présent et met le focus sur #lc-main', async () => {
      const { q } = await setup('none');
      const skip = q<HTMLAnchorElement>('a.lc-shell__skip')!;
      expect(skip.getAttribute('href')).toBe('#lc-main');
      expect(skip.textContent!.trim()).not.toBe('');
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      skip.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(q('main#lc-main'));
    });
  });

  describe('auto → none → auto : le contenu projeté revient', () => {
    it('CA-D7 : le <nav>, son contenu [lcShellNav] et le bouton de menu reviennent après none', async () => {
      const { fixture, host, q, root } = await setup('auto', true);
      expect(q('nav .nav-payload')).not.toBeNull();
      host.mode.set('none');
      await fixture.whenStable();
      expect(q('nav')).toBeNull();
      expect(root.querySelector('.nav-payload')).toBeNull();
      host.mode.set('auto');
      await fixture.whenStable();
      expect(q('nav')).not.toBeNull();
      expect(Array.from(root.querySelectorAll('nav .nav-payload li')).map((li) => li.textContent)).toEqual(['Page A', 'Page B']);
      const button = q('.lc-shell__header button')!;
      expect(button.getAttribute('aria-controls')).toBe(q('nav')!.id);
    });

    it('CA-D7 : plusieurs allers-retours ne dupliquent ni le <nav>, ni son contenu, ni le contenu principal', async () => {
      const { fixture, host, root } = await setup('auto', false);
      for (const mode of ['none', 'auto', 'none', 'drawer', 'none', 'side'] as const) {
        host.mode.set(mode);
        await fixture.whenStable();
        expect(root.querySelectorAll('nav'), mode).toHaveLength(mode === 'none' ? 0 : 1);
        expect(root.querySelectorAll('.nav-payload'), mode).toHaveLength(mode === 'none' ? 0 : 1);
        expect(root.querySelectorAll('.main-payload'), mode).toHaveLength(1);
        expect(root.querySelectorAll('main'), mode).toHaveLength(1);
        expect(root.querySelectorAll('.header-payload'), mode).toHaveLength(1);
      }
    });

    it('CA-D7 : de none à drawer sur écran étroit, le tiroir s\'ouvre avec son contenu', async () => {
      const { fixture, host, q } = await setup('none', false);
      host.mode.set('drawer');
      await fixture.whenStable();
      q<HTMLButtonElement>('.lc-shell__header button')!.click();
      await fixture.whenStable();
      expect(q('nav')!.classList).toContain('lc-shell__nav--open');
      expect(q('nav .nav-payload')).not.toBeNull();
    });
  });

  describe('non-régression des autres modes', () => {
    it('auto, écran large : navigation latérale, le bouton de menu la réduit et la déploie', async () => {
      const { fixture, host, q } = await setup('auto', true);
      const nav = q('nav')!;
      expect(nav.classList).not.toContain('lc-shell__nav--drawer');
      expect(nav.getAttribute('aria-label')).toBe('Navigation principale');
      expect(q('.lc-shell__backdrop')).toBeNull();
      const button = q<HTMLButtonElement>('.lc-shell__header button')!;
      expect(button.getAttribute('aria-expanded')).toBe('true');
      button.click();
      await fixture.whenStable();
      expect(host.collapsed()).toBe(true);
      expect(nav.classList).toContain('lc-shell__nav--collapsed');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      button.click();
      await fixture.whenStable();
      expect(nav.classList).not.toContain('lc-shell__nav--collapsed');
    });

    it('auto, écran étroit : tiroir fermé, qui s\'ouvre avec voile au clic sur le bouton de menu', async () => {
      const { fixture, host, q } = await setup('auto', false);
      const nav = q('nav')!;
      expect(nav.classList).toContain('lc-shell__nav--drawer');
      expect(nav.classList).not.toContain('lc-shell__nav--open');
      expect(q('.lc-shell__backdrop')).toBeNull();
      const button = q<HTMLButtonElement>('.lc-shell__header button')!;
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(button.getAttribute('aria-controls')).toBe(nav.id);
      button.click();
      await fixture.whenStable();
      expect(host.open()).toBe(true);
      expect(nav.classList).toContain('lc-shell__nav--open');
      expect(q('.lc-shell__backdrop')).not.toBeNull();
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('tiroir : Échap ferme et rend le focus au bouton de menu ; le voile ferme aussi', async () => {
      const { fixture, host, q } = await setup('drawer', true);
      const button = q<HTMLButtonElement>('.lc-shell__header button')!;
      button.click();
      await fixture.whenStable();
      q('nav')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();
      expect(host.open()).toBe(false);
      expect(q('nav')!.classList).not.toContain('lc-shell__nav--open');
      expect(document.activeElement).toBe(button);
      button.click();
      await fixture.whenStable();
      q('.lc-shell__backdrop')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.whenStable();
      expect(host.open()).toBe(false);
      expect(q('.lc-shell__backdrop')).toBeNull();
    });

    it('tiroir ouvert : en-tête et contenu principal inertes, tiroir et voile actifs ; retirés à la fermeture', async () => {
      const { fixture, q } = await setup('drawer', true);
      const header = q('header.lc-shell__header')!;
      const main = q('main#lc-main')!;
      expect(header.hasAttribute('inert')).toBe(false);
      expect(main.hasAttribute('inert')).toBe(false);
      const button = q<HTMLButtonElement>('.lc-shell__header button')!;
      button.click();
      await fixture.whenStable();
      expect(header.hasAttribute('inert')).toBe(true);
      expect(main.hasAttribute('inert')).toBe(true);
      expect(q('nav')!.hasAttribute('inert')).toBe(false);
      expect(q('.lc-shell__backdrop')!.hasAttribute('inert')).toBe(false);
      q('.lc-shell__backdrop')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.whenStable();
      expect(header.hasAttribute('inert')).toBe(false);
      expect(main.hasAttribute('inert')).toBe(false);
      expect(document.activeElement).toBe(button);
    });

    it('navigation latérale (non tiroir) : jamais inerte', async () => {
      const { fixture, host, q } = await setup('side', false);
      host.open.set(true);
      await fixture.whenStable();
      expect(q('header.lc-shell__header')!.hasAttribute('inert')).toBe(false);
      expect(q('main#lc-main')!.hasAttribute('inert')).toBe(false);
    });

    it('side garde la navigation latérale même sur écran étroit ; drawer garde le tiroir même sur écran large', async () => {
      const side = await setup('side', false);
      expect(side.q('nav')!.classList).not.toContain('lc-shell__nav--drawer');
      TestBed.resetTestingModule();
      const drawer = await setup('drawer', true);
      expect(drawer.q('nav')!.classList).toContain('lc-shell__nav--drawer');
    });

    it('le contenu des trois emplacements est projeté dans les modes à navigation', async () => {
      for (const mode of ['auto', 'side', 'drawer'] as const) {
        const { q } = await setup(mode, true);
        expect(q('nav .nav-payload'), mode).not.toBeNull();
        expect(q('.header-payload'), mode).not.toBeNull();
        expect(q('main#lc-main .main-payload'), mode).not.toBeNull();
        TestBed.resetTestingModule();
      }
    });

    it('le lien d\'évitement met aussi le focus sur #lc-main avec navigation', async () => {
      const { q } = await setup('auto', true);
      q<HTMLAnchorElement>('a.lc-shell__skip')!.click();
      expect(document.activeElement).toBe(q('main#lc-main'));
    });
  });

  describe('entrée de l\'en-tête (d05)', () => {
    const header = (root: HTMLElement) => root.querySelector<HTMLElement>('header.lc-shell__header')!;

    it('la classe d\'entrée est posée au premier rendu', async () => {
      const { root } = await setup('auto', true);
      expect(header(root).classList).toContain('lc-shell__header--entering');
    });

    it('elle est retirée à la fin de l\'animation de l\'en-tête, pas à celle d\'un enfant', async () => {
      const { fixture, root } = await setup('auto', true);
      header(root).querySelector('.header-payload')!.dispatchEvent(new Event('animationend', { bubbles: true }));
      await fixture.whenStable();
      expect(header(root).classList).toContain('lc-shell__header--entering');
      header(root).dispatchEvent(new Event('animationend'));
      await fixture.whenStable();
      expect(header(root).classList).not.toContain('lc-shell__header--entering');
    });

    it('elle ne revient pas quand le mode de navigation change', async () => {
      const { fixture, host, root } = await setup('auto', true);
      header(root).dispatchEvent(new Event('animationend'));
      host.mode.set('none');
      await fixture.whenStable();
      host.mode.set('auto');
      await fixture.whenStable();
      expect(header(root).classList).not.toContain('lc-shell__header--entering');
    });
  });
});
