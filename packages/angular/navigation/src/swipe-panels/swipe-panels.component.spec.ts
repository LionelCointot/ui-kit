import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcSwipePanelDirective, LcSwipePanelsComponent } from './swipe-panels.component';

@Component({
  imports: [LcSwipePanelsComponent, LcSwipePanelDirective],
  template: `
    <button id="outside">hors bande</button>
    <lc-swipe-panels [(activeIndex)]="active" [layout]="layout()" [chain]="chain()" (activeIndexChange)="changes.push($event)">
      <section lcSwipePanel><input id="field" /></section>
      <section lcSwipePanel>B</section>
      <section lcSwipePanel>C</section>
    </lc-swipe-panels>
  `,
})
class HostComponent {
  readonly active = signal(0);
  readonly layout = signal<'strip' | 'columns'>('strip');
  readonly chain = signal(false);
  readonly changes: number[] = [];
}

describe('LcSwipePanelsComponent', () => {
  let intersect: (target: Element, ratio: number) => void;
  let resized: () => void;
  let scrollTo: ReturnType<typeof vi.fn>;
  let reduced: boolean;
  let fixture: ComponentFixture<HostComponent>;
  let strip: HTMLElement;
  let panels: HTMLElement[];

  beforeEach(async () => {
    reduced = false;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: unknown[]) => void) {
        intersect = (target, ratio) => callback([{ target, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
      }
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
    scrollTo = vi.fn();
    // jsdom ne mesure rien : trois panneaux de 300 px dans une bande de 300 px.
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    strip = fixture.nativeElement.querySelector('lc-swipe-panels');
    panels = Array.from(strip.querySelectorAll<HTMLElement>('[lcSwipePanel]'));
    strip.dispatchEvent(new Event('scrollend')); // fin du placement initial : la sourdine est levée
    scrollTo.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const inert = (): boolean[] => panels.map((panel) => panel.hasAttribute('inert'));
  const scrollAt = (left: number): void => {
    Object.defineProperty(strip, 'scrollLeft', { configurable: true, value: left });
  };

  it('seul le panneau actif n’est pas inert, et le panneau est focalisable par programme', async () => {
    expect(inert()).toEqual([false, true, true]);
    expect(panels[0].getAttribute('tabindex')).toBe('-1');
    fixture.componentInstance.active.set(2);
    await fixture.whenStable();
    expect(inert()).toEqual([true, true, false]);
  });

  it('un indice changé de l’extérieur fait défiler la bande, sans émettre activeIndexChange', async () => {
    fixture.componentInstance.active.set(1);
    await fixture.whenStable();
    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' });
    expect(fixture.componentInstance.changes).toEqual([]);
  });

  it('mouvement réduit : défilement instantané', async () => {
    reduced = true;
    fixture.componentInstance.active.set(2);
    await fixture.whenStable();
    expect(scrollTo).toHaveBeenCalledWith({ left: 600, behavior: 'instant' });
  });

  it('un panneau visible à 60 % devient actif par glissement : une émission, aucun défilement', async () => {
    scrollAt(600);
    intersect(panels[2], 0.7);
    await fixture.whenStable();
    expect(fixture.componentInstance.active()).toBe(2);
    expect(fixture.componentInstance.changes).toEqual([2]);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(inert()).toEqual([true, true, false]);
  });

  it('sous 60 % ou sur le panneau déjà actif, rien ne change', async () => {
    intersect(panels[1], 0.5);
    intersect(panels[0], 1);
    await fixture.whenStable();
    expect(fixture.componentInstance.changes).toEqual([]);
  });

  it('pendant un défilement provoqué les panneaux traversés sont ignorés, jusqu’à scrollend', async () => {
    fixture.componentInstance.active.set(2);
    await fixture.whenStable();
    intersect(panels[1], 0.9);
    expect(fixture.componentInstance.active()).toBe(2);
    strip.dispatchEvent(new Event('scrollend'));
    intersect(panels[1], 0.9);
    expect(fixture.componentInstance.active()).toBe(1);
  });

  it('sans scrollend, la sourdine s’arrête après 800 ms et le glissement suivant est suivi', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fixture.componentInstance.active.set(2);
    fixture.detectChanges();
    vi.advanceTimersByTime(799);
    intersect(panels[1], 0.9);
    expect(fixture.componentInstance.active()).toBe(2);
    vi.advanceTimersByTime(1);
    intersect(panels[1], 0.9);
    expect(fixture.componentInstance.active()).toBe(1);
  });

  it('un index réécrit par le parent à la valeur reçue ne relance aucun défilement', async () => {
    scrollAt(600);
    intersect(panels[2], 0.7);
    await fixture.whenStable();
    fixture.componentInstance.active.set(2);
    await fixture.whenStable();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrollsnapchange donne le panneau qui a pris la place', async () => {
    strip.dispatchEvent(Object.assign(new Event('scrollsnapchange'), { snapTargetInline: panels[1] }));
    await fixture.whenStable();
    expect(fixture.componentInstance.active()).toBe(1);
  });

  it('expose la progression en signal et en variable CSS', async () => {
    scrollAt(150);
    strip.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await fixture.whenStable();
    expect(strip.style.getPropertyValue('--lc-swipe-panels-progress')).toBe('0.5');
  });

  it('un index hors bornes est ramené dans la bande, sans émission', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fixture.componentInstance.active.set(7);
    await fixture.whenStable();
    expect(inert()).toEqual([true, true, false]);
    expect(fixture.componentInstance.changes).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it('chain bascule overscroll-behavior-x par une classe', async () => {
    expect(strip.classList.contains('lc-swipe-panels--chain')).toBe(false);
    fixture.componentInstance.chain.set(true);
    await fixture.whenStable();
    expect(strip.classList.contains('lc-swipe-panels--chain')).toBe(true);
  });

  it('un redimensionnement replace la bande sur le panneau actif sans animation', async () => {
    fixture.componentInstance.active.set(1);
    await fixture.whenStable();
    scrollTo.mockClear();
    resized();
    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'instant' });
  });

  it('le focus d’un panneau qui devient inert passe au panneau actif', async () => {
    const field = panels[0].querySelector<HTMLInputElement>('#field')!;
    field.focus();
    fixture.componentInstance.active.set(1);
    await fixture.whenStable();
    expect(document.activeElement).toBe(panels[1]);
    expect(panels[0].hasAttribute('inert')).toBe(true);
  });

  it('en colonnes : aucun inert, mêmes nœuds, l’index est gardé et la bande se replace au retour', async () => {
    fixture.componentInstance.active.set(1);
    await fixture.whenStable();
    fixture.componentInstance.layout.set('columns');
    await fixture.whenStable();
    expect(inert()).toEqual([false, false, false]);
    expect(strip.classList.contains('lc-swipe-panels--columns')).toBe(true);
    expect(Array.from(strip.querySelectorAll('[lcSwipePanel]'))).toEqual(panels);
    scrollTo.mockClear();
    fixture.componentInstance.layout.set('strip');
    await fixture.whenStable();
    expect(inert()).toEqual([true, false, true]);
    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'instant' });
  });
});
