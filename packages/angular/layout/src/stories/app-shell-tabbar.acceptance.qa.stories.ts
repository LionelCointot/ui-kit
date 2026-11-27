import { provideLocationMocks } from '@angular/common/testing';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcToastOutletComponent, LcToastService } from '@lionelcointot/ui-angular/feedback';
import { LcAppShellComponent } from '../public-api';
import { StoryNavDirective, TABBAR_DEMO_ROUTES } from './app-shell-tabbar-demo.component';

/**
 * Support de CA-36 (spec 2026-12-mouvement-v2) : barre d'onglets de `lc-app-shell`, pilotée par la suite navigateur
 * (largeurs 767 / 768 / 1023 / 1024 px, cibles ≥ 44 px, `aria-current`, « Plus » → tiroir, entrée aux tokens `tabbar.*`, `axeRun`).
 */
@Component({
  selector: 'lc-qa-tabbar',
  imports: [LcAppShellComponent, LcToastOutletComponent, RouterLink, RouterOutlet, StoryNavDirective],
  template: `
    <lc-app-shell data-qa="shell">
      <strong lcShellHeader>QA</strong>
      <ul lcShellNav style="margin:0;padding:0;list-style:none">
        <li><a lcStoryNav routerLink="/studio" icon="house" [primary]="primary">Studio</a></li>
        <li><a lcStoryNav routerLink="/planner" icon="calendar" [primary]="primary">Planner</a></li>
        <li><a lcStoryNav routerLink="/tasks" icon="list-checks" [primary]="primary">Tasks</a></li>
        <li><a lcStoryNav routerLink="/projects" icon="layout-dashboard" [primary]="primary">Projects</a></li>
        <li><a lcStoryNav routerLink="/settings" icon="settings">Settings</a></li>
      </ul>
      <button id="qa-toast" type="button" (click)="toasts.show({ kind: 'success', message: 'Enregistré' })">Toast</button>
      <router-outlet />
    </lc-app-shell>
    <lc-toast-outlet />`,
})
class QaTabbarComponent {
  protected readonly toasts = inject(LcToastService);
  protected readonly primary = !new URLSearchParams(location.search).has('noprimary');

  constructor() {
    const router = inject(Router);
    router.resetConfig(TABBAR_DEMO_ROUTES);
    void router.navigateByUrl('/studio');
  }
}

const meta: Meta = {
  title: 'QA/Layout/App shell tab bar',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [moduleMetadata({ imports: [QaTabbarComponent] }), applicationConfig({ providers: [provideLocationMocks()] })],
  render: () => ({ template: '<lc-qa-tabbar />' }),
};
export default meta;

/** Quatre rubriques `primary` et une cinquième dans le tiroir seulement. `?noprimary` dans l'URL de l'iframe : aucune rubrique `primary` (tiroir actuel). */
export const TabBar: StoryObj = {};
