import { Component, inject, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot, ResolveEnd, ResolveFn, Router, RouterLink, RouterLinkActive, RouterOutlet, Routes, provideRouter, withInMemoryScrolling } from '@angular/router';
import { PageNav, PageTransitionsDirective, TECH } from './transitions';

document.documentElement.dataset['tech'] = TECH;

const demandTitle: ResolveFn<string> = (r: ActivatedRouteSnapshot) => `Demande n° ${r.paramMap.get('id')}`;

const VIEW = `
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
      <a id="l-secret" routerLink="/secret">Secret (garde)</a>
    </p>
    @for (n of lines; track n) { <p class="line">{{ title }} - ligne {{ n }}</p> }
  `;

class PageBase {
  readonly title = inject(ActivatedRoute).snapshot.title ?? '?';
  readonly lines = Array.from({ length: 60 }, (_, i) => i + 1);
}
// A : animate.leave sur l'hote du composant routé. B : aucune directive de sortie (copie figee par la directive).
@Component({ selector: 'sp-page-a', imports: [RouterLink], host: { class: 'sp-page', 'animate.leave': 'sp-leave' }, template: VIEW })
export class PageViewA extends PageBase {}
@Component({ selector: 'sp-page-b', imports: [RouterLink], host: { class: 'sp-page' }, template: VIEW })
export class PageViewB extends PageBase {}
const PageView = TECH === 'a' ? PageViewA : PageViewB;

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'requests' },
  {
    path: 'requests', title: 'Mes demandes',
    children: [
      { path: '', component: PageView },
      { path: ':id', title: demandTitle, children: [
        { path: '', component: PageView },
        { path: 'history', title: 'Historique', component: PageView },
      ] },
    ],
  },
  { path: 'notifications', title: 'Notifications', component: PageView },
  { path: 'old-requests', redirectTo: 'requests/42' },
  { path: 'secret', title: 'Secret', component: PageView, canActivate: [() => inject(Router).parseUrl('/notifications')] },
];

@Component({
  selector: 'sp-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PageTransitionsDirective],
  template: `
    <header class="hdr">
      @if (nav.mobile() && nav.parent(); as p) {
        <button type="button" class="back" id="back" (click)="back(p.url)">‹ {{ p.title }}</button>
      }
      <strong id="hdr-title">{{ nav.title() }}</strong>
    </header>
    <div class="body">
      <nav class="side" aria-label="Rubriques">
        @for (i of items; track i.link) {
          <a [routerLink]="i.link" routerLinkActive="act" ariaCurrentWhenActive="page">{{ i.label }}</a>
        }
      </nav>
      <main id="main">
        @if (tech === 'w') {
          <!-- A' : enveloppeur recree a chaque navigation, avec animate.leave sur l'enveloppeur -->
          @for (k of [key()]; track k) { <div class="sp-wrap" animate.leave="sp-leave"><router-outlet /></div> }
        } @else {
          <div spPageTransitions [navOrder]="order"><router-outlet /></div>
        }
      </main>
    </div>
  `,
})
export class App {
  protected readonly nav = inject(PageNav);
  private readonly router = inject(Router);
  protected readonly items = [{ link: '/requests', label: 'Mes demandes' }, { link: '/notifications', label: 'Notifications' }];
  protected readonly order = this.items.map((i) => i.link);
  protected readonly tech = TECH;
  protected readonly key = signal('');
  constructor() { this.router.events.subscribe((e) => { if (e instanceof ResolveEnd) this.key.set(e.urlAfterRedirects); }); }
  protected back(url: string): void { void this.router.navigateByUrl(url); }
}

void bootstrapApplication(App, { providers: [provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }))] });
