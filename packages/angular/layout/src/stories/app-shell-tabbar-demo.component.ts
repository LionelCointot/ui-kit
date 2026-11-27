import { Component, Directive, ElementRef, Injector, afterNextRender, inject, input, signal, DestroyRef } from '@angular/core';
import { Router, RouterLink, RouterOutlet, type Routes } from '@angular/router';
import { LcButtonComponent, LcNavRegistry } from '@lionelcointot/ui-angular';
import { LcAppShellComponent, LcPageComponent } from '../public-api';

@Component({ imports: [LcPageComponent], template: `<lc-page title="Page"><p>Le contenu de la rubrique.</p></lc-page>` })
class TabPageComponent {}

/** Rubriques de la démo d57 (routes nommées pour ne pas heurter celles des autres démos de la story). */
export const TABBAR_DEMO_ROUTES: Routes = ['studio', 'planner', 'tasks', 'projects', 'settings'].map((path) => ({
  path,
  component: TabPageComponent,
  title: path.charAt(0).toUpperCase() + path.slice(1),
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
  template: `
    <button lcButton fillMode="outline" size="small" type="button" (click)="replay()">Rejouer</button>
    @if (shown()) {
      <lc-app-shell>
        <strong lcShellHeader>Studio</strong>
        <ul lcShellNav style="margin:0;padding:0;list-style:none">
          <li><a lcStoryNav routerLink="/studio" icon="house" [primary]="true">Studio</a></li>
          <li><a lcStoryNav routerLink="/planner" icon="calendar" [primary]="true">Planner</a></li>
          <li><a lcStoryNav routerLink="/tasks" icon="list-checks" [primary]="true">Tasks</a></li>
          <li><a lcStoryNav routerLink="/projects" icon="layout-dashboard" [primary]="true">Projects</a></li>
          <li><a lcStoryNav routerLink="/settings" icon="settings">Settings</a></li>
        </ul>
        <router-outlet />
      </lc-app-shell>
    }`,
})
export class AppShellTabbarDemoComponent {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  protected readonly shown = signal(true);

  constructor() {
    // S'ajoute aux routes déjà posées par les autres démos de la story.
    const known = new Set(this.router.config.map((route) => route.path));
    this.router.resetConfig([...this.router.config, ...TABBAR_DEMO_ROUTES.filter((route) => !known.has(route.path))]);
    if (!TABBAR_DEMO_ROUTES.some((route) => this.router.url.startsWith('/' + route.path))) void this.router.navigateByUrl('/studio');
  }

  protected replay(): void {
    this.shown.set(false);
    afterNextRender(() => this.shown.set(true), { injector: this.injector });
  }
}
