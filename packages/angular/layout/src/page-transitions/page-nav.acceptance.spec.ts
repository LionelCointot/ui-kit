import { Location } from '@angular/common';
import { provideLocationMocks, SpyLocation } from '@angular/common/testing';
import { Component, signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import * as main from '@lionelcointot/ui-angular';
import * as layout from '../public-api';

// Acceptation de docs/specs/2026-12-mouvement-v2.md, T13a, CA-32 (service `LcPageNav` avec un routeur Angular de test ; la partie « routeur réel » est T13b).
// CONTRAT du service (exporté de `layout/src/public-api.ts`, `providedIn: 'root'`) :
//   direction: Signal<'none'|'forward'|'back'|'same'>   (initial 'none')
//   level: Signal<number>        (initial 1 ; lcPathLevel de l'URL finale)
//   parent: Signal<{ title: string; url: string } | null>   (route ancêtre la plus proche qui a un `title`, feuille exclue ; null au niveau 1 ; lien direct profond compris)
//   title: Signal<string>        (titre de la route feuille, '' sans titre)
//   change: Signal<{ direction; from: string | null; to: string } | null>   (NOUVEL objet à chaque navigation qui déclenche une transition, y compris
//     deux avancer de suite ; inchangé pour ?query, fragment, skipLocationChange et `data: { lcPageTransition: false }` ; null tant que rien n'a navigué)
//   Écoute `ResolveEnd` (titres, URL finale) puis `NavigationEnd` ; lit `LcNavRegistry.items()` au moment de la navigation ; la pile suit aussi les
//   navigations qui ne déclenchent pas.
type Direction = 'none' | 'forward' | 'back' | 'same';
interface Change { direction: Direction; from: string | null; to: string }
interface PageNav {
  direction: Signal<Direction>;
  level: Signal<number>;
  parent: Signal<{ title: string; url: string } | null>;
  title: Signal<string>;
  change: Signal<Change | null>;
}
const PageNavToken = (layout as unknown as Record<string, unknown>)['LcPageNav'] as new () => PageNav;
const NavRegistry = (main as unknown as Record<string, unknown>)['LcNavRegistry'] as new () => unknown;

@Component({ template: '' })
class BlankComponent {}
const page = (path: string, title?: string) => ({ path, component: BlankComponent, ...(title ? { title } : {}) });
const routes: Routes = [
  page('', 'Accueil'),
  {
    path: 'credit',
    title: 'Crédit',
    children: [page('', undefined), page('detail', 'Détail'), { path: 'dossier', title: () => 'Dossier 7', component: BlankComponent }],
  },
  { path: 'budget', title: 'Budget', children: [page('', undefined), page('detail', 'Détail budget')] },
  page('aide', 'Aide'),
  page('sans-effet', 'Sans effet'),
  { ...page('muet', 'Muet'), data: { lcPageTransition: false } },
  { path: 'ancien', redirectTo: 'credit/detail' },
  { path: 'prive', component: BlankComponent, canActivate: [() => TestBed.inject(Router).parseUrl('/credit')] },
];

function setup(order: string[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideLocationMocks(),
      { provide: NavRegistry, useValue: { items: signal(order.map((url) => ({ url, label: url, icon: undefined, primary: false }))) } },
    ],
  });
  const nav = TestBed.inject(PageNavToken);
  return { nav, location: TestBed.inject(Location) as SpyLocation, router: TestBed.inject(Router) };
}
/** Démarre la navigation (le service doit être créé avant), puis rend le harnais. */
const start = async (url: string) => {
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return harness;
};
const settle = async (harness: RouterTestingHarness) => {
  await harness.fixture.whenStable();
  harness.detectChanges();
};

describe('CA-32 : LcPageNav avec un routeur de test', () => {
  it('lien direct profond : aucune animation, niveau, titre et parent connus', async () => {
    const { nav } = setup();
    await start('/credit/detail');
    expect(nav.direction()).toBe('none');
    expect(nav.level()).toBe(2);
    expect(nav.title()).toBe('Détail');
    expect(nav.parent()).toEqual({ title: 'Crédit', url: '/credit' });
  });

  it('niveau 1 : pas de parent', async () => {
    const { nav } = setup();
    await start('/credit');
    expect(nav.level()).toBe(1);
    expect(nav.parent()).toBeNull();
  });

  it('titre dynamique (résolveur de titre) lu au ResolveEnd', async () => {
    const { nav } = setup();
    await start('/credit/dossier');
    expect(nav.title()).toBe('Dossier 7');
  });

  it('avancer puis reculer dans l’application', async () => {
    const { nav } = setup();
    const h = await start('/credit');
    await h.navigateByUrl('/credit/detail');
    expect(nav.direction()).toBe('forward');
    expect(nav.change()).toMatchObject({ direction: 'forward', from: '/credit', to: '/credit/detail' });
    await h.navigateByUrl('/credit');
    expect(nav.direction()).toBe('back');
  });

  it('deux avancer de suite émettent deux changements distincts', async () => {
    const { nav } = setup();
    const h = await start('/');
    await h.navigateByUrl('/credit');
    const first = nav.change();
    await h.navigateByUrl('/credit/detail');
    expect(nav.change()).not.toBe(first);
  });

  it('retour du navigateur, y compris vers une page plus profonde, puis avance du navigateur', async () => {
    const { nav, location } = setup();
    const h = await start('/credit/detail');
    await h.navigateByUrl('/credit');
    expect(nav.direction()).toBe('back');
    location.back(); // vers /credit/detail, plus profond
    await settle(h);
    expect(nav.change()?.to).toBe('/credit/detail');
    expect(nav.direction()).toBe('back');
    location.forward(); // vers /credit
    await settle(h);
    expect(nav.change()?.to).toBe('/credit');
    expect(nav.direction()).toBe('forward');
  });

  it('replaceUrl : sens calculé normalement, et le retour du navigateur saute l’entrée remplacée', async () => {
    const { nav, location } = setup();
    const h = await start('/aide');
    await h.navigateByUrl('/credit');
    await h.navigateByUrl('/credit/detail', { replaceUrl: true } as never);
    expect(nav.direction()).toBe('forward');
    location.back(); // vers /aide : l'entrée /credit a été remplacée
    await settle(h);
    expect(nav.change()?.to).toBe('/aide');
    expect(nav.direction()).toBe('back');
  });

  it('redirectTo : sens calculé sur l’URL finale', async () => {
    const { nav } = setup();
    const h = await start('/credit');
    await h.navigateByUrl('/ancien');
    expect(nav.change()?.to).toBe('/credit/detail');
    expect(nav.direction()).toBe('forward');
    expect(nav.title()).toBe('Détail');
  });

  it('garde qui redirige : sens calculé sur l’URL finale, pas sur la cible demandée', async () => {
    const { nav } = setup();
    const h = await start('/credit/detail');
    await h.navigateByUrl('/prive');
    expect(nav.change()?.to).toBe('/credit');
    expect(nav.direction()).toBe('back');
  });

  describe('même niveau : ordre des rubriques du registre', () => {
    const order = ['/credit', '/budget', '/aide'];
    it('plus bas : avancer', async () => {
      const { nav } = setup(order);
      const h = await start('/credit');
      await h.navigateByUrl('/budget');
      expect(nav.direction()).toBe('forward');
    });
    it('plus haut : reculer', async () => {
      const { nav } = setup(order);
      const h = await start('/aide');
      await h.navigateByUrl('/credit');
      expect(nav.direction()).toBe('back');
    });
    it('identique (même rubrique, même niveau) : fondu', async () => {
      const { nav } = setup(order);
      const h = await start('/credit/detail');
      await h.navigateByUrl('/credit/dossier');
      expect(nav.direction()).toBe('same');
    });
    it('registre vide (rendu serveur, navMode none) : fondu', async () => {
      const { nav } = setup([]);
      const h = await start('/credit');
      await h.navigateByUrl('/budget');
      expect(nav.direction()).toBe('same');
    });
  });

  describe('ne déclenchent rien', () => {
    it.each([
      ['?query', '/aide?x=1', {}],
      ['fragment', '/aide#haut', {}],
      ['skipLocationChange', '/budget', { skipLocationChange: true }],
    ])('%s', async (_nom, url, extras) => {
      const { nav } = setup(['/aide', '/budget']);
      const h = await start('/aide');
      await h.navigateByUrl('/credit/detail'); // direction connue : forward
      const before = nav.change();
      await h.navigateByUrl('/credit/detail' + url.replace(/^\/[^?#]*/, ''), extras as never);
      if (_nom === 'skipLocationChange') await h.navigateByUrl('/credit/detail?z=1', extras as never);
      expect(nav.change()).toBe(before);
      expect(nav.direction()).toBe('forward');
    });

    it('route data: { lcPageTransition: false } : rien, mais la pile suit', async () => {
      const { nav, location } = setup();
      const h = await start('/aide');
      await h.navigateByUrl('/credit');
      const before = nav.change();
      await h.navigateByUrl('/muet');
      expect(nav.change()).toBe(before);
      location.back(); // vers /credit : la pile connaît /muet
      await settle(h);
      expect(nav.change()?.to).toBe('/credit');
      expect(nav.direction()).toBe('same');
    });
  });

  it('sans routeur fourni (aucun événement) : rien ne se passe, aucune exception', () => {
    TestBed.configureTestingModule({});
    const nav = TestBed.inject(PageNavToken);
    expect(nav.direction()).toBe('none');
    expect(nav.change()).toBeNull();
    expect(nav.parent()).toBeNull();
    expect(nav.level()).toBe(1);
    expect(nav.title()).toBe('');
  });
});
