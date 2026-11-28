import { BreakpointObserver } from '@angular/cdk/layout';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, type Routes } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { LcAppShellComponent } from '../app-shell/app-shell.component';

// Logique de la copie et du sens, sous jsdom avec `Element.animate` simulé (les durées et le rendu réel sont dans tools/qa/page-transitions-browser.mjs).
@Component({ template: '<h1 tabindex="-1">Page A</h1><input id="champ" name="champ"><audio id="son" autoplay></audio>' })
class PageA {}
@Component({ template: '<h1 tabindex="-1">Page B</h1>' })
class PageB {}
const routes: Routes = [
  { path: 'a', component: PageA },
  { path: 'a/b', component: PageB },
  { path: 'c', component: PageB },
];

@Component({
  imports: [LcAppShellComponent, RouterOutlet],
  template: '<lc-app-shell navMode="none"><router-outlet /></lc-app-shell>',
})
class Host {}

interface Played { target: Element; keyframes: Keyframe[]; finish: () => void }

describe('lcPageTransitions : copie figée et sens', () => {
  let played: Played[];
  let pause: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    played = [];
    (Element.prototype as { animate?: unknown }).animate = function (this: Element, keyframes: Keyframe[]) {
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => { finish = resolve; });
      played.push({ target: this, keyframes, finish });
      return { finished, cancel() {}, playState: 'running' };
    };
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.documentElement.style.setProperty('--lc-page-exit-offset', '16px');
    document.documentElement.style.setProperty('--lc-page-enter-offset', '26px');
    for (const [name, value] of Object.entries({ '--lc-page-stack-duration': '300ms', '--lc-page-stack-easing': 'ease', '--lc-page-stack-recede': '30%' })) document.documentElement.style.setProperty(name, value);
  });
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
    document.documentElement.removeAttribute('style');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideLocationMocks(), { provide: BreakpointObserver, useValue: { observe: () => new BehaviorSubject({ matches: true, breakpoints: {} }) } }],
    });
    const fixture = TestBed.createComponent(Host);
    const router = TestBed.inject(Router);
    const root = fixture.nativeElement as HTMLElement;
    const destroy = () => fixture.destroy();
    const go = async (url: string) => { await router.navigateByUrl(url); await fixture.whenStable(); fixture.detectChanges(); await new Promise((resolve) => setTimeout(resolve, 20)); };
    return { root, go, destroy };
  }
  const translateOf = (animation: Played, index: number) => String(animation.keyframes[index]['translate']);

  it('la copie est inert, aria-hidden, sans id ni name, médias mis en pause sans lecture automatique, et elle est retirée à la fin de sa sortie', async () => {
    const { root, go } = await setup();
    await go('/a');
    await go('/a/b');
    const copy = root.querySelector<HTMLElement>('[data-lc-page-copy]')!;
    expect(copy.hasAttribute('inert')).toBe(true);
    expect(copy.getAttribute('aria-hidden')).toBe('true');
    expect(copy.style.position).toBe('fixed');
    expect(copy.querySelector('h1')?.textContent).toBe('Page A');
    expect(copy.querySelectorAll('[id], [name]').length).toBe(0);
    expect(copy.querySelector('audio')?.hasAttribute('autoplay')).toBe(false);
    expect(pause).toHaveBeenCalled();
    played.find((animation) => copy.contains(animation.target))!.finish();
    await Promise.resolve();
    expect(root.querySelector('[data-lc-page-copy]')).toBeNull();
  });

  it('avancer : la sortie finit à -exit-offset, l\'entrée part de +enter-offset ; reculer : l\'inverse', async () => {
    const { root, go } = await setup();
    await go('/a');
    await go('/a/b');
    const exit = played.find((animation) => root.querySelector('[data-lc-page-copy]')!.contains(animation.target))!;
    const enter = played.find((animation) => !root.querySelector('[data-lc-page-copy]')!.contains(animation.target))!;
    expect([translateOf(exit, 1), translateOf(enter, 0)]).toEqual(['-16px 0', '26px 0']);
    played.length = 0;
    await go('/a');
    expect([translateOf(played[1], 1), translateOf(played[0], 0)].sort()).toEqual(['-26px 0', '16px 0']);
  });

  it('même niveau sans ordre connu (fondu) : opacité seule, sans translate', async () => {
    const { go } = await setup();
    await go('/a');
    await go('/c');
    expect(played.length).toBeGreaterThan(0);
    expect(played.every((animation) => animation.keyframes.every((keyframe) => !('translate' in keyframe)))).toBe(true);
  });

  it('sans copie à jouer (même chemin, ?query) : rien ne s\'anime', async () => {
    const { go } = await setup();
    await go('/a');
    played.length = 0;
    await go('/a?x=1');
    expect(played.length).toBe(0);
  });

  it('téléphone (stack) : le voile finit à page.stack-dim, au-dessus de la page courante ; la page quittée est sous la nouvelle', async () => {
    document.documentElement.style.setProperty('--lc-page-stack-dim', '0.12');
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') }));
    const { root, go } = await setup();
    await go('/a');
    await go('/a/b');
    const veil = root.querySelector<HTMLElement>('[data-lc-page-veil]')!;
    const dim = played.find((animation) => animation.target === veil)!;
    expect(dim.keyframes).toEqual([{ opacity: 0 }, { opacity: 0.12 }]);
    expect(veil.style.zIndex).toBe('2');
    expect(root.querySelector<HTMLElement>('[data-lc-page-copy]')!.style.zIndex).toBe('1');
  });

  it('rafale : une nouvelle navigation retire les copies et le voile de la précédente', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') }));
    const { root, go } = await setup();
    await go('/a');
    await go('/a/b');
    await go('/a');
    expect(root.querySelectorAll('[data-lc-page-copy]').length).toBe(2); // la copie précédente finit sa sortie
    played.forEach((animation) => animation.finish());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.querySelector('[data-lc-page-copy], [data-lc-page-veil]')).toBeNull();
  });

  it('un hôte de page inline (ng-component) devient block pendant la transition', async () => {
    const { root, go } = await setup();
    await go('/a');
    await go('/a/b');
    const page = [...root.querySelector('main')!.children].find((el) => el.localName === 'ng-component') as HTMLElement;
    const entering = played.find((animation) => animation.target === page)!;
    expect(entering).toBeDefined();
    expect(page.style.display).toBe('block');
  });

  it('navigation sans transition (skipLocationChange) : aucune copie, rien ne s\'anime', async () => {
    const { root, go } = await setup();
    await go('/a');
    played.length = 0;
    await TestBed.inject(Router).navigateByUrl('/a/b', { skipLocationChange: true });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(played.length).toBe(0);
    expect(root.querySelector('[data-lc-page-copy]')).toBeNull();
  });

  it('destruction : plus d\'écoute du routeur, aucune copie ne naît et rien ne joue à la navigation suivante', async () => {
    const { root, go, destroy } = await setup();
    await go('/a');
    played.length = 0;
    destroy();
    await go('/a/b'); // le routeur (racine) vit encore : seule la directive est détruite
    expect(played).toEqual([]);
    expect(root.querySelector('[data-lc-page-copy]')).toBeNull();
  });
});
