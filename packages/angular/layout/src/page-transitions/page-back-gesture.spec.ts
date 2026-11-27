import { BreakpointObserver } from '@angular/cdk/layout';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, type Routes } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { LcAppShellComponent } from '../app-shell/app-shell.component';

// Geste de retour et en-tête mobile sous jsdom : `Element.animate`, `matchMedia` et les rectangles sont simulés ; les durées et le rendu réel sont dans tools/qa/page-transitions-browser.mjs.
const WIDTH = 360;
@Component({ selector: 'app-list', template: '<h1 tabindex="-1">Liste</h1>' })
class List {}
@Component({ selector: 'app-detail', template: '<h1 tabindex="-1">Détail</h1>' })
class Detail {}
const routes: Routes = [
  { path: 'liste', title: 'Ma liste', children: [{ path: '', component: List }, { path: ':id', component: Detail }] },
  { path: 'direct', children: [{ path: 'profond', component: Detail }] },
];

@Component({ imports: [LcAppShellComponent, RouterOutlet], template: '<lc-app-shell navMode="none"><router-outlet /></lc-app-shell>' })
class Host {}

describe('retour au geste et en-tête mobile', () => {
  let played: { target: Element; keyframes: Keyframe[] }[];
  beforeEach(() => {
    played = [];
    (Element.prototype as { animate?: unknown }).animate = function (this: Element, keyframes: Keyframe[]) {
      played.push({ target: this, keyframes });
      return { finished: Promise.resolve(), cancel() {}, playState: 'finished' };
    };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: WIDTH, height: 640, right: WIDTH, bottom: 640, x: 0, y: 0, toJSON() {} });
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') }));
    for (const [name, value] of Object.entries({ '--lc-page-stack-duration': '500ms', '--lc-page-stack-easing': 'ease', '--lc-page-stack-recede': '30%', '--lc-page-stack-dim': '0.12' })) document.documentElement.style.setProperty(name, value);
  });
  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
    document.documentElement.removeAttribute('style');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function setup(...path: string[]) {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideLocationMocks(), { provide: BreakpointObserver, useValue: { observe: () => new BehaviorSubject({ matches: true, breakpoints: {} }) } }],
    });
    const fixture = TestBed.createComponent(Host);
    const router = TestBed.inject(Router);
    const root = fixture.nativeElement as HTMLElement;
    const settle = async (ms = 30) => { await fixture.whenStable(); fixture.detectChanges(); await new Promise((resolve) => setTimeout(resolve, ms)); };
    for (const url of path) { await router.navigateByUrl(url); await settle(); }
    const edge = () => root.querySelector<HTMLElement>('[data-lc-page-edge]')!;
    const touch = (type: string, x: number, time: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'timeStamp', { value: time });
      Object.assign(event, { pointerId: 1, isPrimary: true, pointerType: 'touch', clientX: x, clientY: 300 });
      edge().dispatchEvent(event);
    };
    return { root, router, settle, edge, touch };
  }

  it('niveau 1 : ni bouton retour ni bande de geste', async () => {
    const { root } = await setup('/liste');
    expect(root.querySelector('.lc-shell__back')).toBeNull();
    expect(root.querySelector('[data-lc-page-edge]')).toBeNull();
  });

  it('niveau 2 : bouton `titre parent`, nom accessible qui le contient, bande de geste présente', async () => {
    const { root, edge } = await setup('/liste', '/liste/42');
    const back = root.querySelector<HTMLButtonElement>('.lc-shell__back')!;
    expect(back.textContent?.trim()).toBe('Ma liste');
    expect(back.getAttribute('aria-label')).toBe('Retour à Ma liste');
    expect(edge()).not.toBeNull();
  });

  it('aucune route ancêtre titrée : le bouton porte le libellé de repli `Retour`', async () => {
    const { root } = await setup('/direct/profond');
    const back = root.querySelector<HTMLButtonElement>('.lc-shell__back')!;
    expect(back.textContent?.trim()).toBe('Retour');
    expect(back.getAttribute('aria-label')).toBe('Retour');
  });

  it('le bouton retour navigue vers la page parente', async () => {
    const { root, router, settle } = await setup('/liste', '/liste/42');
    root.querySelector<HTMLButtonElement>('.lc-shell__back')!.click();
    await settle();
    expect(router.url).toBe('/liste');
  });

  it('tirer de 20 % puis relâcher ramène la page sans naviguer ; la copie de la page précédente est dessous (inert), l\'URL ne bouge pas pendant le geste', async () => {
    const { root, router, settle, touch } = await setup('/liste', '/liste/42');
    await settle(600);
    touch('pointerdown', 0, 0);
    touch('pointermove', WIDTH * 0.2, 500);
    const under = root.querySelector<HTMLElement>('[data-lc-page-copy]')!;
    expect(under.hasAttribute('inert')).toBe(true);
    expect(under.querySelector('h1')?.textContent).toBe('Liste');
    expect(router.url).toBe('/liste/42');
    touch('pointerup', WIDTH * 0.2, 1000);
    await settle();
    expect(router.url).toBe('/liste/42');
    expect(root.querySelector('[data-lc-page-copy], [data-lc-page-veil]')).toBeNull();
  });

  it('tirer de 70 % navigue vers la parente sans rejouer la transition (aucune animation après l\'engagement)', async () => {
    const { root, router, settle, touch } = await setup('/liste', '/liste/42');
    await settle(600);
    touch('pointerdown', 0, 0);
    touch('pointermove', WIDTH * 0.7, 500);
    touch('pointerup', WIDTH * 0.7, 1000);
    const afterRelease = played.length;
    await settle();
    expect(router.url).toBe('/liste');
    expect(played.length).toBe(afterRelease);
    expect(root.querySelector('[data-lc-page-copy], [data-lc-page-veil]')).toBeNull();
    expect(document.activeElement?.textContent).toBe('Liste');
  });

  it('un geste vif (> 0,4 px/ms) navigue même court', async () => {
    const { router, settle, touch } = await setup('/liste', '/liste/42');
    await settle(600);
    touch('pointerdown', 0, 0);
    touch('pointermove', 10, 1000);
    touch('pointermove', 60, 1050);
    touch('pointerup', 60, 1060);
    await settle();
    expect(router.url).toBe('/liste');
  });

  it('lien direct sans copie : fond neutre (sans copie de page) qui porte le titre du parent, ici aucun', async () => {
    const { root, settle, touch } = await setup('/direct/profond');
    await settle(600);
    touch('pointerdown', 0, 0);
    touch('pointermove', 50, 100);
    const under = root.querySelector('[data-lc-page-copy]')!;
    expect(under.querySelector('h1')).toBeNull();
    expect(under.textContent).toBe('');
  });

  it('niveau 2 atteint par lien direct, parent titré : le fond neutre porte son titre', async () => {
    const { root, settle, touch } = await setup('/liste/42');
    await settle(600);
    touch('pointerdown', 0, 0);
    touch('pointermove', 50, 100);
    const under = root.querySelector('[data-lc-page-copy]')!;
    expect(under.querySelector('h1')).toBeNull();
    expect(under.textContent).toBe('Ma liste');
  });

  it('une feuille ouverte bloque le geste', async () => {
    const { root, settle, touch } = await setup('/liste', '/liste/42');
    await settle(600);
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    touch('pointerdown', 0, 0);
    expect(root.querySelector('[data-lc-page-copy]')).toBeNull();
    dialog.remove();
  });
});
