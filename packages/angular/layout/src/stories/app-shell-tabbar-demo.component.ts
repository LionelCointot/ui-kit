import { Component, Directive, ElementRef, Injector, afterNextRender, inject, input, signal, DestroyRef } from '@angular/core';
import { Router, RouterLink, RouterOutlet, type Routes } from '@angular/router';
import { LcButtonComponent, LcNavRegistry } from '@lionelcointot/ui-angular';
import { LcAppShellComponent, LcPageComponent } from '../public-api';
import { LC_PHONE_QUERY } from '../phone-query';

@Component({ imports: [LcPageComponent], template: `<lc-page title="Page"><p>Le contenu de la rubrique.</p></lc-page>` })
class TabPageComponent {}

/*
 * Partage du routeur : la story Animation héberge plusieurs démos (d53, d59, d57) et n'a qu'un `Router`. Chaque démo y pose ses routes ; d53 les remplace toutes par
 * `resetConfig(stackRoutes)`, donc cette démo (rendue après d53) AJOUTE les siennes, sous le préfixe `tab-` (un seul segment : un chemin à deux segments ferait de la page un niveau 2, avec bouton retour), à la configuration trouvée. L'ordre de rendu des démos
 * compte : rendue avant d53, elle perdrait ses routes. Elle ne navigue pas d'elle-même (elle volerait l'URL de d53) : « Plus » est actif tant qu'aucun onglet n'est ouvert.
 * Les deux `router-outlet` affichent la même URL : sur `/tab-…`, la coquille de d53 montre aussi la page.
 */
const PREFIX = 'tab-';

/** Rubriques de la démo d57. */
export const TABBAR_DEMO_ROUTES: Routes = ['studio', 'planner', 'tasks', 'projects', 'settings'].map((path) => ({
  path: PREFIX + path,
  component: TabPageComponent,
  title: path.charAt(0).toUpperCase() + path.slice(1),
  data: { lcPageTransition: false },
}));

/**
 * Inscrit un lien au registre de navigation, comme le fait `a[lcNavItem]` : `layout` n'importe pas `navigation` (CLAUDE.md), les stories de `layout` non plus.
 * @internal Stories seulement.
 */
@Directive({ selector: 'a[lcStoryNav]' })
export class StoryNavDirective {
  readonly icon = input<string>();
  readonly primary = input(false);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const registry = inject(LcNavRegistry);
    const router = inject(Router);
    const link = inject(RouterLink);
    afterNextRender(() => registry.register(element, { url: router.serializeUrl(link.urlTree!), label: element.textContent?.trim() ?? '', icon: this.icon(), primary: this.primary() }));
    inject(DestroyRef).onDestroy(() => registry.unregister(element));
  }
}

/** Démo d57 : barre d'onglets du bas de `lc-app-shell` (sous 768 px). « Rejouer » recrée la coquille, donc rejoue l'entrée. */
@Component({
  selector: 'lc-app-shell-tabbar-demo',
  imports: [LcAppShellComponent, LcButtonComponent, RouterLink, RouterOutlet, StoryNavDirective],
  host: { 'data-demo': 'd57' },
  // Les coquilles de la page écoutent toutes le défilement de la fenêtre (une seule par application) : le titre d'en-tête se démontre dans d53 / d59, pas ici.
  styles: `:host ::ng-deep lc-app-shell .lc-shell__title { transition: none; }`,
  template: `
    <button lcButton fillMode="outline" size="small" type="button" (click)="replay()">Rejouer</button>
    @if (shown()) {
      <lc-app-shell [attr.inert]="phone ? null : ''">
        <strong lcShellHeader>Studio</strong>
        <ul lcShellNav style="margin:0;padding:0;list-style:none">
          <li><a lcStoryNav routerLink="/tab-studio" icon="house" [primary]="true">Studio</a></li>
          <li><a lcStoryNav routerLink="/tab-planner" icon="calendar" [primary]="true">Planner</a></li>
          <li><a lcStoryNav routerLink="/tab-tasks" icon="list-checks" [primary]="true">Tasks</a></li>
          <li><a lcStoryNav routerLink="/tab-projects" icon="layout-dashboard" [primary]="true">Projects</a></li>
          <li><a lcStoryNav routerLink="/tab-settings" icon="settings">Settings</a></li>
        </ul>
        <router-outlet />
      </lc-app-shell>
    }`,
})
export class AppShellTabbarDemoComponent {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  protected readonly shown = signal(true);
  // La barre du bas n'existe que sous 768 px : au-dessus la coquille est inerte, pour qu'un seul repère banner et main soit exposé par page (axe).
  // shortcut: lu une fois à la création, pas réactif au redimensionnement.
  protected readonly phone = matchMedia(LC_PHONE_QUERY).matches;

  constructor() {
    // S'ajoute aux routes déjà posées par les autres démos de la story.
    const known = new Set(this.router.config.map((route) => route.path));
    this.router.resetConfig([...this.router.config, ...TABBAR_DEMO_ROUTES.filter((route) => !known.has(route.path))]);
  }

  protected replay(): void {
    this.shown.set(false);
    afterNextRender(() => this.shown.set(true), { injector: this.injector });
  }
}
