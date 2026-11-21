import { Component, input, signal } from '@angular/core';
import { RouterLink, provideRouter, withHashLocation } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcNavGroupComponent, LcNavItemComponent, LcNavListComponent, LcTabComponent, LcTabsComponent } from '@lionelcointot/ui-angular/navigation';

// Fixtures de la spec 2026-11-mouvement (CA-2 à CA-5, CA-14, CA-24) : pilotées par `node tools/qa/storybook-browser.mjs motion`, sans `play`.

@Component({ selector: 'lc-motion-page', template: '' })
class PageComponent {}

interface Tab { id: string; label: string }
const TABS: Tab[] = [
  { id: 'a', label: 'Synthèse' }, { id: 'b', label: 'Données' }, { id: 'c', label: 'Graphiques' }, { id: 'd', label: 'Historique complet' },
  { id: 'e', label: 'Exécutions récentes' }, { id: 'f', label: 'Couverture' }, { id: 'g', label: 'Paramètres avancés' }, { id: 'h', label: 'Journal' },
];

/** `none` : tous les onglets désactivés (aucun sélectionné). `add`, `remove`, `relabel` : boutons de mutation (CA-4b). */
@Component({
  selector: 'lc-motion-tabs',
  imports: [LcTabsComponent, LcTabComponent],
  template: `<div style="padding:8px">
    <button id="add" type="button" (click)="add()">Ajouter</button>
    <button id="remove" type="button" (click)="remove()">Retirer</button>
    <button id="relabel" type="button" (click)="relabel()">Libellé</button>
    <lc-tabs ariaLabel="QA" [(selected)]="selected">
      @for (tab of tabs(); track tab.id) {
        <lc-tab [id]="tab.id" [label]="tab.label" [disabled]="none()"><p>{{ tab.label }}</p></lc-tab>
      }
    </lc-tabs>
  </div>`,
})
class MotionTabsComponent {
  readonly none = input(false);
  protected readonly selected = signal<string | null>('b');
  protected readonly tabs = signal<Tab[]>(TABS);
  protected add(): void { this.tabs.update((all) => [{ id: 'x', label: 'Ajouté' }, ...all]); }
  protected remove(): void { this.tabs.update((all) => all.filter((tab) => tab.id !== 'a')); }
  protected relabel(): void { this.tabs.update((all) => all.map((tab) => (tab.id === 'a' ? { ...tab, label: 'Synthèse du projet, très détaillée' } : tab))); }
}

/** Liste avec deux groupes repliables (`g2` : second groupe déplié au départ) et un élément hors liste (CA-5d). Route de départ : `#/a`, `#/d`… */
@Component({
  selector: 'lc-motion-nav',
  imports: [LcNavListComponent, LcNavGroupComponent, LcNavItemComponent, RouterLink],
  template: `<nav aria-label="QA" style="max-inline-size:16rem">
    <lc-nav-list>
      <lc-nav-group label="Un" collapsible>
        <a id="item-a" lcNavItem routerLink="/a" icon="house">Alpha</a>
        <a id="item-b" lcNavItem routerLink="/b" icon="activity">Bravo</a>
        <a id="item-c" lcNavItem routerLink="/c" icon="settings">Charlie</a>
      </lc-nav-group>
      <lc-nav-group label="Deux" collapsible [expanded]="g2()">
        <a id="item-d" lcNavItem routerLink="/d" icon="house">Delta</a>
        <a id="item-e" lcNavItem routerLink="/e" icon="settings">Echo</a>
      </lc-nav-group>
    </lc-nav-list>
  </nav>
  <nav aria-label="Hors liste" style="margin-block-start:16px"><a id="item-out" lcNavItem routerLink="/out" icon="house">Hors liste</a></nav>`,
})
class MotionNavComponent {
  readonly g2 = input(true);
}

const meta: Meta = {
  title: 'QA/Motion/Navigation',
  tags: ['!autodocs'],
  decorators: [
    moduleMetadata({ imports: [MotionTabsComponent, MotionNavComponent] }),
    applicationConfig({ providers: [provideRouter(['a', 'b', 'c', 'd', 'e', 'out'].map((path) => ({ path, component: PageComponent })), withHashLocation())] }),
  ],
  args: { none: false, g2: true },
};
export default meta;
type Story = StoryObj;

export const Tabs: Story = { render: (args) => ({ props: args, template: `<lc-motion-tabs [none]="none" />` }) };
export const Nav: Story = { render: (args) => ({ props: args, template: `<lc-motion-nav [g2]="g2" />` }) };
