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
