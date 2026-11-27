// Harnais des transitions de page (spec 2026-12-mouvement-v2, CA-32 à CA-35) : application `lc-app-shell` à routeur réel, reprise de l'essai `spike/motion-pages`.
// Elle ne contient aucune logique de transition ni aucune directive de transition : `lc-app-shell` pose `lcPageTransitions` sur son `main` (contrat de T13b).
// CONTRAT (utilisé par tools/qa/page-transitions-browser.mjs ; le développeur ne le change pas, il le signale) :
//   routes : /requests (titre « Mes demandes », niveau 1) > /requests/:id (« Demande n° :id », niveau 2) > /requests/:id/history (« Historique », niveau 3) ; /notifications (« Notifications », niveau 1, 2e rubrique) ;
//            /plain (`data: { lcPageTransition: false }`) ; /old-requests (redirectTo requests/42) ; /secret (garde qui redirige vers /notifications) ; '' redirige vers /requests.
//   page : `.qa-page` (hôte de QaPage) contenant un `h1[tabindex=-1]` (titre de la route), `#note` (champ), `#btn`, `#aud` (audio) et `#play`, les liens `#l-*` ci-dessous et 60 `p.line` (la page défile) ; la page est le seul contenu du routeur.
//   rubriques de la barre latérale (`lc-nav-list`, `a[lcNavItem] primary`) : « Mes demandes » (/requests), « Notifications » (/notifications) ; en-tête : `strong#hdr-title`.
//   liens : #l-list #l-42 #l-42r(replaceUrl) #l-43 #l-hist #l-notif #l-old #l-secret #l-query(?tab=2) #l-fragment(#bas) #l-plain #l-skip(skipLocationChange vers /notifications).
// Se construit par `npm run build` (dist/ui-angular, packages/tokens/dist) puis `node tools/qa/page-transitions-browser.mjs`.
import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot, ResolveFn, Router, RouterLink, RouterOutlet, Routes, provideRouter, withInMemoryScrolling } from '@angular/router';
import { LcAppShellComponent } from '@lionelcointot/ui-angular/layout';
import { LcNavItemComponent, LcNavListComponent } from '@lionelcointot/ui-angular/navigation';

const demandTitle: ResolveFn<string> = (route: ActivatedRouteSnapshot) => `Demande n° ${route.paramMap.get('id')}`;

@Component({
  selector: 'qa-page',
  imports: [RouterLink],
  host: { class: 'qa-page' },
  template: `
    <h1 tabindex="-1">{{ title }}</h1>
    <p><input aria-label="Note" id="note" name="note" placeholder="champ interactif"> <button type="button" id="btn">Bouton</button> <button type="button" id="play" (click)="play()">Lire</button> <audio id="aud" loop [src]="sound"></audio></p>
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
  protected readonly sound = URL.createObjectURL(silence());
  protected play(): void { void (document.querySelector('main #aud') as HTMLAudioElement | null)?.play(); }
  protected skip(): void { void this.router.navigateByUrl('/notifications', { skipLocationChange: true }); }
}

/** Une seconde de silence (WAV 8 kHz, 8 bits) : de quoi avoir un média en lecture. */
function silence(): Blob {
  const data = new Uint8Array(44 + 8000).fill(128);
  const view = new DataView(data.buffer);
  const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + 8000, true); text(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true); text(36, 'data'); view.setUint32(40, 8000, true);
  return new Blob([data], { type: 'audio/wav' });
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
  imports: [RouterOutlet, LcAppShellComponent, LcNavListComponent, LcNavItemComponent],
  template: `
    <lc-app-shell navLabel="Rubriques">
      <strong lcShellHeader id="hdr-title">Harnais</strong>
      <lc-nav-list lcShellNav aria-label="Rubriques">
        <a lcNavItem routerLink="/requests" primary>Mes demandes</a>
        <a lcNavItem routerLink="/notifications" primary>Notifications</a>
      </lc-nav-list>
      <router-outlet />
    </lc-app-shell>
  `,
})
export class App {}

void bootstrapApplication(App, { providers: [provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }))] });
