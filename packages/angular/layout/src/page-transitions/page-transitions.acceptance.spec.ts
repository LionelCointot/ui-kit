import { BreakpointObserver } from '@angular/cdk/layout';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet, type Routes } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import * as layout from '../public-api';
import { LcAppShellComponent } from '../app-shell/app-shell.component';

// Acceptation de docs/specs/2026-12-mouvement-v2.md, T13b (§5.4.3, §6), sous jsdom : ni `Element.animate` ni mise en page, donc seul ce qui ne dépend pas du mouvement s'y prouve
// (pose par `lc-app-shell`, déclenchement, focus, application sans navigation) ; les copies, les durées et le sens à l'écran sont dans tools/qa/page-transitions-browser.mjs.
// CONTRAT : `LcPageTransitionsDirective` (sélecteur `[lcPageTransitions]`, `@internal`) est exportée de `layout/src/public-api.ts` ; `lc-app-shell` la pose sur `main.lc-shell__main`.
const Directive = (layout as unknown as Record<string, unknown>)['LcPageTransitionsDirective'] as (new () => unknown) | undefined;

@Component({ template: '<h1 tabindex="-1">Page A</h1><button id="a">A</button>' })
class PageA {}
@Component({ template: '<h1 tabindex="-1">Page B</h1>' })
class PageB {}
@Component({ template: '<p>Sans titre</p>' })
class PageSansTitre {}
const routes: Routes = [
  { path: 'a', component: PageA },
  { path: 'b', component: PageB },
  { path: 'sans-titre', component: PageSansTitre },
  { path: 'muet', component: PageB, data: { lcPageTransition: false } },
];

@Component({
  imports: [LcAppShellComponent, RouterOutlet],
  template: '<lc-app-shell navMode="none"><strong lcShellHeader>En-tête</strong><router-outlet /></lc-app-shell>',
})
class Host {}

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideLocationMocks(), { provide: BreakpointObserver, useValue: { observe: () => new BehaviorSubject({ matches: true, breakpoints: {} }) } }],
  });
  const fixture = TestBed.createComponent(Host);
  const router = TestBed.inject(Router);
  const root = fixture.nativeElement as HTMLElement;
  const go = async (url: string) => { await router.navigateByUrl(url); await fixture.whenStable(); fixture.detectChanges(); await new Promise((resolve) => setTimeout(resolve, 50)); };
  return { fixture, root, go, main: root.querySelector('main.lc-shell__main') as HTMLElement };
}

describe('T13b : lcPageTransitions sous jsdom', () => {
  it('CA-33 : la directive est exportée (@internal) et lc-app-shell la pose sur main.lc-shell__main', async () => {
    expect(Directive, 'LcPageTransitionsDirective absente de layout/src/public-api.ts').toBeTypeOf('function');
    const { fixture } = await setup();
    const host = fixture.debugElement.query(By.directive(Directive as new () => unknown));
    expect(host?.nativeElement.matches('main.lc-shell__main')).toBe(true);
  });

  it('CA-32 : sans navigation (application sans routeur actif), rien ne se passe : aucune copie, focus inchangé', async () => {
    expect(Directive, 'directive absente').toBeTypeOf('function');
    const { fixture, root } = await setup();
    const probe = document.createElement('button');
    document.body.append(probe);
    probe.focus();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[inert]')).toBeNull();
    expect(document.activeElement).toBe(probe);
    probe.remove();
  });

  it('CA-32 : le premier affichage ne copie rien et ne déplace pas le focus', async () => {
    expect(Directive, 'directive absente').toBeTypeOf('function');
    const { root, go } = await setup();
    const probe = document.createElement('button');
    document.body.append(probe);
    probe.focus();
    await go('/a');
    expect(root.querySelector('[inert]')).toBeNull();
    expect(document.activeElement).toBe(probe);
    probe.remove();
  });

  it('CA-35 : après une navigation, le focus est sur le h1 de la nouvelle page et aucune copie ne reste', async () => {
    expect(Directive, 'directive absente').toBeTypeOf('function');
    const { root, go } = await setup();
    await go('/a');
    await go('/b');
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toBe('Page B');
    expect(root.querySelector('[inert]')).toBeNull();
  });

  it('CA-35 : page sans h1, le focus va sur #lc-main', async () => {
    expect(Directive, 'directive absente').toBeTypeOf('function');
    const { go } = await setup();
    await go('/a');
    await go('/sans-titre');
    expect(document.activeElement?.id).toBe('lc-main');
  });

  it('CA-32 : un changement de ?query ou de fragment ne déplace pas le focus', async () => {
    expect(Directive, 'directive absente').toBeTypeOf('function');
    const { go } = await setup();
    await go('/a');
    const button = document.getElementById('a') as HTMLElement;
    button.focus();
    await go('/a?tab=2');
    expect(document.activeElement).toBe(button);
    await go('/a?tab=2#bas');
    expect(document.activeElement).toBe(button);
  });

  it('CA-32 : une route `data: { lcPageTransition: false }` ne laisse aucune copie', async () => {
    expect(Directive, 'directive absente').toBeTypeOf('function');
    const { root, go } = await setup();
    await go('/a');
    await go('/muet');
    expect(root.querySelector('[inert]')).toBeNull();
  });
});
