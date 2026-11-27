import { Location } from '@angular/common';
import { provideLocationMocks, SpyLocation } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { LcNavRegistry } from '@lionelcointot/ui-angular';
import { lcNavStep, lcPathLevel } from '../public-api';
import { LcPageNav } from './page-nav.service';

@Component({ template: '' })
class BlankComponent {}
const page = (path: string, title?: string) => ({ path, component: BlankComponent, ...(title ? { title } : {}) });
const routes: Routes = [
  { path: 'credit', title: 'Crédit', children: [page('detail', 'Détail'), page('', undefined)] },
  { path: 'a', children: [{ path: 'b', title: 'B', children: [page('c', 'C')] }] },
  page('aide', 'Aide'),
  { ...page('muet', 'Muet'), data: { lcPageTransition: false } },
];

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideLocationMocks(), { provide: LcNavRegistry, useValue: { items: signal([]) } }],
  });
  const router = TestBed.inject(Router);
  const nav = TestBed.inject(LcPageNav);
  const location = TestBed.inject(Location) as SpyLocation;
  router.setUpLocationChangeListener(); // le routeur de test n'écoute le navigateur qu'après la navigation initiale
  const go = (url: string, extras = {}) => router.navigateByUrl(url, extras);
  const back = async (fn: () => void) => {
    fn();
    await new Promise((resolve) => setTimeout(resolve));
  };
  return { nav, router, location, go, back };
}

describe('lcPathLevel : cas limites', () => {
  it.each([['', 1], ['//', 1], ['/credit/', 1], ['/credit//detail', 2], ['/a?b=/c/d', 1], ['/a#/b/c', 1]])('%j : niveau %i', (url, level) => {
    expect(lcPathLevel(url)).toBe(level);
  });
});

describe('lcNavStep : cas limites', () => {
  it('une URL avec ?query ou #fragment est empilée sans', () => {
    expect(lcNavStep({ urls: [], index: -1 }, { url: '/a?x=1#h', trigger: 'imperative' }, []).history.urls).toEqual(['/a']);
  });
  it('une rubrique du registre avec / final ou ?query se rattache quand même à ses sous-pages', () => {
    const order = ['/credit/?x=1', '/budget'];
    const h = { urls: ['/credit/a'], index: 0 };
    expect(lcNavStep(h, { url: '/budget/b', trigger: 'imperative' }, order).direction).toBe('forward');
  });
});

describe('LcPageNav : titres et pile', () => {
  it('parent : route ancêtre la plus proche qui a un titre, feuille exclue ; URL reconstruite', async () => {
    const { nav, go } = setup();
    await go('/a/b/c');
    expect(nav.title()).toBe('C');
    expect(nav.parent()).toEqual({ title: 'B', url: '/a/b' });
  });

  it('route à chemin vide : titre hérité du parent par le routeur ; niveau 1 : pas de parent', async () => {
    const { nav, go } = setup();
    await go('/credit');
    expect(nav.title()).toBe('Crédit');
    expect(nav.parent()).toBeNull();
    expect(nav.level()).toBe(1);
  });

  it('?query et fragment : titre et niveau suivent, la transition ne se déclenche pas', async () => {
    const { nav, go } = setup();
    await go('/aide');
    const first = nav.change();
    await go('/aide?x=1#haut');
    expect(nav.change()).toBe(first);
    expect(nav.title()).toBe('Aide');
  });

  it('skipLocationChange : ni transition ni entrée de pile', async () => {
    const { nav, go, location, back } = setup();
    await go('/aide');
    await go('/credit');
    const before = nav.change();
    await go('/credit/detail', { skipLocationChange: true });
    expect(nav.change()).toBe(before);
    expect(nav.level()).toBe(2);
    await back(() => location.back()); // vers /aide : la pile n'a pas reçu /credit/detail
    expect(nav.change()?.to).toBe('/aide');
    expect(nav.direction()).toBe('back');
  });

  it('retour du navigateur vers une page plus profonde, puis avance', async () => {
    const { nav, go, location, back } = setup();
    await go('/credit/detail');
    await go('/credit');
    await back(() => location.back());
    expect(nav.change()).toMatchObject({ to: '/credit/detail', direction: 'back' });
    await back(() => location.forward());
    expect(nav.change()).toMatchObject({ to: '/credit', direction: 'forward' });
  });

  it('replaceUrl : sens normal, et le retour saute l’entrée remplacée', async () => {
    const { nav, go, location, back } = setup();
    await go('/aide');
    await go('/credit');
    await go('/credit/detail', { replaceUrl: true });
    expect(nav.direction()).toBe('forward');
    await back(() => location.back());
    expect(nav.change()).toMatchObject({ to: '/aide', direction: 'back' });
  });

  it('data: { lcPageTransition: false } : pas de transition, mais la pile suit', async () => {
    const { nav, go, location, back } = setup();
    await go('/aide');
    await go('/credit');
    const before = nav.change();
    await go('/muet');
    expect(nav.change()).toBe(before);
    await back(() => location.back()); // /muet → /credit : la pile connaît /muet, donc c'est un retour
    expect(nav.change()).not.toBe(before);
    expect(nav.change()).toMatchObject({ from: '/muet', to: '/credit', direction: 'back' });
  });
});
