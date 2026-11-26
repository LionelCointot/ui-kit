import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import * as kit from '@lionelcointot/ui-angular';
import { LcNavItemComponent } from './nav-item.component';
import { LcNavListComponent } from './nav-list.component';

// Acceptation de docs/specs/2026-12-mouvement-v2.md, T2 (§5.1 « Registre de navigation », §5.3) : `a[lcNavItem]` reçoit l'entrée `primary` et s'inscrit dans
// `LcNavRegistry` sous la forme `{ url, label, icon, primary }`, dans l'ordre de la navigation.
// Deux choix que la spec ne fixe pas, à confirmer à la relecture : le membre qui expose la liste (ce test lit `items`, signal ou tableau) et la forme de
// l'entrée `primary` (attribut booléen nu, `primary`, donc `booleanAttribute` ; pas de liaison `[primary]`, qui ferait échouer la compilation de toute la suite).
interface RegistryEntry { url: string; label: string; icon?: string; primary: boolean }
const registryToken = () => (kit as unknown as Record<string, unknown>)['LcNavRegistry'] as new () => { items: unknown };
const entries = (): RegistryEntry[] => {
  const items = TestBed.inject(registryToken()).items;
  return (typeof items === 'function' ? (items as () => RegistryEntry[])() : items) as RegistryEntry[];
};

@Component({ template: '' })
class BlankComponent {}

@Component({
  imports: [LcNavListComponent, LcNavItemComponent, RouterLink],
  template: `
    <lc-nav-list>
      <a lcNavItem routerLink="/credit" icon="landmark" primary>Crédit</a>
      <a lcNavItem routerLink="/budget" icon="calculator">Budget</a>
      <a lcNavItem routerLink="/parametres" icon="settings">Paramètres</a>
      <a lcNavItem routerLink="/aide" icon="info" primary>Aide</a>
    </lc-nav-list>
  `,
})
class NavHostComponent {}

describe('T2 : a[lcNavItem] et LcNavRegistry', () => {
  const setup = async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(['credit', 'budget', 'parametres', 'aide'].map((path) => ({ path, component: BlankComponent })))] });
    const fixture = TestBed.createComponent(NavHostComponent);
    await fixture.whenStable();
    return fixture;
  };

  it('LcNavRegistry est exporté par @lionelcointot/ui-angular', () => {
    expect(registryToken()).toBeDefined();
  });

  it('chaque entrée s\'inscrit avec { url, label, icon, primary }, dans l\'ordre de la navigation', async () => {
    await setup();
    expect(entries().map(({ url, label, icon, primary }) => ({ url, label, icon, primary }))).toEqual([
      { url: '/credit', label: 'Crédit', icon: 'landmark', primary: true },
      { url: '/budget', label: 'Budget', icon: 'calculator', primary: false },
      { url: '/parametres', label: 'Paramètres', icon: 'settings', primary: false },
      { url: '/aide', label: 'Aide', icon: 'info', primary: true },
    ]);
  });
});
