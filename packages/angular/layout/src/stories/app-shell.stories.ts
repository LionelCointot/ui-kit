import { provideLocationMocks } from '@angular/common/testing';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet, type Routes } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { StoryMotionNoticeComponent, fixedExample } from '@lc/storybook';
import { LcAppShellComponent, LcPageComponent } from '@lionelcointot/ui-angular/layout';

/**
 * Application frame: header, side navigation (a drawer on narrow screens) and main content.
 * `navMode` forces the navigation layout; `auto` switches between side and drawer according to the width.
 *
 * Import: `import { LcAppShellComponent } from '@lionelcointot/ui-angular/layout';`
 */
const meta: Meta<LcAppShellComponent> = {
  title: 'Layout/App shell',
  component: LcAppShellComponent,
  decorators: [moduleMetadata({ imports: [LcAppShellComponent, LcButtonComponent, LcIconComponent] })],
  parameters: { layout: 'fullscreen' },
  argTypes: { navMode: { control: 'inline-radio', options: ['auto', 'side', 'drawer', 'none'] } },
  args: { navMode: 'auto', navLabel: 'Navigation principale' },
};
export default meta;
type Story = StoryObj<LcAppShellComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['navMode'] } },
  render: (args) => ({
    props: args,
    template: `
      <lc-app-shell [navMode]="navMode" [navLabel]="navLabel">
        <strong lcShellHeader>Application</strong>
        <ul lcShellNav style="margin:0;padding:0;list-style:none">
          <li><a href="#">Première page</a></li>
          <li><a href="#">Seconde page</a></li>
        </ul>
        <p style="padding:16px">Contenu principal.</p>
      </lc-app-shell>`,
  }),
};

/** `navMode="none"`: no menu button, navigation or drawer; the header and the full-width content remain. */
export const WithoutNavigation: Story = {
  parameters: fixedExample,
  args: { navMode: 'none' },
  render: (args) => ({
    props: args,
    template: `
      <lc-app-shell [navMode]="navMode">
        <strong lcShellHeader>Application</strong>
        <button lcShellHeader lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" aria-label="Changer de thème" style="margin-inline-start:auto">
          <lc-icon name="sun" />
        </button>
        <div style="display:grid;place-items:center;min-height:60dvh;padding:16px">
          <p>Contenu centré, sans navigation.</p>
        </div>
      </lc-app-shell>`,
  }),
};

@Component({
  imports: [LcPageComponent, RouterLink],
  template: `
    <lc-page title="Mes demandes" description="Ouvrez une demande : la page s'empile par la droite.">
      <p><a routerLink="/requests/42">Demande n° 42</a></p>
      <p>Chaque page est une vraie route : la page quittée reste visible, figée, le temps de sa sortie.</p>
    </lc-page>`,
})
class RequestsPageComponent {}

@Component({
  imports: [LcPageComponent, RouterLink],
  template: `
    <lc-page title="Demande n° 42" description="Revenir à la liste fait l'inverse : la page glisse vers la droite.">
      <p><a routerLink="/requests">Retour aux demandes</a></p>
      <p>Le titre de cette page reçoit le focus à chaque changement de page.</p>
    </lc-page>`,
})
class RequestPageComponent {}

const stackRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'requests' },
  { path: 'requests', component: RequestsPageComponent },
  { path: 'requests/42', component: RequestPageComponent },
];

@Component({
  selector: 'lc-app-shell-stack-demo',
  imports: [LcAppShellComponent, LcButtonComponent, RouterOutlet],
  host: { 'data-demo': 'd53' },
  template: `
    <button lcButton fillMode="outline" size="small" type="button" (click)="replay()">Rejouer</button>
    <lc-app-shell navMode="none">
      <strong lcShellHeader>Application</strong>
      <router-outlet />
    </lc-app-shell>`,
})
class AppShellStackDemoComponent {
  private readonly router = inject(Router);

  constructor() {
    // Le routeur global de Storybook (preview.ts) déclare `**` en premier et masque toute route ajoutée par la story : on remplace sa configuration.
    this.router.resetConfig(stackRoutes);
    if (!this.router.navigated || this.router.url === '/') void this.router.navigateByUrl('/requests');
  }

  /** Ouvre la demande depuis la liste, ou revient à la liste depuis la demande : une vraie navigation, donc la vraie transition. */
  protected replay(): void {
    void this.router.navigateByUrl(this.router.url.startsWith('/requests/') ? '/requests' : '/requests/42');
  }
}

const ANIMATION_CODE = `// app.routes.ts : routes avec un titre (lc-page) ; lc-app-shell anime tout seul les changements de page.
export const routes: Routes = [
  { path: 'requests', component: RequestsPage },
  { path: 'requests/:id', component: RequestPage },
  { path: 'plain', component: PlainPage, data: { lcPageTransition: false } }, // sans transition
];

@Component({
  selector: 'app-root',
  imports: [LcAppShellComponent, RouterOutlet],
  template: \`
    <lc-app-shell navMode="none">
      <strong lcShellHeader>Application</strong>
      <router-outlet />
    </lc-app-shell>\`,
})
export class AppComponent {}`;

/**
 * Real page changes in `lc-app-shell`: below 768 px the new page stacks in from the right over the old one, which recedes by 30 % under a veil; above, a fade and a short slide.
 * "Rejouer" opens the request, then goes back to the list on the next press. Narrow the window to a phone width to see the stacking.
 */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  decorators: [
    moduleMetadata({ imports: [AppShellStackDemoComponent, StoryMotionNoticeComponent] }),
    applicationConfig({ providers: [provideLocationMocks()] }),
  ],
  render: () => ({ template: `<lc-story-motion-notice /><lc-app-shell-stack-demo />` }),
};
