import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  LcDisclosureComponent, LcDisclosureContentDirective, LcDisclosureGroupDirective, LcDisclosureHeadingLevel,
} from './disclosure.component';

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

@Component({
  imports: [LcDisclosureComponent, LcDisclosureContentDirective, LcDisclosureGroupDirective, ProbeComponent],
  template: `
    <div lcDisclosureGroup [exclusive]="exclusive()">
      <lc-disclosure id="ga" [(expanded)]="a"><span lcDisclosureSummary>A</span><p>contenu A</p></lc-disclosure>
      <lc-disclosure id="gb" [(expanded)]="b"><span lcDisclosureSummary>B</span><p>contenu B</p></lc-disclosure>
      @if (showC()) {
        <lc-disclosure id="gc" [(expanded)]="c"><span lcDisclosureSummary>C</span><p>contenu C</p></lc-disclosure>
      }
      <lc-disclosure id="gl" lazy [(expanded)]="l">
        <span lcDisclosureSummary>L</span>
        <ng-template lcDisclosureContent><lc-probe /></ng-template>
      </lc-disclosure>
    </div>
  `,
})
class GroupHostComponent {
  readonly exclusive = signal(true);
  readonly showC = signal(true);
  readonly a = signal(true);
  readonly b = signal(false);
  readonly c = signal(false);
  readonly l = signal(false);
}

describe('LcDisclosureGroupDirective', () => {
  async function setupGroup(exclusive = true) {
    created = 0;
    const fixture = TestBed.createComponent(GroupHostComponent);
    fixture.componentInstance.exclusive.set(exclusive);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const button = (id: string) => root.querySelector<HTMLButtonElement>(`#${id} button.lc-disclosure__summary`)!;
    const open = () => ['ga', 'gb', 'gc', 'gl'].filter((id) => button(id)?.getAttribute('aria-expanded') === 'true');
    const click = async (id: string) => {
      button(id).click();
      await fixture.whenStable();
    };
    return { fixture, host: fixture.componentInstance, button, open, click };
  }

  describe('exclusive', () => {
    it('ouvrir B referme A : une seule ligne ouverte, focus sur le bouton cliqué', async () => {
      const { open, click, button } = await setupGroup();
      expect(open()).toEqual(['ga']);
      button('gb').focus();
      await click('gb');
      expect(open()).toEqual(['gb']);
      expect(document.activeElement).toBe(button('gb'));
      await click('gc');
      expect(open()).toEqual(['gc']);
    });

    it('referme aussi le modèle expanded du parent', async () => {
      const { host, click } = await setupGroup();
      await click('gb');
      expect(host.a()).toBe(false);
      expect(host.b()).toBe(true);
    });

    it('replier la ligne ouverte ne rouvre rien', async () => {
      const { open, click } = await setupGroup();
      await click('ga');
      expect(open()).toEqual([]);
    });

    it('passer exclusive à vrai ne referme rien d\'office', async () => {
      const { fixture, host, open, click } = await setupGroup(false);
      await click('gb');
      expect(open()).toEqual(['ga', 'gb']);
      host.exclusive.set(true);
      await fixture.whenStable();
      expect(open()).toEqual(['ga', 'gb']);
      await click('gc');
      expect(open()).toEqual(['gc']);
    });

    it('une ligne détruite sort du groupe sans erreur', async () => {
      const { fixture, host, open, click } = await setupGroup();
      await click('gc');
      host.showC.set(false);
      await fixture.whenStable();
      await click('gb');
      expect(open()).toEqual(['gb']);
    });

    it('le contenu lazy d\'une ligne refermée par le groupe est conservé', async () => {
      const { open, click, fixture } = await setupGroup();
      await click('gl');
      expect(created).toBe(1);
      await click('gb');
      expect(open()).toEqual(['gb']);
      const region = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#gl .lc-disclosure__region')!;
      expect(region.hasAttribute('inert')).toBe(true);
      expect(region.querySelector('.probe')).not.toBeNull();
      expect(created).toBe(1);
    });
  });

  describe('non exclusif', () => {
    it('plusieurs lignes du groupe restent ouvertes', async () => {
      const { open, click } = await setupGroup(false);
      await click('gb');
      await click('gc');
      expect(open()).toEqual(['ga', 'gb', 'gc']);
    });
  });
});

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
      expect(part('a').region.hasAttribute('inert')).toBe(false);
      expect(part('b').region.hasAttribute('inert')).toBe(false);
    });

    it('focusSummary() donne le focus au bouton résumé', async () => {
      const { part, fixture } = await setup();
      fixture.debugElement.query(By.directive(LcDisclosureComponent)).componentInstance.focusSummary();
      expect(document.activeElement).toBe(part('a').button);
    });
  });

  describe('CA-10 : replié, lazy, headingLevel, disabled', () => {
    it('replié = inert (visibility masquée par la feuille de style) ; déplié = pas inert', async () => {
      const { part, click } = await setup();
      expect(part('b').region.hasAttribute('inert')).toBe(true);
      expect(part('b').region.getAttribute('inert')).toBe('');
      await click('b');
      expect(part('b').region.hasAttribute('inert')).toBe(false);
      expect(part('b').region.hasAttribute('inert')).toBe(false);
      await click('b');
      expect(part('b').region.hasAttribute('inert')).toBe(true);
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
      expect(part('a').region.hasAttribute('inert')).toBe(true);
    });

    it('lazy sans lcDisclosureContent : le contenu projeté n\'est dans le DOM qu\'à partir du premier dépliage, puis conservé', async () => {
      const { part, click } = await setup();
      expect(part('c').region.querySelector('.plain-lazy')).toBeNull();
      await click('c');
      expect(part('c').region.querySelector('.plain-lazy')).not.toBeNull();
      await click('c');
      expect(part('c').region.hasAttribute('inert')).toBe(true);
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
      expect(part('a').region.hasAttribute('inert')).toBe(true);
    });
  });
});
