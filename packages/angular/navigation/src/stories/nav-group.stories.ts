import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink, provideRouter } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcNavGroupComponent, LcNavItemComponent, LcNavListComponent } from '@lionelcointot/ui-angular/navigation';

@Component({ selector: 'lc-nav-group-page', template: '' })
class PageComponent {}

/** Demo of the `Animation` story: the active item moves from the first to the last item of the list. */
@Component({
  selector: 'lc-nav-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcNavListComponent, LcNavGroupComponent, LcNavItemComponent, RouterLink, LcButtonComponent, StoryMotionNoticeComponent],
  template: `
    <lc-story-motion-notice />
    <div #root>
      <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="replay(root)">Rejouer</button>
      @for (key of demo.keys(); track key) {
        <nav aria-label="Navigation principale" style="max-width:16rem">
          <lc-nav-list>
            <lc-nav-group label="Général">
              <a lcNavItem routerLink="/overview" icon="house">Vue d'ensemble</a>
              <a lcNavItem routerLink="/alerts" icon="triangle-alert" badge="3">Alertes</a>
            </lc-nav-group>
            <lc-nav-group label="Services">
              <a lcNavItem routerLink="/services" icon="activity">Services</a>
              <a lcNavItem routerLink="/settings" icon="settings">Paramètres</a>
            </lc-nav-group>
          </lc-nav-list>
        </nav>
      }
    </div>`,
})
class NavAnimationDemoComponent {
  private readonly router = inject(Router);
  protected readonly demo = replayable({ destroyRef: inject(DestroyRef), play: () => void this.router.navigateByUrl('/settings') });

  constructor() {
    void this.router.navigateByUrl('/overview');
  }

  /** Back to the first item without transition (the list is reinserted), then to the last one. */
  protected async replay(root: HTMLElement): Promise<void> {
    await this.router.navigateByUrl('/overview');
    this.demo.replay(root);
  }
}

type Args = LcNavGroupComponent & { collapsed: boolean };

/**
 * Titled group of navigation items inside `lc-nav-list`, optionally collapsible (`expanded` is a two-way model).
 * `collapsed` belongs to the parent `lc-nav-list` (icon-only rail) and is shown here to preview the combination.
 *
 * Import: `import { LcNavGroupComponent, LcNavListComponent, LcNavItemComponent } from '@lionelcointot/ui-angular/navigation';`
 */
const meta: Meta<Args> = {
  title: 'Navigation/Nav group',
  component: LcNavGroupComponent,
  args: { label: 'Général', collapsible: false, expanded: true, collapsed: false },
  argTypes: { collapsed: { control: 'boolean', description: 'Input of the parent `lc-nav-list`: reduced mode.' } },
  decorators: [
    applicationConfig({
      providers: [provideRouter([{ path: 'overview', component: PageComponent }, { path: 'services', component: PageComponent }, { path: 'alerts', component: PageComponent }, { path: 'settings', component: PageComponent }])],
    }),
    moduleMetadata({ imports: [LcNavListComponent, LcNavGroupComponent, LcNavItemComponent, RouterLink, NavAnimationDemoComponent] }),
  ],
};
export default meta;
type Story = StoryObj<Args>;

const NAV = (collapsed: boolean, collapsible: boolean) => `<nav aria-label="Navigation principale" style="max-width:16rem">
  <lc-nav-list [collapsed]="${collapsed}">
    <lc-nav-group label="Général" [collapsible]="${collapsible}">
      <a lcNavItem routerLink="/overview" icon="house">Vue d'ensemble</a>
      <a lcNavItem routerLink="/alerts" icon="triangle-alert" badge="3">Alertes</a>
    </lc-nav-group>
    <lc-nav-group label="Services" [collapsible]="${collapsible}">
      <a lcNavItem routerLink="/services" icon="activity">Services</a>
      <a lcNavItem routerLink="/settings" icon="settings">Paramètres</a>
    </lc-nav-group>
  </lc-nav-list>
</nav>`;

/** Every input is bound: the first group follows the controls, the second one stays collapsible. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['expanded'] } },
  render: (args) => ({
    props: args,
    template: `<nav aria-label="Navigation principale" style="max-width:16rem">
      <lc-nav-list [collapsed]="collapsed">
        <lc-nav-group [label]="label" [collapsible]="collapsible" [expanded]="expanded">
          <a lcNavItem routerLink="/overview" icon="house">Vue d'ensemble</a>
          <a lcNavItem routerLink="/alerts" icon="triangle-alert" badge="3">Alertes</a>
        </lc-nav-group>
        <lc-nav-group label="Services">
          <a lcNavItem routerLink="/services" icon="activity">Services</a>
          <a lcNavItem routerLink="/settings" icon="settings">Paramètres</a>
        </lc-nav-group>
      </lc-nav-list>
    </nav>`,
  }),
};

/** Two plain groups with titles and a separator between them. */
export const Groups: Story = {
  parameters: fixedExample,
  render: () => ({ template: NAV(false, false) }),
};

/** `collapsible` turns each title into a button that folds its group. */
export const Collapsible: Story = {
  parameters: fixedExample,
  render: () => ({ template: NAV(false, true) }),
};

/** Reduced list: titles hidden on screen but still read by screen readers, thin separator between groups. */
export const ReducedList: Story = {
  parameters: fixedExample,
  render: () => ({ template: NAV(true, false) }),
};

/** Group folded at start, with its state driven by the application through `[(expanded)]`. */
export const FoldedAtStart: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { open: signal(false) },
    template: `<nav aria-label="Navigation principale" style="max-width:16rem"><lc-nav-list>
      <lc-nav-group label="Avancé" [collapsible]="true" [(expanded)]="open">
        <a lcNavItem routerLink="/settings" icon="settings">Paramètres</a>
      </lc-nav-group></lc-nav-list></nav>`,
  }),
};

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LcNavGroupComponent, LcNavItemComponent, LcNavListComponent } from '@lionelcointot/ui-angular/navigation';

@Component({
  selector: 'app-example',
  imports: [LcNavListComponent, LcNavGroupComponent, LcNavItemComponent, RouterLink],
  template: \`
    <nav aria-label="Navigation principale">
      <lc-nav-list>
        <lc-nav-group label="Général">
          <a lcNavItem routerLink="/overview" icon="house">Vue d'ensemble</a>
          <a lcNavItem routerLink="/alerts" icon="triangle-alert">Alertes</a>
        </lc-nav-group>
        <lc-nav-group label="Services">
          <a lcNavItem routerLink="/services" icon="activity">Services</a>
          <a lcNavItem routerLink="/settings" icon="settings">Paramètres</a>
        </lc-nav-group>
      </lc-nav-list>
    </nav>\`,
})
export class ExampleComponent {}`;

/** The active background of `lc-nav-list` slides to the newly active item. "Rejouer" shows the first item again without transition, then goes to the last one. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-nav-animation-demo />' }),
};
