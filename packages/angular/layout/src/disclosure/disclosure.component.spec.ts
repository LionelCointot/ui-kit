import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LcDisclosureComponent, LcDisclosureContentDirective, LcDisclosureHeadingLevel } from './disclosure.component';

let created = 0;

@Component({ selector: 'lc-probe', template: `<p class="probe">contenu lourd</p>` })
class ProbeComponent {
  constructor() { created++; }
}

@Component({
  imports: [LcDisclosureComponent, LcDisclosureContentDirective, ProbeComponent],
  template: `
    <lc-disclosure id="a" [(expanded)]="expandedA" [headingLevel]="level()" [disabled]="disabled()" [lazy]="lazy()"
      (expandedChange)="changes.push($event)">
      <span lcDisclosureSummary>Étape A</span>
      <button lcDisclosureActions id="action-a" type="button">Relancer</button>
      <ng-template lcDisclosureContent><lc-probe /></ng-template>
    </lc-disclosure>
    <lc-disclosure id="b" [(expanded)]="expandedB">
      <span lcDisclosureSummary>Étape B</span>
      <p class="plain">contenu B</p>
    </lc-disclosure>
    <lc-disclosure id="c" lazy>
      <span lcDisclosureSummary>Étape C</span>
      <p class="plain-lazy">contenu C</p>
    </lc-disclosure>
  `,
})
class DisclosureHostComponent {
  readonly expandedA = signal(false);
  readonly expandedB = signal(false);
  readonly level = signal<LcDisclosureHeadingLevel | null>(null);
  readonly disabled = signal(false);
  readonly lazy = signal(false);
  readonly changes: boolean[] = [];
}

describe('LcDisclosureComponent', () => {
  async function setup(lazy = false) {
    created = 0;
    const fixture = TestBed.createComponent(DisclosureHostComponent);
    fixture.componentInstance.lazy.set(lazy);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const part = (id: string) => {
      const element = root.querySelector(`#${id}`)!;
      return {
        element,
        button: element.querySelector<HTMLButtonElement>('button.lc-disclosure__summary')!,
        region: element.querySelector<HTMLElement>('.lc-disclosure__region')!,
      };
    };
    const click = async (id: string) => {
      part(id).button.click();
      await fixture.whenStable();
    };
    return { fixture, host: fixture.componentInstance, root, part, click };
  }

  describe('CA-9 : ARIA, bascule, actions, plusieurs ouverts', () => {
    it('le bouton porte aria-expanded et aria-controls ; la région role="group" est étiquetée par le résumé', async () => {
      const { part, click } = await setup();
      const { button, region } = part('a');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(button.getAttribute('aria-controls')).toBe(region.id);
      expect(region.getAttribute('role')).toBe('group');
      expect(region.getAttribute('aria-labelledby')).toBe(button.id);
      expect(button.textContent).toContain('Étape A');
      await click('a');
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('émet expandedChange à chaque bascule et reflète le modèle', async () => {
      const { host, click } = await setup();
      await click('a');
      await click('a');
      expect(host.changes).toEqual([true, false]);
      expect(host.expandedA()).toBe(false);
    });

    it('le modèle expanded pilote l\'état depuis l\'extérieur', async () => {
      const { host, part, fixture } = await setup();
      host.expandedA.set(true);
      await fixture.whenStable();
      expect(part('a').button.getAttribute('aria-expanded')).toBe('true');
      expect(part('a').element.classList).toContain('lc-disclosure--expanded');
    });

    it('les actions sont hors du bouton résumé et cliquables sans basculer', async () => {
      const { part, host, root, fixture } = await setup();
      const action = root.querySelector<HTMLButtonElement>('#action-a')!;
      expect(part('a').button.contains(action)).toBe(false);
      expect(action.closest('.lc-disclosure__actions')).not.toBeNull();
      action.click();
      await fixture.whenStable();
      expect(host.expandedA()).toBe(false);
    });

    it('plusieurs lignes peuvent être ouvertes en même temps', async () => {
      const { part, click } = await setup();
      await click('a');
      await click('b');
      expect(part('a').button.getAttribute('aria-expanded')).toBe('true');
      expect(part('b').button.getAttribute('aria-expanded')).toBe('true');
      expect(part('a').region.hidden).toBe(false);
      expect(part('b').region.hidden).toBe(false);
    });

    it('focusSummary() donne le focus au bouton résumé', async () => {
      const { part, fixture } = await setup();
      fixture.debugElement.query(By.directive(LcDisclosureComponent)).componentInstance.focusSummary();
      expect(document.activeElement).toBe(part('a').button);
    });
  });

  describe('CA-10 : replié, lazy, headingLevel, disabled', () => {
    it('replié = hidden + inert ; déplié = ni l\'un ni l\'autre', async () => {
      const { part, click } = await setup();
      expect(part('b').region.hidden).toBe(true);
      expect(part('b').region.getAttribute('inert')).toBe('');
      await click('b');
      expect(part('b').region.hidden).toBe(false);
      expect(part('b').region.hasAttribute('inert')).toBe(false);
      await click('b');
      expect(part('b').region.hidden).toBe(true);
      expect(part('b').region.getAttribute('inert')).toBe('');
    });

    it('sans lazy, le contenu est rendu dès le départ, replié', async () => {
      const { part } = await setup();
      expect(part('b').region.querySelector('.plain')).not.toBeNull();
    });

    it('lazy avec lcDisclosureContent : le gabarit n\'est créé qu\'au premier dépliage, puis conservé', async () => {
      const { part, click } = await setup(true);
      expect(created).toBe(0);
      expect(part('a').region.querySelector('.probe')).toBeNull();
      await click('a');
      expect(created).toBe(1);
      expect(part('a').region.querySelector('.probe')).not.toBeNull();
      await click('a');
      await click('a');
      expect(created).toBe(1);
      expect(part('a').region.querySelector('.probe')).not.toBeNull();
    });

    it('lcDisclosureContent sans lazy : créé d\'emblée, replié', async () => {
      const { part } = await setup();
      expect(created).toBe(1);
      expect(part('a').region.hidden).toBe(true);
    });

    it('lazy sans lcDisclosureContent : le contenu projeté n\'est dans le DOM qu\'à partir du premier dépliage, puis conservé', async () => {
      const { part, click } = await setup();
      expect(part('c').region.querySelector('.plain-lazy')).toBeNull();
      await click('c');
      expect(part('c').region.querySelector('.plain-lazy')).not.toBeNull();
      await click('c');
      expect(part('c').region.hidden).toBe(true);
      expect(part('c').region.querySelector('.plain-lazy')).not.toBeNull();
    });

    it('headingLevel enveloppe le bouton d\'un titre du niveau demandé ; sans niveau, aucun titre', async () => {
      const { host, part, fixture } = await setup();
      expect(part('a').element.querySelector('h2, h3, h4, h5, h6')).toBeNull();
      for (const level of [2, 3, 4, 5, 6] as const) {
        host.level.set(level);
        await fixture.whenStable();
        const heading = part('a').element.querySelector(`h${level}`)!;
        expect(heading.contains(part('a').button)).toBe(true);
        expect(part('a').element.querySelectorAll('h2, h3, h4, h5, h6')).toHaveLength(1);
      }
    });

    it('disabled : bouton désactivé, aucune bascule', async () => {
      const { host, part, click, fixture } = await setup();
      host.disabled.set(true);
      await fixture.whenStable();
      expect(part('a').button.disabled).toBe(true);
      await click('a');
      expect(host.expandedA()).toBe(false);
      expect(host.changes).toEqual([]);
      expect(part('a').region.hidden).toBe(true);
    });
  });
});
