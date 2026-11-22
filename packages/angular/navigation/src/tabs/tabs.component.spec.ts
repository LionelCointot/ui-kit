import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcTabComponent, LcTabContentDirective } from './tab.component';
import { LcTabsComponent } from './tabs.component';

@Component({
  imports: [LcTabsComponent, LcTabComponent, LcTabContentDirective],
  template: `
    <lc-tabs ariaLabel="Résultats" [(selected)]="selected" [activation]="activation()">
      <lc-tab id="synthese" label="Synthèse"><p id="synthese-content">Synthèse du prêt</p></lc-tab>
      <lc-tab id="echeances" label="Échéances" icon="table">
        <ng-template lcTabContent><p id="echeances-content">Tableau</p></ng-template>
      </lc-tab>
      <lc-tab id="bloque" label="Bloqué" [disabled]="true">x</lc-tab>
      <lc-tab id="graphiques" label="Graphiques"><ng-template lcTabContent><p>Courbes</p></ng-template></lc-tab>
    </lc-tabs>
  `,
})
class TabsHostComponent {
  readonly selected = signal<string | null>(null);
  readonly activation = signal<'automatic' | 'manual'>('automatic');
}

describe('LcTabsComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(TabsHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const tabs = () => Array.from(element.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const panels = () => Array.from(element.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    return { fixture, element, tabs, panels };
  }

  const press = (button: HTMLElement, key: string) => button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  it('expose tablist, tab et tabpanel reliés entre eux, premier onglet actif par défaut', async () => {
    const { element, tabs, panels } = await setup();
    expect(element.querySelector('[role="tablist"]')!.getAttribute('aria-label')).toBe('Résultats');
    expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    expect(tabs()[0].getAttribute('aria-controls')).toBe(panels()[0].id);
    expect(panels()[0].getAttribute('aria-labelledby')).toBe(tabs()[0].id);
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(panels()[0].hidden).toBe(false);
    expect(panels()[1].hidden).toBe(true);
    expect(element.querySelector('#synthese-content')).not.toBeNull();
  });

  it('crée le contenu paresseux à la première sélection seulement', async () => {
    const { fixture, element, tabs, panels } = await setup();
    expect(element.querySelector('#echeances-content')).toBeNull();
    tabs()[1].click();
    await fixture.whenStable();
    expect(element.querySelector('#echeances-content')).not.toBeNull();
    expect(fixture.componentInstance.selected()).toBe('echeances');
    tabs()[0].click();
    await fixture.whenStable();
    expect(panels()[1].hidden).toBe(true);
    expect(element.querySelector('#echeances-content')).not.toBeNull();
  });

  it('les flèches, Début et Fin déplacent la sélection en sautant l\'onglet désactivé', async () => {
    const { fixture, tabs } = await setup();
    press(tabs()[0], 'ArrowRight');
    await fixture.whenStable();
    expect(fixture.componentInstance.selected()).toBe('echeances');
    press(tabs()[1], 'ArrowRight');
    await fixture.whenStable();
    expect(fixture.componentInstance.selected()).toBe('graphiques');
    press(tabs()[3], 'ArrowRight');
    await fixture.whenStable();
    expect(fixture.componentInstance.selected()).toBe('synthese');
    press(tabs()[0], 'End');
    await fixture.whenStable();
    expect(fixture.componentInstance.selected()).toBe('graphiques');
    press(tabs()[3], 'Home');
    await fixture.whenStable();
    expect(fixture.componentInstance.selected()).toBe('synthese');
  });

  it('en activation manuelle, la flèche déplace le focus sans sélectionner', async () => {
    const { fixture, tabs } = await setup();
    fixture.componentInstance.activation.set('manual');
    await fixture.whenStable();
    press(tabs()[0], 'ArrowRight');
    await fixture.whenStable();
    expect(fixture.componentInstance.selected()).toBeNull();
    expect(tabs()[1].tabIndex).toBe(0);
    tabs()[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selected()).toBe('echeances');
  });
});

@Component({
  imports: [LcTabsComponent, LcTabComponent],
  template: `
    <lc-tabs ariaLabel="Dossier" [(selected)]="selected" [activation]="activation()">
      <lc-tab id="synthese" label="Synthèse">a</lc-tab>
      <lc-tab id="echeances" label="Échéances">b</lc-tab>
      <lc-tab id="assurance" label="Assurance">c</lc-tab>
      <lc-tab id="fiscalite" label="Fiscalité">d</lc-tab>
      <lc-tab id="travaux" label="Travaux">e</lc-tab>
      <lc-tab id="parametres" label="Paramètres">f</lc-tab>
    </lc-tabs>
  `,
})
class ScrollingTabsHostComponent {
  readonly selected = signal<string | null>(null);
  readonly activation = signal<'automatic' | 'manual'>('automatic');
}

/** Six onglets ; marge de défilement (largeur du fondu) simulée à 40 px de chaque côté. */
const TAB_COUNT = 6;
const MARGIN = 40;

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  trigger(): void {
    this.callback();
  }
}

interface Scene {
  width: number;
  tabWidth: number;
  scrollLeft: number;
  rtl: boolean;
  /** `undefined` : `matchMedia` absent ; sinon valeur de `prefers-reduced-motion: reduce`. */
  reduced: boolean | undefined;
  scrollBy: ReturnType<typeof vi.fn>;
  pageScroll: ReturnType<typeof vi.fn>[];
}

/**
 * Simule la mise en page : jsdom ne mesure rien. La rangée mesure `width` px pour `TAB_COUNT * tabWidth` px de contenu ;
 * onglet i en [i * tabWidth, (i + 1) * tabWidth] depuis le bord de départ (droite en RTL, `scrollLeft` négatif vers la gauche).
 * `scrollBy` applique le décalage borné au défilement possible et émet `scroll`, comme un navigateur.
 */
function mockLayout(init: Partial<Omit<Scene, 'scrollBy' | 'pageScroll'>> = {}): Scene {
  const view = document.defaultView as Window & typeof globalThis;
  const scene: Scene = { width: 300, tabWidth: 100, scrollLeft: 0, rtl: false, reduced: false, scrollBy: vi.fn(), pageScroll: [], ...init };
  const isList = (element: Element) => element.classList.contains('lc-tabs__list');
  const content = () => TAB_COUNT * scene.tabWidth;
  const max = () => Math.max(0, content() - scene.width);

  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) { return isList(this) ? content() : 0; });
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) { return isList(this) ? scene.width : 0; });
  vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockImplementation(function (this: Element) { return isList(this) ? scene.scrollLeft : 0; });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (isList(this)) return new DOMRect(0, 0, scene.width, 40);
    if (!this.classList.contains('lc-tabs__tab')) return new DOMRect(0, 0, 0, 0);
    const index = Array.from(this.parentElement!.querySelectorAll(':scope > .lc-tabs__tab')).indexOf(this);
    const left = scene.rtl ? scene.width - (index + 1) * scene.tabWidth - scene.scrollLeft : index * scene.tabWidth - scene.scrollLeft;
    return new DOMRect(left, 0, scene.tabWidth, 40);
  });
  const getComputedStyle = view.getComputedStyle.bind(view);
  vi.spyOn(view, 'getComputedStyle').mockImplementation(((element: Element, pseudo?: string | null) =>
    isList(element)
      ? ({ direction: scene.rtl ? 'rtl' : 'ltr', scrollPaddingLeft: `${MARGIN}px` } as unknown as CSSStyleDeclaration)
      : getComputedStyle(element, pseudo)) as typeof view.getComputedStyle);

  scene.scrollBy = vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
    const next = scene.scrollLeft + (options.left ?? 0);
    scene.scrollLeft = scene.rtl ? Math.min(0, Math.max(-max(), next)) : Math.max(0, Math.min(max(), next));
    this.dispatchEvent(new Event('scroll'));
  });
  Object.defineProperty(Element.prototype, 'scrollBy', { configurable: true, writable: true, value: scene.scrollBy });

  if (scene.reduced !== undefined) {
    const matches = (query: string) => scene.reduced === true && query === '(prefers-reduced-motion: reduce)';
    Object.defineProperty(view, 'matchMedia', { configurable: true, writable: true, value: vi.fn((query: string) => ({ matches: matches(query) })) });
  }

  // La page ne doit jamais défiler : tout appel de défilement de la fenêtre ou `scrollIntoView` est un échec.
  const scrollIntoView = vi.fn();
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: scrollIntoView });
  scene.pageScroll = [scrollIntoView, vi.spyOn(view, 'scrollTo').mockImplementation(() => undefined), vi.spyOn(view, 'scrollBy').mockImplementation(() => undefined)];
  return scene;
}

describe('LcTabsComponent : rangée défilante', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete (Element.prototype as { scrollBy?: unknown }).scrollBy;
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    delete (document.defaultView as { matchMedia?: unknown }).matchMedia;
  });

  async function setupRow(selected: string | null = null) {
    const fixture = TestBed.createComponent(ScrollingTabsHostComponent);
    fixture.componentInstance.selected.set(selected);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const list = element.querySelector<HTMLElement>('[role="tablist"]')!;
    const tabs = () => Array.from(element.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const fades = () => ({ left: list.classList.contains('lc-tabs__list--fade-left'), right: list.classList.contains('lc-tabs__list--fade-right') });
    return { fixture, list, tabs, fades };
  }

  const press = (button: HTMLElement, key: string) => button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  function expectPageUntouched(scene: Scene): void {
    expect(window.scrollY).toBe(0);
    scene.pageScroll.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  }

  describe('fondus de bord', () => {
    it('rangée qui déborde, au départ : fondu à droite seulement', async () => {
      mockLayout();
      const { fades } = await setupRow();
      expect(fades()).toEqual({ left: false, right: true });
    });

    it('au défilement : fondus des deux côtés au milieu, plus de fondu à droite en bout (tolérance sous le pixel)', async () => {
      const scene = mockLayout();
      const { fixture, list, fades } = await setupRow();
      const scrollTo = async (scrollLeft: number) => {
        scene.scrollLeft = scrollLeft;
        list.dispatchEvent(new Event('scroll'));
        await fixture.whenStable();
      };
      await scrollTo(150);
      expect(fades()).toEqual({ left: true, right: true });
      await scrollTo(300);
      expect(fades()).toEqual({ left: true, right: false });
      await scrollTo(299.5);
      expect(fades()).toEqual({ left: true, right: false });
      await scrollTo(0.5);
      expect(fades()).toEqual({ left: false, right: true });
    });

    it('rangée qui ne déborde pas : aucun fondu, même après Fin', async () => {
      const scene = mockLayout({ tabWidth: 50 });
      const { fixture, tabs, fades } = await setupRow();
      expect(fades()).toEqual({ left: false, right: false });
      press(tabs()[0], 'End');
      await fixture.whenStable();
      expect(fades()).toEqual({ left: false, right: false });
      expect(scene.scrollLeft).toBe(0);
    });
  });

  describe('sélection d\'un onglet hors zone', () => {
    it('au clic : la rangée défile jusqu\'à l\'onglet, avec la marge du fondu, sans faire défiler la page', async () => {
      const scene = mockLayout();
      const { fixture, tabs, fades } = await setupRow();
      tabs()[3].click(); // onglet [300, 400] : son bord droit doit arriver à 300 - 40
      await fixture.whenStable();
      expect(scene.scrollLeft).toBe(140);
      expect(scene.scrollBy).toHaveBeenLastCalledWith({ left: 140, behavior: 'smooth' });
      expect(fades()).toEqual({ left: true, right: true });
      expectPageUntouched(scene);
    });

    it('avec la flèche droite : la rangée suit la sélection', async () => {
      const scene = mockLayout();
      const { fixture, tabs } = await setupRow();
      for (let index = 0; index < 3; index += 1) {
        press(tabs()[index], 'ArrowRight');
        await fixture.whenStable();
      }
      expect(fixture.componentInstance.selected()).toBe('fiscalite');
      expect(scene.scrollLeft).toBe(140);
      expectPageUntouched(scene);
    });

    it('avec Fin puis Début : défilement jusqu\'au bout, plus de fondu à droite, puis retour, plus de fondu à gauche', async () => {
      const scene = mockLayout();
      const { fixture, tabs, fades } = await setupRow();
      press(tabs()[0], 'End');
      await fixture.whenStable();
      expect(scene.scrollLeft).toBe(300);
      expect(fades()).toEqual({ left: true, right: false });
      press(tabs()[5], 'Home');
      await fixture.whenStable();
      expect(scene.scrollLeft).toBe(0);
      expect(fades()).toEqual({ left: false, right: true });
      expectPageUntouched(scene);
    });

    it('en activation manuelle, le focus au clavier ramène aussi l\'onglet sans le sélectionner', async () => {
      const scene = mockLayout();
      const { fixture, tabs } = await setupRow();
      fixture.componentInstance.activation.set('manual');
      await fixture.whenStable();
      press(tabs()[0], 'End');
      await fixture.whenStable();
      expect(fixture.componentInstance.selected()).toBeNull();
      expect(scene.scrollLeft).toBe(300);
      expectPageUntouched(scene);
    });

    it('un onglet déjà visible ne déplace pas la rangée', async () => {
      const scene = mockLayout();
      await setupRow('echeances'); // onglet [100, 200], dans [40, 260]
      expect(scene.scrollBy).not.toHaveBeenCalled();
      expect(scene.scrollLeft).toBe(0);
    });

    it('sélection initiale hors zone : ramenée au premier rendu', async () => {
      const scene = mockLayout();
      const { fades } = await setupRow('parametres');
      expect(scene.scrollLeft).toBe(300);
      expect(fades()).toEqual({ left: true, right: false });
      expectPageUntouched(scene);
    });

    it('sélection initiale tardive : ramenée dès qu\'elle arrive', async () => {
      const scene = mockLayout();
      const { fixture, fades } = await setupRow();
      expect(scene.scrollLeft).toBe(0);
      fixture.componentInstance.selected.set('parametres');
      await fixture.whenStable();
      expect(scene.scrollLeft).toBe(300);
      expect(fades()).toEqual({ left: true, right: false });
      expectPageUntouched(scene);
    });
  });

  describe('redimensionnement', () => {
    it('le ResizeObserver observe la rangée, recalcule les fondus dans les deux sens et se déconnecte à la destruction', async () => {
      const scene = mockLayout({ width: 600 }); // contenu 600 : rien ne déborde
      const { fixture, list, fades } = await setupRow();
      expect(fades()).toEqual({ left: false, right: false });
      expect(FakeResizeObserver.instances.length).toBe(1);
      const observer = FakeResizeObserver.instances[0];
      expect(observer.observe).toHaveBeenCalledWith(list);

      scene.width = 300;
      observer.trigger();
      await fixture.whenStable();
      expect(fades()).toEqual({ left: false, right: true });

      scene.width = 600;
      observer.trigger();
      await fixture.whenStable();
      expect(fades()).toEqual({ left: false, right: false });

      fixture.destroy();
      expect(observer.disconnect).toHaveBeenCalled();
    });

    it('ResizeObserver absent : rendu sans erreur, fondus calculés au rendu', async () => {
      vi.stubGlobal('ResizeObserver', undefined);
      mockLayout();
      const { fades } = await setupRow();
      expect(fades()).toEqual({ left: false, right: true });
      expect(FakeResizeObserver.instances.length).toBe(0);
    });
  });

  describe('mouvement réduit', () => {
    it.each([
      ['prefers-reduced-motion actif', true, 'auto'],
      ['prefers-reduced-motion inactif', false, 'smooth'],
      ['matchMedia absent', undefined, 'smooth'],
    ] as const)('%s : défilement « %s »', async (_label, reduced, behavior) => {
      const scene = mockLayout({ reduced });
      const { fixture, tabs } = await setupRow();
      tabs()[3].click();
      await fixture.whenStable();
      expect(scene.scrollBy).toHaveBeenLastCalledWith({ left: 140, behavior });
      if (reduced !== undefined) {
        const matchMedia = (document.defaultView as Window).matchMedia as unknown as ReturnType<typeof vi.fn>;
        expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
      }
    });
  });

  describe('lecture de droite à gauche', () => {
    it('le fondu à gauche signale les onglets cachés au départ (côté de fin), puis s\'inverse en bout', async () => {
      const scene = mockLayout({ rtl: true });
      const { fixture, tabs, fades } = await setupRow();
      expect(scene.scrollLeft).toBe(0);
      expect(fades()).toEqual({ left: true, right: false });

      press(tabs()[0], 'End'); // dernier onglet, tout à gauche : défilement négatif
      await fixture.whenStable();
      expect(scene.scrollLeft).toBe(-300);
      expect(fades()).toEqual({ left: false, right: true });

      press(tabs()[5], 'Home');
      await fixture.whenStable();
      expect(scene.scrollLeft).toBe(0);
      expect(fades()).toEqual({ left: true, right: false });
      expectPageUntouched(scene);
    });

    it('au milieu : fondus des deux côtés', async () => {
      const scene = mockLayout({ rtl: true });
      const { fixture, list, fades } = await setupRow();
      scene.scrollLeft = -150;
      list.dispatchEvent(new Event('scroll'));
      await fixture.whenStable();
      expect(fades()).toEqual({ left: true, right: true });
    });
  });
});

describe('LcTabsComponent, indicateur', () => {
  it('est masqué à la présentation et sans onglet sélectionné, absent de l\'arbre d\'accessibilité', async () => {
    @Component({ imports: [LcTabsComponent, LcTabComponent], template: `<lc-tabs><lc-tab id="a" label="A" [disabled]="true">a</lc-tab></lc-tabs>` })
    class NoSelectionHostComponent {}
    const fixture = TestBed.createComponent(NoSelectionHostComponent);
    await fixture.whenStable();
    const indicator = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.lc-tabs__indicator')!;
    expect(indicator.hidden).toBe(true);
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
    expect(indicator.getAttribute('role')).toBe('presentation');
    expect((fixture.nativeElement as HTMLElement).querySelector('lc-tabs')!.classList.contains('lc-tabs--ready')).toBe(false);
  });

  it('pose lc-tabs--ready après la première mesure, indicateur visible', async () => {
    const fixture = TestBed.createComponent(TabsHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('lc-tabs')!.classList.contains('lc-tabs--ready')).toBe(true);
    expect(element.querySelector<HTMLElement>('.lc-tabs__indicator')!.hidden).toBe(false);
  });
});

@Component({
  imports: [LcTabsComponent, LcTabComponent],
  template: `
    <lc-tabs [(selected)]="selected">
      @for (id of ids(); track id) {
        <lc-tab [id]="id" [label]="id">x</lc-tab>
      }
    </lc-tabs>
  `,
})
class DynamicTabsHostComponent {
  readonly selected = signal<string | null>('a');
  readonly ids = signal(['a', 'b', 'c']);
}

describe('LcTabsComponent : placement de l\'indicateur', () => {
  const INSTANT = 'lc-tabs__indicator--instant';
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const index = (el: HTMLElement) => Array.from(el.parentElement!.querySelectorAll(':scope > .lc-tabs__tab')).indexOf(el);
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('lc-tabs__tab') ? index(this) * 100 : 0; });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('lc-tabs__tab') ? 80 + index(this) : 0; });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // `mockLayout` pose ces trois-là : sans ce nettoyage, ils fuient vers les autres fichiers de test.
    delete (Element.prototype as { scrollBy?: unknown }).scrollBy;
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    delete (document.defaultView as { matchMedia?: unknown }).matchMedia;
  });

  async function setupDynamic() {
    const fixture = TestBed.createComponent(DynamicTabsHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const indicator = element.querySelector<HTMLElement>('.lc-tabs__indicator')!;
    const tabs = () => Array.from(element.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    return { fixture, indicator, tabs };
  }

  it('pose transform et width de l\'onglet sélectionné, et glisse (sans --instant) après un clic', async () => {
    const { fixture, indicator, tabs } = await setupDynamic();
    expect(indicator.style.transform).toBe('translateX(0px)');
    expect(indicator.style.width).toBe('80px');
    tabs()[2].click();
    await fixture.whenStable();
    expect(indicator.style.transform).toBe('translateX(200px)');
    expect(indicator.style.width).toBe('82px');
    expect(indicator.classList.contains(INSTANT)).toBe(false);
  });

  it('pose --instant après un rappel du ResizeObserver, le retire à la sélection suivante', async () => {
    const { fixture, indicator, tabs } = await setupDynamic();
    FakeResizeObserver.instances.at(-1)!.trigger();
    expect(indicator.classList.contains(INSTANT)).toBe(true);
    tabs()[1].click();
    await fixture.whenStable();
    expect(indicator.classList.contains(INSTANT)).toBe(false);
    expect(indicator.style.transform).toBe('translateX(100px)');
  });

  it('suit offsetLeft aussi en RTL (direction sans effet sur la mesure)', async () => {
    mockLayout({ rtl: true });
    const { fixture, indicator, tabs } = await setupDynamic();
    tabs()[1].click();
    await fixture.whenStable();
    expect(indicator.style.transform).toBe('translateX(100px)');
  });

  it('ajout d\'onglet ou focus clavier sans changement de sélection : --instant, pas de glissement', async () => {
    const { fixture, indicator, tabs } = await setupDynamic();
    tabs()[0].click();
    await fixture.whenStable();
    fixture.componentInstance.ids.set(['z', 'a', 'b', 'c']);
    await fixture.whenStable();
    expect(indicator.style.transform).toBe('translateX(100px)');
    expect(indicator.classList.contains(INSTANT)).toBe(true);
  });

  it('retrait de l\'onglet sélectionné : l\'indicateur suit le premier onglet actif', async () => {
    const { fixture, indicator } = await setupDynamic();
    fixture.componentInstance.ids.set(['b', 'c']);
    await fixture.whenStable();
    expect(indicator.hidden).toBe(false);
    expect(indicator.style.transform).toBe('translateX(0px)');
    expect(indicator.style.width).toBe('80px');
  });
});

@Component({
  imports: [LcTabsComponent, LcTabComponent],
  template: `
    <lc-tabs ariaLabel="Rubriques" swipe [(selected)]="selected" (selectionChange)="changes.push($event)">
      <lc-tab id="a" label="A"><p>Contenu A</p></lc-tab>
      <lc-tab id="b" label="B"><p>Contenu B</p></lc-tab>
      <lc-tab id="off" label="Off" [disabled]="true">x</lc-tab>
      <lc-tab id="c" label="C"><p>Contenu C</p></lc-tab>
    </lc-tabs>
  `,
})
class SwipeTabsHostComponent {
  readonly selected = signal<string | null>(null);
  readonly changes: { id: string; source: string }[] = [];
}

describe('LcTabsComponent swipe', () => {
  let intersect: (target: Element, ratio: number) => void;

  async function setup() {
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: unknown[]) => void) {
        intersect = (target, ratio) => callback([{ target, isIntersecting: true, intersectionRatio: ratio }]);
      }
      observe() {}
      disconnect() {}
    });
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
    const fixture = TestBed.createComponent(SwipeTabsHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('lc-swipe-panels')!.dispatchEvent(new Event('scrollend'));
    return { fixture, element, panels: Array.from(element.querySelectorAll<HTMLElement>('[role="tabpanel"]')) };
  }

  afterEach(() => vi.unstubAllGlobals());

  it('un seul jeu de tabpanel, tous créés, inert et jamais hidden, reliés aux onglets (aucun panneau pour un onglet désactivé)', async () => {
    const { element, panels } = await setup();
    const tabs = Array.from(element.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(panels.length).toBe(3);
    expect(panels.map((panel) => panel.hasAttribute('inert'))).toEqual([false, true, true]);
    expect(panels.some((panel) => panel.hidden)).toBe(false);
    expect(element.textContent).toContain('Contenu C');
    expect(panels.map((panel) => panel.getAttribute('aria-labelledby'))).toEqual([tabs[0].id, tabs[1].id, tabs[3].id]);
    expect(tabs.map((tab) => tab.getAttribute('aria-controls'))).toEqual([panels[0].id, panels[1].id, null, panels[2].id]);
  });

  it('selectionChange : source tab pour un clic, swipe pour un glissement, rien si l’onglet ne change pas', async () => {
    const { fixture, element, panels } = await setup();
    const tabs = Array.from(element.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    tabs[0].click();
    tabs[1].click();
    await fixture.whenStable();
    intersect(panels[2], 0.8);
    await fixture.whenStable();
    expect(fixture.componentInstance.changes).toEqual([{ id: 'b', source: 'tab' }, { id: 'c', source: 'swipe' }]);
    expect(fixture.componentInstance.selected()).toBe('c');
  });
});
