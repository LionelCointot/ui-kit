// Harnais des transitions de page (spec 2026-12-mouvement-v2, CA-32 à CA-35) : petite application de routeur réel, reprise de l'essai `spike/motion-pages`.
// Elle ne contient aucune logique de transition : elle pose la directive du kit sur `main`. Avant T13, la compilation échoue (la directive n'existe pas) : échec attendu.
// Se construit par `npm run build` (dist/ui-angular) puis `node tools/qa/page-transitions-browser.mjs`.
import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot, ResolveFn, Router, RouterLink, RouterOutlet, Routes, provideRouter, withInMemoryScrolling } from '@angular/router';
import { LcPageTransitionsDirective } from '@lionelcointot/ui-angular/layout';
import { LcNavItemComponent, LcNavListComponent } from '@lionelcointot/ui-angular/navigation';

const demandTitle: ResolveFn<string> = (route: ActivatedRouteSnapshot) => `Demande n° ${route.paramMap.get('id')}`;

@Component({
  selector: 'qa-page',
  imports: [RouterLink],
  host: { class: 'qa-page' },
  template: `
    <h1 tabindex="-1">{{ title }}</h1>
    <p><input aria-label="Note" id="note" placeholder="champ interactif"> <button type="button" id="btn">Bouton</button></p>
    <p>
      <a id="l-list" routerLink="/requests">Liste</a> ·
      <a id="l-42r" routerLink="/requests/42" [replaceUrl]="true">Demande 42 (replaceUrl)</a> ·
      <a id="l-42" routerLink="/requests/42">Demande 42</a> ·
      <a id="l-43" routerLink="/requests/43">Demande 43</a> ·
      <a id="l-hist" routerLink="/requests/42/history">Historique 42</a> ·
      <a id="l-notif" routerLink="/notifications">Notifications</a> ·
      <a id="l-old" routerLink="/old-requests">Ancien lien (redirection)</a> ·
      <a id="l-secret" routerLink="/secret">Secret (garde)</a> ·
      <a id="l-query" routerLink="/requests" [queryParams]="{ tab: 2 }">Même page, ?query</a> ·
      <a id="l-fragment" routerLink="/requests" fragment="bas">Même page, fragment</a> ·
      <a id="l-plain" routerLink="/plain">Route sans transition</a> ·
      <button type="button" id="l-skip" (click)="skip()">Sans changer l'URL (skipLocationChange)</button>
    </p>
    @for (n of lines; track n) { <p class="line">{{ title }} - ligne {{ n }}</p> }
  `,
})
export class QaPage {
  private readonly router = inject(Router);
  protected readonly title = inject(ActivatedRoute).snapshot.title ?? '?';
  protected readonly lines = Array.from({ length: 60 }, (_, i) => i + 1);
  protected skip(): void { void this.router.navigateByUrl('/notifications', { skipLocationChange: true }); }
}

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'requests' },
  {
    path: 'requests', title: 'Mes demandes',
    children: [
      { path: '', component: QaPage },
      { path: ':id', title: demandTitle, children: [
        { path: '', component: QaPage },
        { path: 'history', title: 'Historique', component: QaPage },
      ] },
    ],
  },
  { path: 'notifications', title: 'Notifications', component: QaPage },
  { path: 'plain', title: 'Sans transition', data: { lcPageTransition: false }, component: QaPage },
  { path: 'old-requests', redirectTo: 'requests/42' },
  { path: 'secret', title: 'Secret', component: QaPage, canActivate: [() => inject(Router).parseUrl('/notifications')] },
];

@Component({
  selector: 'qa-root',
  imports: [RouterOutlet, LcNavListComponent, LcNavItemComponent, LcPageTransitionsDirective],
  template: `
    <header class="hdr"><strong id="hdr-title">Harnais</strong></header>
    <div class="body">
      <lc-nav-list class="side" aria-label="Rubriques">
        <a lcNavItem routerLink="/requests">Mes demandes</a>
        <a lcNavItem routerLink="/notifications">Notifications</a>
      </lc-nav-list>
      <main id="main" lcPageTransitions><router-outlet /></main>
    </div>
  `,
})
export class App {}

void bootstrapApplication(App, { providers: [provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }))] });
