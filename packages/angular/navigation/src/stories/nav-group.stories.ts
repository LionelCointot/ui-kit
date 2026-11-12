import { Component, signal } from '@angular/core';
import { RouterLink, provideRouter } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcNavGroupComponent } from '../nav-group/nav-group.component';
import { LcNavItemComponent } from '../nav-list/nav-item.component';
import { LcNavListComponent } from '../nav-list/nav-list.component';

@Component({ selector: 'lc-nav-group-page', template: '' })
class PageComponent {}

const meta: Meta<LcNavGroupComponent> = {
  title: 'Navigation/Groupe de navigation',
  component: LcNavGroupComponent,
  decorators: [
    applicationConfig({
      providers: [provideRouter([{ path: 'overview', component: PageComponent }, { path: 'services', component: PageComponent }, { path: 'alerts', component: PageComponent }, { path: 'settings', component: PageComponent }])],
    }),
    moduleMetadata({ imports: [LcNavListComponent, LcNavGroupComponent, LcNavItemComponent, RouterLink] }),
  ],
};
export default meta;
type Story = StoryObj<LcNavGroupComponent>;

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

export const Defaut: Story = {
  render: () => ({ template: NAV(false, false) }),
};

export const Repliable: Story = {
  render: () => ({ template: NAV(false, true) }),
};

/** Mode réduit : titres masqués à l'écran mais lus, séparateur fin entre les groupes. */
export const ListeReduite: Story = {
  render: () => ({ template: NAV(true, false) }),
};

/** Groupe replié au départ, état piloté par l'application. */
export const ReplieAuDepart: Story = {
  render: () => ({
    props: { open: signal(false) },
    template: `<nav aria-label="Navigation principale" style="max-width:16rem"><lc-nav-list>
      <lc-nav-group label="Avancé" [collapsible]="true" [(expanded)]="open">
        <a lcNavItem routerLink="/settings" icon="settings">Paramètres</a>
      </lc-nav-group></lc-nav-list></nav>`,
  }),
};
