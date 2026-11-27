import { provideLocationMocks } from '@angular/common/testing';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet, type Routes } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcAppShellComponent, LcPageComponent } from '@lionelcointot/ui-angular/layout';

// Fixtures de docs/specs/2026-12-mouvement-v2.md, T14 (CA-33, CA-34a) : en-tête mobile (bouton retour, titre au défilement) et bande du geste de retour ; pilotées par un navigateur tactile à 360 px, sans `play`.

@Component({
  imports: [LcPageComponent, RouterLink],
  template: `<lc-page title="Liste"><a id="to-detail" routerLink="/liste/42">Détail</a><a id="to-bare" routerLink="/nu/profond">Sans parent titré</a></lc-page>`,
})
class ListPageComponent {}

@Component({
  imports: [LcPageComponent],
  template: `<lc-page title="Détail">@for (line of lines; track line) { <p>Ligne {{ line }}</p> }</lc-page>`,
})
class DetailPageComponent {
  protected readonly lines = Array.from({ length: 60 }, (_, index) => index + 1);
}

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'liste' },
  { path: 'liste', title: 'Ma liste', children: [{ path: '', component: ListPageComponent }, { path: '42', component: DetailPageComponent }] },
  { path: 'nu', children: [{ path: 'profond', component: DetailPageComponent }] },
];

@Component({
  selector: 'lc-qa-back-app',
  imports: [LcAppShellComponent, RouterOutlet],
  template: `<lc-app-shell navMode="none"><strong lcShellHeader>QA</strong><router-outlet /></lc-app-shell>`,
})
class BackAppComponent {
  constructor() {
    // Le routeur de Storybook (preview.ts) déclare `**` en premier : on remplace sa configuration.
    const router = inject(Router);
    router.resetConfig(routes);
    if (!router.navigated || router.url === '/') void router.navigateByUrl('/liste');
  }
}

const meta: Meta = {
  title: 'QA/Motion/App shell : retour',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [moduleMetadata({ imports: [BackAppComponent] }), applicationConfig({ providers: [provideLocationMocks()] })],
};
export default meta;
type Story = StoryObj;

/** Départ sur la liste ; `#to-detail` ouvre le détail (niveau 2, parent titré), `#to-bare` un niveau 2 sans parent titré (bouton `Retour`). */
export const Back: Story = { render: () => ({ template: `<lc-qa-back-app />` }) };
