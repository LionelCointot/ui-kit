/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_DEFAULT_ICONS } from '@lionelcointot/ui-angular';
import { LcCellDirective } from './cell.directive';
import { LcTableComponent } from './table.component';
import { LcSort, LcTableColumn, LcTableGrouping } from './table-model';

interface Payment { id: number; year: number; month: string; amount: number; status: string }

const data: readonly Payment[] = [
  { id: 1, year: 2026, month: 'Janvier', amount: 1200.5, status: 'payé' },
  { id: 2, year: 2026, month: 'Février', amount: 1200.5, status: 'payé' },
  { id: 3, year: 2027, month: 'Janvier', amount: 900, status: 'à venir' },
];

@Component({
  imports: [LcTableComponent, LcCellDirective],
  template: `
    <lc-table caption="Échéances" [data]="data" [columns]="columns" [trackBy]="trackBy" [groupBy]="grouping()"
      [footer]="{ amount: 3301 }" [(sort)]="sort" (groupToggled)="toggled.set($event.key)">
      <ng-template lcCell="status" let-row><strong class="status">{{ row.status }}</strong></ng-template>
    </lc-table>
  `,
})
class TableHostComponent {
  readonly data = data;
  readonly columns: readonly LcTableColumn<Payment>[] = [
    { id: 'month', header: 'Mois', value: (row) => row.month, sortable: true },
    { id: 'amount', header: 'Montant', value: (row) => row.amount, format: 'money', sortable: true },
    { id: 'status', header: 'Statut', value: (row) => row.status },
  ];
  readonly trackBy = (row: Payment) => row.id;
  readonly sort = signal<LcSort | null>(null);
  readonly toggled = signal('');
  readonly grouping = signal<LcTableGrouping<Payment> | undefined>(undefined);
}

interface Row { id: number; name: string; amount: number; group: string }

/** Ordre d'origine : Charlie, Alice, Bob, Dora ; montants 300, 100, 200, 50 ; groupes B, A, B, A. */
const rows: readonly Row[] = [
  { id: 1, name: 'Charlie', amount: 300, group: 'B' },
  { id: 2, name: 'Alice', amount: 100, group: 'A' },
  { id: 3, name: 'Bob', amount: 200, group: 'B' },
  { id: 4, name: 'Dora', amount: 50, group: 'A' },
];

@Component({
  imports: [LcTableComponent],
  template: `
    <lc-table caption="Lignes" [data]="data()" [columns]="columns()" [trackBy]="trackBy" [groupBy]="grouping()"
      [sortMode]="mode()" [(sort)]="sort" />
  `,
})
class SortHostComponent {
  readonly data = signal<readonly Row[]>(rows);
  readonly columns = signal<readonly LcTableColumn<Row>[]>([
    { id: 'name', header: 'Nom', value: (row) => row.name, sortable: true },
    { id: 'amount', header: 'Montant', value: (row) => row.amount, sortable: true },
    { id: 'note', header: 'Note', value: (row) => row.group },
  ]);
  readonly trackBy = (row: Row) => row.id;
  readonly mode = signal<'client' | 'external'>('client');
  readonly sort = signal<LcSort | null>(null);
  readonly grouping = signal<LcTableGrouping<Row> | undefined>(undefined);
}

@Component({
  imports: [LcTableComponent],
  template: `<lc-table caption="Lignes" [data]="data" [columns]="columns" [trackBy]="trackBy" [(sort)]="sort" />`,
})
class NoSortableHostComponent {
  readonly data = rows;
  readonly columns: readonly LcTableColumn<Row>[] = [
    { id: 'name', header: 'Nom', value: (row) => row.name },
    { id: 'amount', header: 'Montant', value: (row) => row.amount },
  ];
  readonly trackBy = (row: Row) => row.id;
  readonly sort = signal<LcSort | null>(null);
}

describe('LcTableComponent : tri de colonne (D4)', () => {
  async function setup() {
    const fixture = TestBed.createComponent(SortHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const header = (index: number) => element.querySelectorAll('th')[index];
    const button = (index: number) => header(index).querySelector<HTMLButtonElement>('button')!;
    const names = () =>
      Array.from(element.querySelectorAll('tbody tr:not(.lc-table__group):not(.lc-table__empty)')).map((tr) => tr.querySelector('td')!.textContent!.trim());
    const click = async (index: number) => {
      button(index).click();
      await fixture.whenStable();
    };
    /** Jeu d'icônes attendu : le SVG enregistré pour ce nom, relu par le DOM pour comparer au rendu de lc-icon. */
    const iconShapes = (name: string) => {
      const template = document.createElement('template');
      template.innerHTML = LC_DEFAULT_ICONS[name];
      return template.content.querySelector('svg')!.innerHTML;
    };
    const renderedIcon = (index: number) => button(index).querySelector('lc-icon svg')!.innerHTML;
    return { fixture, element, header, button, names, click, iconShapes, renderedIcon };
  }

  const ORIGINAL = ['Charlie', 'Alice', 'Bob', 'Dora'];

  it('CA-D4 : le cycle à la souris est sans tri, croissant, décroissant, sans tri (aria-sort, lignes et modèle suivent)', async () => {
    const { fixture, header, names, click } = await setup();
    expect(header(0).getAttribute('aria-sort')).toBeNull();
    expect(names()).toEqual(ORIGINAL);

    await click(0);
    expect(header(0).getAttribute('aria-sort')).toBe('ascending');
    expect(names()).toEqual(['Alice', 'Bob', 'Charlie', 'Dora']);
    expect(fixture.componentInstance.sort()).toEqual({ columnId: 'name', direction: 'asc' });

    await click(0);
    expect(header(0).getAttribute('aria-sort')).toBe('descending');
    expect(names()).toEqual(['Dora', 'Charlie', 'Bob', 'Alice']);
    expect(fixture.componentInstance.sort()).toEqual({ columnId: 'name', direction: 'desc' });

    await click(0);
    expect(header(0).getAttribute('aria-sort')).toBeNull();
    expect(names()).toEqual(ORIGINAL);
    expect(fixture.componentInstance.sort()).toBeNull();
  });

  it('CA-D4 : l\'en-tête triable est un <button type="button"> natif, focalisable (Entrée et Espace l\'activent nativement)', async () => {
    const { button } = await setup();
    const sortButton = button(0);
    expect(sortButton.tagName).toBe('BUTTON');
    expect(sortButton.type).toBe('button');
    expect(sortButton.disabled).toBe(false);
    expect(sortButton.tabIndex).toBeGreaterThanOrEqual(0);
    sortButton.focus();
    expect(document.activeElement).toBe(sortButton);
  });

  it('CA-D4 : trier une autre colonne retire aria-sort de la première et repart de croissant', async () => {
    const { header, names, click } = await setup();
    await click(0);
    await click(0);
    await click(1);
    expect(header(0).getAttribute('aria-sort')).toBeNull();
    expect(header(1).getAttribute('aria-sort')).toBe('ascending');
    expect(names()).toEqual(['Dora', 'Alice', 'Bob', 'Charlie']);
  });

  it('CA-D4 : le modèle se lie dans les deux sens (le parent pilote aria-sort et les lignes)', async () => {
    const { fixture, header, names } = await setup();
    fixture.componentInstance.sort.set({ columnId: 'amount', direction: 'desc' });
    await fixture.whenStable();
    expect(header(1).getAttribute('aria-sort')).toBe('descending');
    expect(header(0).getAttribute('aria-sort')).toBeNull();
    expect(names()).toEqual(['Charlie', 'Bob', 'Alice', 'Dora']);
    fixture.componentInstance.sort.set(null);
    await fixture.whenStable();
    expect(header(1).getAttribute('aria-sort')).toBeNull();
    expect(names()).toEqual(ORIGINAL);
  });

  it('CA-D4 : mode client par défaut avec regroupement : groupes dans leur ordre d\'apparition, lignes triées dans chaque groupe', async () => {
    const { fixture, element, names, click } = await setup();
    fixture.componentInstance.grouping.set({ key: (row) => row.group, label: (key) => `Groupe ${key}`, initiallyExpanded: true });
    await fixture.whenStable();
    const groups = () => Array.from(element.querySelectorAll('.lc-table__group')).map((tr) => tr.textContent!.trim());
    expect(names()).toEqual(['Charlie', 'Bob', 'Alice', 'Dora']);
    await click(0);
    expect(names()).toEqual(['Bob', 'Charlie', 'Alice', 'Dora']);
    expect(groups()).toEqual(['Groupe B', 'Groupe A']);
    await click(0);
    expect(names()).toEqual(['Charlie', 'Bob', 'Dora', 'Alice']);
  });

  describe('sortMode="external"', () => {
    async function setupExternal() {
      const context = await setup();
      context.fixture.componentInstance.mode.set('external');
      await context.fixture.whenStable();
      return context;
    }

    it('CA-D4 : le clic émet le tri mais l\'ordre de data est conservé ; aria-sort suit le modèle', async () => {
      const { fixture, header, names, click } = await setupExternal();
      await click(0);
      expect(fixture.componentInstance.sort()).toEqual({ columnId: 'name', direction: 'asc' });
      expect(header(0).getAttribute('aria-sort')).toBe('ascending');
      expect(names()).toEqual(ORIGINAL);
      await click(0);
      expect(fixture.componentInstance.sort()).toEqual({ columnId: 'name', direction: 'desc' });
      expect(header(0).getAttribute('aria-sort')).toBe('descending');
      expect(names()).toEqual(ORIGINAL);
      await click(0);
      expect(fixture.componentInstance.sort()).toBeNull();
      expect(header(0).getAttribute('aria-sort')).toBeNull();
      expect(names()).toEqual(ORIGINAL);
    });

    it('CA-D4 : un parent qui trie lui-même (rôle du serveur) voit les lignes arriver dans son ordre, sans second tri', async () => {
      const { fixture, header, names, click } = await setupExternal();
      await click(1);
      const serverOrder = [rows[3], rows[2], rows[0], rows[1]];
      fixture.componentInstance.data.set(serverOrder);
      await fixture.whenStable();
      expect(names()).toEqual(['Dora', 'Bob', 'Charlie', 'Alice']);
      expect(header(1).getAttribute('aria-sort')).toBe('ascending');
    });

    it('CA-D4 : le modèle posé par le parent met à jour aria-sort sans toucher à l\'ordre', async () => {
      const { fixture, header, names } = await setupExternal();
      fixture.componentInstance.sort.set({ columnId: 'amount', direction: 'desc' });
      await fixture.whenStable();
      expect(header(1).getAttribute('aria-sort')).toBe('descending');
      expect(names()).toEqual(ORIGINAL);
    });

    it('CA-D4 : avec regroupement, les lignes gardent l\'ordre de data dans chaque groupe', async () => {
      const { fixture, names, click } = await setupExternal();
      fixture.componentInstance.grouping.set({ key: (row) => row.group, label: (key) => `Groupe ${key}`, initiallyExpanded: true });
      await fixture.whenStable();
      await click(0);
      expect(names()).toEqual(['Charlie', 'Bob', 'Alice', 'Dora']);
    });

    it('CA-D4 : repasser de external à client trie les lignes selon le modèle courant', async () => {
      const { fixture, names, click } = await setupExternal();
      await click(0);
      expect(names()).toEqual(ORIGINAL);
      fixture.componentInstance.mode.set('client');
      await fixture.whenStable();
      expect(names()).toEqual(['Alice', 'Bob', 'Charlie', 'Dora']);
    });
  });

  it('CA-D4 : un indicateur propre à chacun des trois états (sans tri, croissant, décroissant), partout en mode client comme external', async () => {
    for (const mode of ['client', 'external'] as const) {
      const { fixture, click, iconShapes, renderedIcon } = await setup();
      fixture.componentInstance.mode.set(mode);
      await fixture.whenStable();
      const none = renderedIcon(0);
      await click(0);
      const asc = renderedIcon(0);
      await click(0);
      const desc = renderedIcon(0);
      expect([none, asc, desc], mode).toEqual([iconShapes('arrow-up-down'), iconShapes('chevron-up'), iconShapes('chevron-down')]);
      expect(new Set([none, asc, desc]).size, mode).toBe(3);
      await click(0);
      expect(renderedIcon(0), mode).toBe(none);
      TestBed.resetTestingModule();
    }
  });

  it('CA-D4 : l\'indicateur d\'une colonne non triée reste « sans tri » quand une autre est triée', async () => {
    const { click, iconShapes, renderedIcon } = await setup();
    await click(0);
    expect(renderedIcon(1)).toBe(iconShapes('arrow-up-down'));
    expect(renderedIcon(0)).toBe(iconShapes('chevron-up'));
  });

  it('CA-D4 : table vide avec colonne triable : en-tête activable, aria-sort cohérent, message d\'absence de données', async () => {
    const { fixture, element, header, click } = await setup();
    fixture.componentInstance.data.set([]);
    await fixture.whenStable();
    await click(0);
    expect(header(0).getAttribute('aria-sort')).toBe('ascending');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('.lc-table__empty')).not.toBeNull();
  });

  // jsdom ne fait pas de mise en page : on lit la feuille (la géométrie réelle est mesurée en navigateur, hors de ces tests).
  describe('zone de frappe de 44 px de l\'en-tête triable et du repli de groupe (lecture de la feuille)', () => {
    const css = () => readFileSync(resolve(process.cwd(), 'packages/angular/data/src/table/table.component.css'), 'utf8').replace(/\s+/g, '');
    /** Corps `{ … }` de la première règle dont le sélecteur contient `selector`. */
    const body = (source: string, selector: string) => {
      const start = source.indexOf(selector);
      expect(start, selector).toBeGreaterThan(-1);
      const open = source.indexOf('{', start);
      return { selectors: source.slice(source.lastIndexOf('}', start) + 1, open), declarations: source.slice(open + 1, source.indexOf('}', open)) };
    };

    it('CA-D4 : un pseudo-élément transparent étend la zone du bouton de tri et du bouton de repli, de --lc-button-hit-size (44 px par défaut)', () => {
      const { selectors, declarations } = body(css(), '.lc-table__sort::before');
      expect(selectors).toContain('.lc-table__sort::before');
      expect(selectors).toContain('.lc-table__toggle::before');
      expect(declarations).toContain("content:''");
      expect(declarations).toContain('position:absolute');
      expect(declarations).toContain('inset-block:min(0px,calc((100%-var(--lc-button-hit-size,44px))/2))');
      expect(declarations).toContain('inset-inline:min(0px,calc((100%-var(--lc-button-hit-size,44px))/2))');
      expect(declarations).not.toMatch(/background|border|box-shadow|outline/);
    });

    it('CA-D4 : en densité compact, la zone s\'arrête à la boîte du bouton (--lc-button-hit-size à 100 %) ; en densité normale rien ne la réduit', () => {
      const { selectors, declarations } = body(css(), ':host(.lc-table--compact).lc-table__sort::before');
      expect(selectors).toContain(':host(.lc-table--compact).lc-table__sort::before');
      expect(selectors).toContain(':host(.lc-table--compact).lc-table__toggle::before');
      expect(declarations).toContain('--lc-button-hit-size:100%');
      const normal = body(css(), '.lc-table__sort::before').declarations;
      expect(normal).not.toContain('--lc-button-hit-size:');
    });

    it('CA-D4 : les deux boutons sont positionnés (ancre du pseudo-élément) et gardent leur taille visible (36 px, control-height-sm)', () => {
      const { selectors, declarations } = body(css(), '.lc-table__sort,.lc-table__toggle{');
      expect(selectors).toContain('.lc-table__toggle');
      expect(declarations).toContain('position:relative');
      expect(declarations).toContain('min-block-size:var(--lc-sys-control-height-sm)');
    });
  });

  describe('table sans colonne triable : comme avant', () => {
    it('CA-D4 : aucun bouton ni indicateur dans l\'en-tête, aucun aria-sort, lignes dans l\'ordre de data', async () => {
      const fixture = TestBed.createComponent(NoSortableHostComponent);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelectorAll('thead button')).toHaveLength(0);
      expect(element.querySelectorAll('thead lc-icon')).toHaveLength(0);
      expect(element.querySelectorAll('th[aria-sort]')).toHaveLength(0);
      expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent!.trim())).toEqual(['Nom', 'Montant']);
      expect(Array.from(element.querySelectorAll('tbody tr')).map((tr) => tr.querySelector('td')!.textContent!.trim())).toEqual(ORIGINAL);
      expect(fixture.componentInstance.sort()).toBeNull();
    });

    it('CA-D4 : un modèle de tri qui vise une colonne non triable ne pose aucun aria-sort', async () => {
      const fixture = TestBed.createComponent(NoSortableHostComponent);
      fixture.componentInstance.sort.set({ columnId: 'name', direction: 'asc' });
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('th[aria-sort]')).toHaveLength(0);
    });
  });
});

describe('LcTableComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(TableHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const bodyRows = () => Array.from(element.querySelectorAll('tbody tr'));
    return { fixture, element, bodyRows };
  }

  it('rend un tableau natif avec légende, en-têtes de colonne et formats', async () => {
    const { element, bodyRows } = await setup();
    expect(element.querySelector('caption')!.textContent).toBe('Échéances');
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.getAttribute('scope'))).toEqual(['col', 'col', 'col']);
    expect(bodyRows().length).toBe(3);
    const cells = bodyRows()[0].querySelectorAll('td');
    expect(cells[1].textContent!.replace(/\s/g, ' ')).toContain('1 200,50');
    expect(cells[1].classList).toContain('lc-table__cell--end');
    expect(cells[2].querySelector('.status')!.textContent).toBe('payé');
    expect(element.querySelector('tfoot td')!.textContent).toContain('Total');
    expect(element.querySelector('tfoot')!.textContent).toContain('3');
  });

  it('trie par clic sur l\'en-tête et expose aria-sort', async () => {
    const { fixture, element, bodyRows } = await setup();
    const headers = element.querySelectorAll('th');
    expect(headers[0].getAttribute('aria-sort')).toBeNull();
    headers[1].querySelector('button')!.click();
    await fixture.whenStable();
    expect(headers[1].getAttribute('aria-sort')).toBe('ascending');
    expect(bodyRows()[0].querySelectorAll('td')[1].textContent).toContain('900');
    headers[1].querySelector('button')!.click();
    await fixture.whenStable();
    expect(headers[1].getAttribute('aria-sort')).toBe('descending');
    headers[1].querySelector('button')!.click();
    await fixture.whenStable();
    expect(headers[1].getAttribute('aria-sort')).toBeNull();
    expect(fixture.componentInstance.sort()).toBeNull();
  });

  it('groupes repliables avec sous-total et bouton aria-expanded', async () => {
    const { fixture, element, bodyRows } = await setup();
    fixture.componentInstance.grouping.set({
      key: (row) => String(row.year),
      label: (key) => `Année ${key}`,
      summary: (rows) => ({ amount: rows.reduce((sum, row) => sum + row.amount, 0) }),
    });
    await fixture.whenStable();
    expect(bodyRows().length).toBe(2);
    expect(bodyRows()[0].textContent).toContain('Année 2026');
    expect(bodyRows()[0].textContent!.replace(/\s/g, ' ')).toContain('2 401');
    const toggle = bodyRows()[0].querySelector<HTMLButtonElement>('.lc-table__toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(bodyRows().length).toBe(4);
    expect(element.querySelector('.lc-table__toggle')!.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.componentInstance.toggled()).toBe('2026');
  });

  // jsdom ne résout pas `var()` : on lit la feuille de style que le composant injecte (variable lue, défauts, bloc compact).
  describe('espacement horizontal des cellules (--lc-table-cell-padding-inline)', () => {
    async function rules() {
      const { fixture } = await setup();
      await fixture.whenStable();
      const text = Array.from(document.querySelectorAll('style')).map((style) => style.textContent ?? '').join('\n').replace(/\s+/g, '');
      const blocks = text.split('}').filter((block) => block.includes('--_cell-padding'));
      return {
        normal: blocks.find((block) => !block.includes('compact')) ?? '',
        compact: blocks.find((block) => block.includes('compact')) ?? '',
      };
    }

    it('le padding horizontal vient de la variable posée sur l\'hôte, avec repli sur space-4', async () => {
      const { normal } = await rules();
      expect(normal).toContain('--_cell-padding-inline:var(--lc-table-cell-padding-inline,var(--lc-sys-space-4))');
      expect(normal).toContain('padding:var(--_cell-padding-block)var(--_cell-padding-inline)');
      expect(normal).toContain('--_cell-padding-block:var(--lc-sys-space-3)');
    });

    it('en compact, la même variable pilote le padding horizontal ; défauts space-3 et space-1 inchangés', async () => {
      const { compact } = await rules();
      expect(compact).toContain('--_cell-padding-inline:var(--lc-table-cell-padding-inline,var(--lc-sys-space-3))');
      expect(compact).toContain('--_cell-padding-block:var(--lc-sys-space-1)');
    });
  });
});
