import { ConnectedPosition, FlexibleConnectedPositionStrategy } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcMenuComponent } from './menu.component';
import { LcMenuItemComponent } from './menu-item.component';
import { LcMenuTriggerDirective } from './menu-trigger.directive';

let lastAction = '';

@Component({
  imports: [LcMenuComponent, LcMenuItemComponent, LcMenuTriggerDirective],
  template: `
    <button id="trigger" [lcMenuTriggerFor]="menu">Actions</button>
    <lc-menu #menu ariaLabel="Actions du scénario">
      <button lcMenuItem icon="pencil" (click)="run('rename')">Renommer</button>
      <button lcMenuItem disabled>Verrouillé</button>
      <button lcMenuItem destructive (click)="run('delete')">Supprimer</button>
    </lc-menu>
  `,
})
class MenuHostComponent {
  run(action: string): void {
    lastAction = action;
  }
}

const panel = () => document.querySelector<HTMLElement>('.lc-menu-panel');
const press = (key: string) => panel()!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('LcMenu', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  async function setup() {
    const fixture = TestBed.createComponent(MenuHostComponent);
    await fixture.whenStable();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#trigger')!;
    return { fixture, trigger };
  }

  it('ouvre un menu ARIA au clic et place le focus sur le premier élément avec les flèches', async () => {
    const { fixture, trigger } = await setup();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel()!.getAttribute('role')).toBe('menu');
    expect(panel()!.getAttribute('aria-label')).toBe('Actions du scénario');
    const items = Array.from(panel()!.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    expect(items.length).toBe(3);
    expect(document.activeElement).toBe(items[0]);
  });

  it('saute les éléments désactivés, ferme sur Échap et rend le focus au déclencheur', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    const items = Array.from(panel()!.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    items[0].focus();
    press('ArrowDown');
    await fixture.whenStable();
    expect(document.activeElement).toBe(items[0]);
    press('Escape');
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('ferme en fondu : lc-overlay--closing d\'abord, retrait du DOM ensuite ; une réouverture pendant le fondu garde le panneau', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    const pane = document.querySelector<HTMLElement>('.lc-menu-overlay')!;
    trigger.click();
    expect(pane.classList.contains('lc-overlay--closing')).toBe(true);
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel()).not.toBeNull();
    trigger.click();
    await fixture.whenStable();
    expect(pane.classList.contains('lc-overlay--closing')).toBe(false);
    expect(panel()).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    trigger.click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(pane.classList.contains('lc-overlay--closing')).toBe(false);
  });

  it('les positions au-dessus portent lc-overlay--above, celles en dessous non', async () => {
    const withPositions = vi.spyOn(FlexibleConnectedPositionStrategy.prototype, 'withPositions');
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    const positions = withPositions.mock.calls[0][0] as ConnectedPosition[];
    withPositions.mockRestore();
    expect(positions.length).toBeGreaterThan(0);
    for (const position of positions) expect(position.panelClass).toBe(position.overlayY === 'bottom' ? 'lc-overlay--above' : undefined);
  });

  it('un clic sur un élément exécute l\'action puis ferme le menu', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    panel()!.querySelectorAll<HTMLElement>('[role="menuitem"]')[2].click();
    await fixture.whenStable();
    expect(lastAction).toBe('delete');
    expect(panel()).toBeNull();
  });

  describe('navigation clavier du déclencheur et des éléments', () => {
    // Le gestionnaire de focus du CDK lit `keyCode` : 38 = flèche haut, 40 = flèche bas.
    const keyCodes: Record<string, number> = { ArrowUp: 38, ArrowDown: 40 };
    const key = (target: HTMLElement, name: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: name, keyCode: keyCodes[name], bubbles: true, cancelable: true }));
    const enabledItems = () => Array.from(panel()!.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter((item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true');

    it('un clic sur le déclencheur place le focus sur le premier élément non désactivé', async () => {
      const { fixture, trigger } = await setup();
      trigger.click();
      await fixture.whenStable();
      expect(document.activeElement).toBe(enabledItems()[0]);
      expect((document.activeElement as HTMLElement).textContent).toContain('Renommer');
    });

    it('Échap sur le déclencheur, après ouverture au clic, ferme le menu et garde le focus sur le déclencheur', async () => {
      const { fixture, trigger } = await setup();
      trigger.click();
      await fixture.whenStable();
      trigger.focus();
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      trigger.dispatchEvent(event);
      await fixture.whenStable();
      expect(event.defaultPrevented).toBe(true);
      expect(panel()).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
    });

    it('Échap sur le déclencheur quand le menu est fermé ne fait rien', async () => {
      const { fixture, trigger } = await setup();
      trigger.focus();
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      trigger.dispatchEvent(event);
      await fixture.whenStable();
      expect(event.defaultPrevented).toBe(false);
      expect(panel()).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
    });

    it('flèche haut sur le premier élément : dernier élément ; flèche bas sur le dernier : premier (désactivés sautés)', async () => {
      const { fixture, trigger } = await setup();
      trigger.click();
      await fixture.whenStable();
      const [first, last] = enabledItems();
      expect(last.textContent).toContain('Supprimer');
      first.focus();
      key(first, 'ArrowUp');
      await fixture.whenStable();
      expect(document.activeElement).toBe(last);
      key(last, 'ArrowDown');
      await fixture.whenStable();
      expect(document.activeElement).toBe(first);
    });
  });
});
