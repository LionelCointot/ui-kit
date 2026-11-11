import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterLink, provideRouter } from '@angular/router';
import { LcNavItemComponent } from '../nav-list/nav-item.component';
import { LcNavListComponent } from '../nav-list/nav-list.component';
import { LcNavGroupComponent } from './nav-group.component';

@Component({ template: '' })
class BlankComponent {}

@Component({
  imports: [LcNavListComponent, LcNavGroupComponent, LcNavItemComponent, RouterLink],
  template: `
    <lc-nav-list [collapsed]="collapsed()">
      <lc-nav-group label="Général">
        <a lcNavItem routerLink="/accueil" icon="house">Accueil</a>
        <a lcNavItem routerLink="/activite" icon="activity">Activité</a>
      </lc-nav-group>
      <lc-nav-group label="Projets" [collapsible]="collapsible()" [(expanded)]="expanded">
        <a lcNavItem routerLink="/alpha" icon="git-branch">Alpha</a>
        <a lcNavItem routerLink="/beta" icon="git-branch">Beta</a>
      </lc-nav-group>
    </lc-nav-list>
  `,
})
class NavGroupHostComponent {
  readonly collapsed = signal(false);
  readonly collapsible = signal(false);
  readonly expanded = signal(true);
}

@Component({
  imports: [LcNavGroupComponent],
  template: `<lc-nav-group label="Seul" collapsible><span class="child">contenu</span></lc-nav-group>`,
})
class StandaloneGroupHostComponent {}

describe('LcNavGroupComponent', () => {
  async function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter(['accueil', 'activite', 'alpha', 'beta'].map((path) => ({ path, component: BlankComponent })))],
    });
    const fixture = TestBed.createComponent(NavGroupHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const groups = () => [...element.querySelectorAll<HTMLElement>('lc-nav-group')];
    const update = async (change: (host: NavGroupHostComponent) => void) => {
      change(fixture.componentInstance);
      await fixture.whenStable();
    };
    return { fixture, element, groups, update };
  }

  // CA-K8.1
  it('CA-K8.1 : chaque groupe est un role="group" nommé par son titre (aria-labelledby)', async () => {
    const { groups } = await setup();
    for (const [index, label] of ['Général', 'Projets'].entries()) {
      const group = groups()[index].querySelector('[role=group]')!;
      const title = groups()[index].querySelector(`#${CSS.escape(group.getAttribute('aria-labelledby')!)}`)!;
      expect(title.textContent!.trim()).toBe(label);
    }
  });

  it('les identifiants de titre et de contenu sont uniques entre groupes', async () => {
    const { element } = await setup();
    const ids = [...element.querySelectorAll('lc-nav-group [id]')].map((node) => node.id);
    expect(ids.length).toBe(4);
    expect(new Set(ids).size).toBe(4);
  });

  it('sans collapsible : titre en texte (pas de bouton), éléments visibles', async () => {
    const { groups } = await setup();
    const general = groups()[0];
    expect(general.querySelector('button')).toBeNull();
    expect(general.querySelector('.lc-nav-group__title')!.tagName).toBe('P');
    expect(general.querySelector('.lc-nav-group__title')!.hasAttribute('aria-expanded')).toBe(false);
    expect(general.querySelector<HTMLElement>('.lc-nav-group__items')!.hidden).toBe(false);
    expect(general.querySelectorAll('a[lcNavItem]').length).toBe(2);
  });

  // CA-K8.1 (mode réduit)
  it('CA-K8.1 : en mode réduit, le titre reste dans le DOM (arbre d\'accessibilité) et le groupe porte la classe du séparateur', async () => {
    const { groups, update } = await setup();
    await update((host) => host.collapsed.set(true));
    for (const [index, label] of ['Général', 'Projets'].entries()) {
      expect(groups()[index].classList).toContain('lc-nav-group--list-collapsed');
      const group = groups()[index].querySelector('[role=group]')!;
      expect(groups()[index].querySelector(`#${CSS.escape(group.getAttribute('aria-labelledby')!)}`)!.textContent!.trim()).toBe(label);
      const title = groups()[index].querySelector<HTMLElement>('.lc-nav-group__title')!;
      expect(title.hidden).toBe(false);
      expect(title.getAttribute('aria-hidden')).toBeNull();
    }
  });

  it('hors mode réduit : pas de classe de séparateur', async () => {
    const { groups } = await setup();
    expect(groups()[0].classList).not.toContain('lc-nav-group--list-collapsed');
  });

  it('utilisable hors de lc-nav-list (liste absente)', async () => {
    const fixture = TestBed.createComponent(StandaloneGroupHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role=group]')).not.toBeNull();
    expect(element.querySelector('button')!.getAttribute('aria-expanded')).toBe('true');
  });

  // CA-K8.2
  describe('collapsible', () => {
    const toggle = (group: HTMLElement) => group.querySelector<HTMLButtonElement>('button.lc-nav-group__toggle')!;
    const items = (group: HTMLElement) => group.querySelector<HTMLElement>('.lc-nav-group__items')!;

    it('CA-K8.2 : le titre devient un bouton avec aria-expanded et aria-controls vers les éléments', async () => {
      const { groups, update } = await setup();
      await update((host) => host.collapsible.set(true));
      const projects = groups()[1];
      expect(toggle(projects).getAttribute('type')).toBe('button');
      expect(toggle(projects).getAttribute('aria-expanded')).toBe('true');
      expect(toggle(projects).getAttribute('aria-controls')).toBe(items(projects).id);
      expect(toggle(projects).textContent).toContain('Projets');
      expect(projects.querySelector('[role=group]')!.getAttribute('aria-labelledby')).toBe(toggle(projects).id);
      // Le groupe non collapsible n'est pas affecté.
      expect(groups()[0].querySelector('button')).toBeNull();
    });

    it('CA-K8.2 : activer le bouton (clic natif = Entrée / Espace) replie puis déplie, aria-expanded à jour', async () => {
      const { fixture, groups, update } = await setup();
      await update((host) => host.collapsible.set(true));
      const projects = groups()[1];
      toggle(projects).click();
      await fixture.whenStable();
      expect(toggle(projects).getAttribute('aria-expanded')).toBe('false');
      expect(items(projects).hidden).toBe(true);
      expect(fixture.componentInstance.expanded()).toBe(false);
      toggle(projects).click();
      await fixture.whenStable();
      expect(toggle(projects).getAttribute('aria-expanded')).toBe('true');
      expect(items(projects).hidden).toBe(false);
      expect(fixture.componentInstance.expanded()).toBe(true);
    });

    it('CA-K8.2 : replié, le conteneur des liens est hidden (hors tabulation et arbre d\'accessibilité) ; les liens restent dans le DOM', async () => {
      const { groups, update } = await setup();
      await update((host) => { host.collapsible.set(true); host.expanded.set(false); });
      const projects = groups()[1];
      expect(toggle(projects).getAttribute('aria-expanded')).toBe('false');
      expect(items(projects).hidden).toBe(true);
      expect(items(projects).querySelectorAll('a').length).toBe(2);
      expect(items(projects).hasAttribute('hidden')).toBe(true);
    });

    it('le bouton est le seul arrêt de tabulation du titre : focalisable, sans tabindex négatif', async () => {
      const { groups, update } = await setup();
      await update((host) => host.collapsible.set(true));
      const button = toggle(groups()[1]);
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('tabindex')).toBeNull();
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('sans collapsible, expanded=false n\'a aucun effet : les éléments restent visibles', async () => {
      const { groups, update } = await setup();
      await update((host) => host.expanded.set(false));
      expect(groups()[1].querySelector<HTMLElement>('.lc-nav-group__items')!.hidden).toBe(false);
    });

    it('mode réduit : un groupe collapsible replié reste déplié, titre non bouton', async () => {
      const { groups, update } = await setup();
      await update((host) => { host.collapsible.set(true); host.expanded.set(false); host.collapsed.set(true); });
      const projects = groups()[1];
      expect(projects.querySelector('button')).toBeNull();
      expect(items(projects).hidden).toBe(false);
      await update((host) => host.collapsed.set(false));
      expect(toggle(projects).getAttribute('aria-expanded')).toBe('false');
      expect(items(projects).hidden).toBe(true);
    });

    it('le composant autonome (hors lc-nav-list) se replie aussi', async () => {
      const fixture = TestBed.createComponent(StandaloneGroupHostComponent);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      element.querySelector<HTMLButtonElement>('button')!.click();
      await fixture.whenStable();
      expect(element.querySelector<HTMLElement>('.lc-nav-group__items')!.hidden).toBe(true);
    });
  });

  // CA-K8.3
  it('CA-K8.3 : les a[lcNavItem] d\'un groupe gardent aria-current="page" (aussi replié, puis redéplié)', async () => {
    const { fixture, element, update } = await setup();
    await update((host) => host.collapsible.set(true));
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/alpha');
    await fixture.whenStable();
    const link = (name: string) => [...element.querySelectorAll('a')].find((anchor) => anchor.textContent!.includes(name))!;
    expect(link('Alpha').getAttribute('aria-current')).toBe('page');
    expect(link('Beta').getAttribute('aria-current')).toBeNull();
    expect(link('Accueil').getAttribute('aria-current')).toBeNull();
    await router.navigateByUrl('/accueil');
    await fixture.whenStable();
    expect(link('Accueil').getAttribute('aria-current')).toBe('page');
    expect(link('Alpha').getAttribute('aria-current')).toBeNull();
    element.querySelector<HTMLButtonElement>('button.lc-nav-group__toggle')!.click();
    await fixture.whenStable();
    await router.navigateByUrl('/beta');
    await fixture.whenStable();
    expect(link('Beta').getAttribute('aria-current')).toBe('page');
  });
});
